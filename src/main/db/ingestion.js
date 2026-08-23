import fs from 'fs'
import path from 'path'
import embeddingService from './embeddings.js'
import crypto from 'crypto'
import pdfIngestionService from '../services/pdfIngestion.js'

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
   * Sanitize text for PostgreSQL / SQLite UTF-8.
   */
  sanitizeText(text) {
    return pdfIngestionService.sanitizeText(text)
  }

  /**
   * Split text into semantic chunks with overlapping boundaries.
   */
  chunkText(text, maxChars = 1500, overlap = 250) {
    return pdfIngestionService.splitIntoSemanticChunks(text, maxChars, overlap)
  }

  /**
   * Extract text from a file via the PDF & multi-format pipeline.
   */
  async extractText(filePath) {
    return await pdfIngestionService.extractText(filePath)
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

    // ── Auto-Tagging (Automated Knowledge Extraction) ─────────────
    const extractKeywords = (text) => {
      const stopWords = new Set(['the','and','to','of','a','in','that','is','for','on','it','as','with','this','was','at','by','an','be','from','or','are','not','but','which','all','have','they','we','been','has','will','more','their','can','about','if','when','would','there','what','so','up','out','who','into','its','then','them','some','could'])
      const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/)
      const freqs = {}
      for (const w of words) {
        if (w.length > 3 && !stopWords.has(w) && isNaN(w)) {
          freqs[w] = (freqs[w] || 0) + 1
        }
      }
      return Object.entries(freqs)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(x => x[0])
    }
    const tags = extractKeywords(sanitizedText)
    const metadataObj = { tags, extracted_at: new Date().toISOString() }
    const metadataStr = JSON.stringify(metadataObj)

    // ── Step 2: Hash + Chunk ─────────────────────────────────────────────
    const t2 = startTimer()
    progressCallback({ status: 'chunking', progress: 25, message: `✂️  Chunking text (extracted in ${extractTime})...` })

    const contentHash = crypto.createHash('sha256').update(sanitizedText).digest('hex')
    
    // Check if identical content already exists
    const existingDoc = await db.query('SELECT id, vault_path FROM documents WHERE content_hash = $1', [contentHash])
    if (existingDoc.rows.length > 0) {
      const normalizedPath = filePath.replace(/\\/g, '/').toLowerCase()
      if (existingDoc.rows[0].vault_path !== normalizedPath) {
        throw new Error('DUPLICATE_CONTENT: Data already exists')
      } else {
        // They are saving the exact same file without changes
        return { success: true, documentId: existingDoc.rows[0].id, chunksProcessed: 0, timing: { extract: extractTime, chunk: '0ms', embed: '0ms', total: extractTime } }
      }
    }

    const chunks      = this.chunkText(sanitizedText)
    const totalChunks = chunks.length
    const chunkTime   = elapsed(t2)

    // ── Step 3: Embed + Insert ───────────────────────────────────────────
    progressCallback({
      status: 'embedding',
      progress: 35,
      message: `🧠 Embedding ${totalChunks} chunks (chunked in ${chunkTime})...`
    })

    // Normalize path to prevent duplicate documents due to case variations on Windows
    const normalizedPath = filePath.replace(/\\/g, '/').toLowerCase()

    return await db.transaction(async (client) => {
      const t3 = startTimer()

      const docInsertRes = await client.query(
        `INSERT INTO documents (vault_path, file_name, file_type, file_size, content, content_hash, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (vault_path) DO UPDATE SET content = EXCLUDED.content, metadata = EXCLUDED.metadata, updated_at = NOW()
         RETURNING id`,
        [normalizedPath, fileName, fileType, fileSize, sanitizedText, contentHash, metadataStr]
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
    const titleHash = crypto.createHash('sha256').update((title || 'AI Response').toLowerCase().trim()).digest('hex')
    const vaultPath = `ai-response-${titleHash.slice(0, 16)}`
    const fileSize = Buffer.byteLength(sanitizedText, 'utf8')
    
    // Check if identical content already exists
    const existingDoc = await db.query('SELECT id, vault_path FROM documents WHERE content_hash = $1', [contentHash])
    if (existingDoc.rows.length > 0) {
      throw new Error('DUPLICATE_CONTENT: Data already exists')
    }

    return await db.transaction(async (client) => {
      const docInsertRes = await client.query(
        `INSERT INTO documents (vault_path, file_name, file_type, file_size, content, content_hash)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (vault_path) DO UPDATE SET content = EXCLUDED.content, content_hash = EXCLUDED.content_hash, updated_at = NOW()
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
  async chunkAndEmbedDocument(client, documentId, rawText, progressCallback = () => {}, isCancelled = () => false, options = {}) {
    await client.query('DELETE FROM embedding_documents WHERE document_id = $1', [documentId])

    const chunks     = this.chunkText(rawText)
    const totalChunks = chunks.length
    const BATCH_SIZE  = 8 // Optimized batch size for massive C++/ONNX throughput with zero UI lag

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      if (isCancelled()) {
        throw new Error('Cancelled by user')
      }

      // Quick 3ms yield so Electron UI event loop processes hovers/clicks smoothly
      await new Promise(resolve => setTimeout(resolve, 3))

      const batchChunks = chunks.slice(i, i + BATCH_SIZE)
      const chunkRatio  = i / Math.max(1, chunks.length)
      let currentProgress
      let currentMsg

      if (options?.isReembed) {
        const docBase  = (options.docIndex / options.totalDocs) * 100
        const docSlice = (1 / options.totalDocs) * 100
        currentProgress = Math.min(99, Math.floor(docBase + (chunkRatio * docSlice)))
        currentMsg = `🔄 Re-embedding (${options.docIndex + 1}/${options.totalDocs}): ${options.fileName} — Chunk ${i + 1}–${Math.min(i + BATCH_SIZE, totalChunks)} of ${totalChunks}...`
      } else {
        currentProgress = 40 + Math.floor(chunkRatio * 55)
        currentMsg = `🔢 Embedding chunk ${i + 1}–${Math.min(i + BATCH_SIZE, totalChunks)} of ${totalChunks}...`
      }

      progressCallback({
        status: 'embedding',
        progress: currentProgress,
        message: currentMsg,
        ...(options?.isReembed ? {
          type: 'reembed',
          docIndex: options.docIndex,
          totalDocs: options.totalDocs,
          docName: options.fileName
        } : {})
      })

      const batchVectors = await embeddingService.embedQuery(batchChunks)

      // Brief 2ms yield before batch insert
      await new Promise(resolve => setTimeout(resolve, 2))

      const values     = []
      const flatParams = []
      let   paramIndex = 1

      for (let j = 0; j < batchChunks.length; j++) {
        const content    = batchChunks[j]
        const vectorStr  = '[' + batchVectors[j].join(',') + ']'
        const tokenCount = content.split(/\s+/).length
        const sectionMatch = content.match(/^##\s+(.+?)\n\n/)
        const section = sectionMatch ? sectionMatch[1].trim() : null
        const cleanContent = sectionMatch ? content.slice(sectionMatch[0].length) : content

        values.push(
          `($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}::vector, $${paramIndex++}, $${paramIndex++})`
        )
        flatParams.push(documentId, i + j, cleanContent, vectorStr, tokenCount, section)
      }

      await client.query(
        `INSERT INTO embedding_documents (document_id, chunk_index, content, embedding, token_count, section)
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

    // Query only ID and file_name upfront to keep V8 memory/heap near zero during 1000+ files re-embedding
    const docsRes = await db.query('SELECT id, file_name FROM documents ORDER BY id ASC')
    const docs    = docsRes.rows
    let totalChunksProcessed = 0
    const globalStart = startTimer()

    for (let idx = 0; idx < docs.length; idx++) {
      if (isCancelled()) {
        throw new Error('Cancelled by user')
      }
      await new Promise(resolve => setTimeout(resolve, 5))

      const docMeta  = docs[idx]
      const docStart = startTimer()

      progressCallback({
        type: 'reembed',
        status: 'embedding',
        progress: Math.floor((idx / docs.length) * 100),
        message: `🔄 Re-embedding (${idx + 1}/${docs.length}): ${docMeta.file_name}...`,
        docIndex: idx,
        totalDocs: docs.length,
        docName: docMeta.file_name
      })

      try {
        // Fetch only the single document content needed right before processing
        const contentRes = await db.query('SELECT content FROM documents WHERE id = $1', [docMeta.id])
        if (!contentRes.rows.length || !contentRes.rows[0].content) continue
        const content = contentRes.rows[0].content

        await db.transaction(async (client) => {
          const processed = await this.chunkAndEmbedDocument(client, docMeta.id, content, progressCallback, isCancelled, {
            isReembed: true,
            docIndex: idx,
            totalDocs: docs.length,
            fileName: docMeta.file_name
          })
          totalChunksProcessed += processed
        })

        const docTime = elapsed(docStart)
        progressCallback({
          type: 'reembed',
          status: 'embedding',
          progress: Math.floor(((idx + 1) / docs.length) * 100),
          message: `✅ ${docMeta.file_name} done in ${docTime} (${idx + 1}/${docs.length})`,
          docIndex: idx + 1,
          totalDocs: docs.length,
          docName: docMeta.file_name
        })
      } catch (err) {
        if (isCancelled()) throw err
        console.error(`Error re-embedding document ${docMeta.file_name} (ID: ${docMeta.id}):`, err)
        progressCallback({
          type: 'reembed',
          status: 'embedding',
          progress: Math.floor(((idx + 1) / docs.length) * 100),
          message: `⚠️ Skipped ${docMeta.file_name} due to error: ${err.message || 'unknown error'} (${idx + 1}/${docs.length})`,
          docIndex: idx + 1,
          totalDocs: docs.length,
          docName: docMeta.file_name
        })
      }
    }

    const totalTime = elapsed(globalStart)
    progressCallback({
      type: 'reembed',
      status: 'complete',
      progress: 100,
      message: `🎉 Re-embedded ${docs.length} documents / ${totalChunksProcessed} chunks in ${totalTime}`,
      totalDocs: docs.length
    })

    return { success: true, documentsProcessed: docs.length, chunksProcessed: totalChunksProcessed, totalTime }
  }

  /**
   * Truncates all data tables with timing.
   */
  async truncateAll(db) {
    if (!db || !db.isConnected()) throw new Error('Database not connected')
    const t = startTimer()
    await db.query('TRUNCATE TABLE search_logs, search_feedback, embedding_documents, documents RESTART IDENTITY CASCADE')
    if (pdfIngestionService && typeof pdfIngestionService.clearCache === 'function') {
      pdfIngestionService.clearCache()
    }
    const time = elapsed(t)
    console.log(`[IngestionService] truncateAll completed in ${time}`)
    return { success: true, time }
  }
}

export default new IngestionService()
