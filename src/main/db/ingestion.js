import fs from 'fs'
import path from 'path'
import embeddingService from './embeddings.js'
import crypto from 'crypto'

// ---------------------------------------------------------------------------
// Simple in-process cache: avoids re-parsing the same PDF bytes twice
// Key: SHA-256 of the raw file buffer. Value: extracted text string.
// ---------------------------------------------------------------------------
const _extractionCache = new Map()

// ---------------------------------------------------------------------------
// Timing helpers
// ---------------------------------------------------------------------------
function startTimer() {
  return Date.now()
}

function elapsed(start) {
  const ms = Date.now() - start
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

class IngestionService {
  /**
   * Split text into overlapping chunks of roughly `chunkSize` words.
   */
  /**
   * Sanitize text for PostgreSQL UTF-8 — removes null bytes and other
   * control characters that cause "invalid byte sequence" errors.
   */
  sanitizeText(text) {
    if (!text) return ''
    return text
      // Remove null bytes (0x00) — the main culprit from PDF extraction
      .replace(/\x00/g, '')
      // Remove other C0/C1 control characters except common whitespace
      .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, ' ')
      // Collapse runs of whitespace introduced by replacements
      .replace(/  +/g, ' ')
      .trim()
  }

  chunkText(text, maxChars = 1500, overlap = 200) {
    if (!text) return []
    
    // First, try splitting by paragraphs
    const splits = text.split(/\n\s*\n/)
    const chunks = []
    let currentChunk = ''

    const addChunk = (chunkStr) => {
      if (chunkStr.trim().length > 0) chunks.push(chunkStr.trim())
    }

    for (let i = 0; i < splits.length; i++) {
      const split = splits[i].trim()
      if (!split) continue

      if ((currentChunk.length + split.length) <= maxChars) {
        currentChunk += (currentChunk ? '\n\n' : '') + split
      } else {
        if (currentChunk) addChunk(currentChunk)
        
        // If a single paragraph is too big, split it by sentences
        if (split.length > maxChars) {
          const sentences = split.match(/[^.!?]+[.!?]+/g) || [split]
          let subChunk = ''
          
          for (const s of sentences) {
            if ((subChunk.length + s.length) <= maxChars) {
              subChunk += (subChunk ? ' ' : '') + s
            } else {
              if (subChunk) addChunk(subChunk)
              
              // Fallback to raw slicing with overlap if a single sentence is massive
              if (s.length > maxChars) {
                let start = 0
                while (start < s.length) {
                  addChunk(s.slice(start, start + maxChars))
                  start += maxChars - overlap
                }
                subChunk = ''
              } else {
                subChunk = s
              }
            }
          }
          currentChunk = subChunk
        } else {
          currentChunk = split
        }
      }
    }
    if (currentChunk) addChunk(currentChunk)
    
    return chunks
  }

  /**
   * Extract text from a file. Results are cached by file-content hash
   * so re-ingesting the same PDF skips the expensive parse step.
   */
  async extractText(filePath) {
    const ext = path.extname(filePath).toLowerCase()

    if (ext === '.pdf') {
      const dataBuffer = await fs.promises.readFile(filePath)

      // Cache by content hash so identical PDFs are only parsed once
      const bufHash = crypto.createHash('sha256').update(dataBuffer).digest('hex')
      if (_extractionCache.has(bufHash)) {
        return _extractionCache.get(bufHash)
      }

      // pdf-parse v2 ships as an ES module with `export default`.
      // When Electron's CJS `require()` loads it the function lives on .default.
      let pdfParse
      try {
        const pdfMod = require('pdf-parse')
        pdfParse = typeof pdfMod === 'function'
          ? pdfMod
          : (typeof pdfMod?.default === 'function' ? pdfMod.default : null)
      } catch (loadErr) {
        throw new Error(`Failed to load pdf-parse module: ${loadErr.message}`)
      }

      if (typeof pdfParse !== 'function') {
        // Last-resort: try dynamic import (works if pdf-parse ships pure ESM)
        try {
          const esmMod = await import('pdf-parse')
          pdfParse = esmMod?.default ?? esmMod
        } catch (_) { /* ignore */ }
      }

      if (typeof pdfParse !== 'function') {
        throw new Error(
          'pdf-parse could not be loaded as a callable function. ' +
          'Run: npm install pdf-parse@1 to pin to the stable v1 API.'
        )
      }

      const result = await pdfParse(dataBuffer)
      const text = result.text

      // Store in cache (limit cache to 200 entries to avoid memory leaks)
      if (_extractionCache.size >= 200) {
        const firstKey = _extractionCache.keys().next().value
        _extractionCache.delete(firstKey)
      }
      _extractionCache.set(bufHash, text)

      return text

    } else if (ext === '.txt' || ext === '.md' || ext === '.json' || ext === '.csv') {
      return await fs.promises.readFile(filePath, 'utf8')
    } else {
      throw new Error(`Unsupported file type: ${ext}. Supported: .pdf .txt .md .json .csv`)
    }
  }

  /**
   * Main ingestion workflow with detailed timing output.
   */
  async ingestFile(filePath, db, progressCallback = () => {}, isCancelled = () => false) {
    if (!db || !db.isConnected()) {
      throw new Error('Database not connected')
    }

    const totalStart = startTimer()

    // ── Step 1: Extract ──────────────────────────────────────────────────
    const t1 = startTimer()
    progressCallback({ status: 'extracting', progress: 5, message: '📄 Extracting text from file...' })

    const fileName   = path.basename(filePath)
    const fileType   = path.extname(filePath).replace('.', '').toLowerCase() || 'txt'
    const fileStat   = await fs.promises.stat(filePath)
    const fileSize   = fileStat.size
    const rawText    = await this.extractText(filePath)

    if (!rawText || rawText.trim() === '') {
      throw new Error('No text could be extracted from this file.')
    }

    // Sanitize BEFORE hashing or inserting — strips null bytes, bad control chars
    const sanitizedText = this.sanitizeText(rawText)
    if (!sanitizedText) {
      throw new Error('File contained no usable text after sanitization.')
    }
    const extractTime = elapsed(t1)

    // ── Step 2: Hash + Chunk ─────────────────────────────────────────────
    const t2 = startTimer()
    progressCallback({ status: 'chunking', progress: 25, message: `✂️  Chunking text (extracted in ${extractTime})...` })

    const contentHash = crypto.createHash('sha256').update(sanitizedText).digest('hex')
    const chunks      = this.chunkText(sanitizedText)
    const totalChunks = chunks.length
    const chunkTime   = elapsed(t2)

    // ── Step 3: Embed + Insert ───────────────────────────────────────────
    progressCallback({
      status: 'embedding',
      progress: 35,
      message: `🧠 Embedding ${totalChunks} chunks (chunked in ${chunkTime})...`
    })

    return await db.transaction(async (client) => {
      const t3 = startTimer()

      const docInsertRes = await client.query(
        `INSERT INTO documents (vault_path, file_name, file_type, file_size, content, content_hash)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (vault_path) DO UPDATE SET content = EXCLUDED.content, updated_at = NOW()
         RETURNING id`,
        [filePath, fileName, fileType, fileSize, sanitizedText, contentHash]
      )

      const documentId    = docInsertRes.rows[0].id
      const chunksStored  = await this.chunkAndEmbedDocument(client, documentId, sanitizedText, progressCallback, isCancelled)
      const embedTime     = elapsed(t3)
      const totalTime     = elapsed(totalStart)

      progressCallback({
        status: 'complete',
        progress: 100,
        message: `✅ Done! ${chunksStored} chunks embedded in ${embedTime} (total: ${totalTime})`
      })

      return {
        success: true,
        documentId,
        chunksProcessed: chunksStored,
        timing: { extract: extractTime, chunk: chunkTime, embed: embedTime, total: totalTime }
      }
    })
  }

  /**
   * Ingest raw text directly without file extraction (useful for saving AI responses).
   */
  async ingestText(title, text, db) {
    if (!db || !db.isConnected()) {
      throw new Error('Database not connected')
    }

    const sanitizedText = this.sanitizeText(text)
    if (!sanitizedText) {
      throw new Error('Text is empty after sanitization.')
    }

    const contentHash = crypto.createHash('sha256').update(sanitizedText).digest('hex')
    const vaultPath = `ai-response-${contentHash.slice(0, 16)}`
    const fileSize = Buffer.byteLength(sanitizedText, 'utf8')
    
    return await db.transaction(async (client) => {
      const docInsertRes = await client.query(
        `INSERT INTO documents (vault_path, file_name, file_type, file_size, content, content_hash)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (vault_path) DO UPDATE SET content = EXCLUDED.content, updated_at = NOW()
         RETURNING id`,
        [vaultPath, title || 'AI Response', 'ai_response', fileSize, sanitizedText, contentHash]
      )

      const documentId = docInsertRes.rows[0].id
      const chunksStored = await this.chunkAndEmbedDocument(client, documentId, sanitizedText)
      
      return {
        success: true,
        documentId,
        chunksProcessed: chunksStored
      }
    })
  }

  /**
   * Deletes existing embeddings for a document, re-chunks, generates embeddings, and bulk-inserts.
   */
  async chunkAndEmbedDocument(client, documentId, rawText, progressCallback = () => {}, isCancelled = () => false) {
    await client.query('DELETE FROM embedding_documents WHERE document_id = $1', [documentId])

    const chunks     = this.chunkText(rawText)
    const totalChunks = chunks.length
    const BATCH_SIZE  = 2 // very low batch size to maximize UI responsiveness during heavy ONNX inference

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      if (isCancelled()) {
        throw new Error('Cancelled by user')
      }

      // Yield to Electron event loop so UI stays responsive
      await new Promise(resolve => setTimeout(resolve, 30))

      const batchChunks = chunks.slice(i, i + BATCH_SIZE)
      progressCallback({
        status: 'embedding',
        progress: 40 + Math.floor((i / chunks.length) * 55),
        message: `🔢 Embedding chunk ${i + 1}–${Math.min(i + BATCH_SIZE, totalChunks)} of ${totalChunks}...`
      })

      const batchVectors = await embeddingService.embedQuery(batchChunks)

      // Brief pause after heavy ONNX inference to allow UI interactions (clicks/hovers) to process
      await new Promise(resolve => setTimeout(resolve, 30))

      const values     = []
      const flatParams = []
      let   paramIndex = 1

      for (let j = 0; j < batchChunks.length; j++) {
        const content    = batchChunks[j]
        const vectorStr  = '[' + batchVectors[j].join(',') + ']'
        const tokenCount = content.split(/\s+/).length

        values.push(
          `($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}::vector, $${paramIndex++})`
        )
        flatParams.push(documentId, i + j, content, vectorStr, tokenCount)
      }

      await client.query(
        `INSERT INTO embedding_documents (document_id, chunk_index, content, embedding, token_count)
         VALUES ${values.join(', ')}`,
        flatParams
      )
    }

    return totalChunks
  }

  /**
   * Re-chunks and re-embeds all documents in PostgreSQL, with per-document timing.
   */
  async reembedAll(db, progressCallback = () => {}, isCancelled = () => false) {
    if (!db || !db.isConnected()) throw new Error('Database not connected')

    const docsRes = await db.query('SELECT id, file_name, content FROM documents')
    const docs    = docsRes.rows
    let totalChunksProcessed = 0
    const globalStart = startTimer()

    for (let idx = 0; idx < docs.length; idx++) {
      if (isCancelled()) {
        throw new Error('Cancelled by user')
      }
      await new Promise(resolve => setTimeout(resolve, 10))

      const doc    = docs[idx]
      const docStart = startTimer()

      progressCallback({
        status: 'embedding',
        progress: Math.floor((idx / docs.length) * 100),
        message: `🔄 Re-embedding (${idx + 1}/${docs.length}): ${doc.file_name}...`
      })

      await db.transaction(async (client) => {
        const processed = await this.chunkAndEmbedDocument(client, doc.id, doc.content, progressCallback, isCancelled)
        totalChunksProcessed += processed
      })

      const docTime = elapsed(docStart)
      progressCallback({
        status: 'embedding',
        progress: Math.floor(((idx + 1) / docs.length) * 100),
        message: `✅ ${doc.file_name} done in ${docTime} (${idx + 1}/${docs.length})`
      })
    }

    const totalTime = elapsed(globalStart)
    progressCallback({
      status: 'complete',
      progress: 100,
      message: `🎉 Re-embedded ${docs.length} documents / ${totalChunksProcessed} chunks in ${totalTime}`
    })

    return { success: true, documentsProcessed: docs.length, chunksProcessed: totalChunksProcessed, totalTime }
  }

  /**
   * Truncates all data tables with timing.
   */
  async truncateAll(db) {
    if (!db || !db.isConnected()) throw new Error('Database not connected')
    const t = startTimer()
    await db.query('TRUNCATE TABLE search_feedback, embedding_documents, documents RESTART IDENTITY CASCADE')
    _extractionCache.clear()
    const time = elapsed(t)
    console.log(`[IngestionService] truncateAll completed in ${time}`)
    return { success: true, time }
  }
}

export default new IngestionService()
