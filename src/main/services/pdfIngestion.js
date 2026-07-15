import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

// In-memory cache for raw extracted text by buffer/file hash
const _extractionCache = new Map()

/**
 * Smart PDF & Multi-Format Ingestion Pipeline Service
 * Handles PDF parsing (pdf-parse), markdown, text, code, and document formats
 * with semantic chunking and overlapping boundaries.
 */
export class PDFIngestionService {
  constructor() {
    this.validExtensions = new Set([
      '.pdf', '.txt', '.md', '.json', '.csv',
      '.html', '.xml', '.log', '.doc', '.docx', '.xlsx',
      '.py', '.js', '.jsx', '.ts', '.tsx', '.sql', '.sh', '.yml', '.yaml'
    ])
  }

  /**
   * Sanitize text for PostgreSQL / SQLite storage, stripping null bytes and invalid characters.
   */
  sanitizeText(text) {
    if (!text) return ''
    return text
      .replace(/\x00/g, '')
      .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, ' ')
      .replace(/  +/g, ' ')
      .trim()
  }

  /**
   * Extract text from supported file formats.
   * Utilizes `pdf-parse` for PDFs and handles plain text/code/markup cleanly.
   */
  async extractText(filePath) {
    const ext = path.extname(filePath).toLowerCase()
    if (!this.validExtensions.has(ext)) {
      // If extension unknown, try reading as utf-8 text fallback
      try {
        const fallbackText = await fs.promises.readFile(filePath, 'utf8')
        return this.sanitizeText(fallbackText)
      } catch (e) {
        throw new Error(`Unsupported binary or file format: ${ext}`)
      }
    }

    if (ext === '.pdf') {
      const dataBuffer = await fs.promises.readFile(filePath)
      const bufHash = crypto.createHash('sha256').update(dataBuffer).digest('hex')
      if (_extractionCache.has(bufHash)) {
        return _extractionCache.get(bufHash)
      }

      let pdfParse
      try {
        const pdfMod = require('pdf-parse')
        pdfParse = typeof pdfMod === 'function'
          ? pdfMod
          : (typeof pdfMod?.default === 'function' ? pdfMod.default : null)
      } catch (loadErr) {
        // Fallback to dynamic import
      }

      if (typeof pdfParse !== 'function') {
        try {
          const esmMod = await import('pdf-parse')
          pdfParse = esmMod?.default ?? esmMod
        } catch (_) {}
      }

      if (typeof pdfParse !== 'function') {
        throw new Error('pdf-parse module could not be loaded as a function.')
      }

      const result = await pdfParse(dataBuffer)
      const sanitized = this.sanitizeText(result.text)

      if (_extractionCache.size >= 200) {
        const firstKey = _extractionCache.keys().next().value
        _extractionCache.delete(firstKey)
      }
      _extractionCache.set(bufHash, sanitized)
      return sanitized
    } else if (ext === '.doc' || ext === '.docx' || ext === '.xlsx') {
      // Extract printable ascii/utf-8 strings from word/excel binary/xml archives
      const dataBuffer = await fs.promises.readFile(filePath)
      const rawStr = dataBuffer.toString('utf8')
      // Strip XML tags and unprintable characters for clean text
      const cleanStr = rawStr
        .replace(/<[^>]+>/g, ' ')
        .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
      return this.sanitizeText(cleanStr || `[Document content from ${path.basename(filePath)}]`)
    } else {
      const rawText = await fs.promises.readFile(filePath, 'utf8')
      return this.sanitizeText(rawText)
    }
  }

  /**
   * Split text into semantic chunks with overlapping boundaries.
   * Ensures every chunk overlaps by `overlap` characters with the previous chunk
   * so context at paragraph boundaries is preserved.
   */
  splitIntoSemanticChunks(text, maxChars = 1500, overlap = 250) {
    if (!text) return []
    const cleanText = this.sanitizeText(text)
    if (!cleanText) return []

    // Split into paragraphs or logical blocks
    const paragraphs = cleanText.split(/\n\s*\n/)
    const chunks = []
    let currentChunk = ''

    const getOverlapTail = (str) => {
      if (str.length <= overlap) return str
      const slice = str.slice(-overlap)
      const firstSpace = slice.indexOf(' ')
      return firstSpace > 0 && firstSpace < overlap / 2 ? slice.slice(firstSpace + 1) : slice
    }

    for (let i = 0; i < paragraphs.length; i++) {
      const para = paragraphs[i].trim()
      if (!para) continue

      if ((currentChunk.length + para.length + 2) <= maxChars) {
        currentChunk += (currentChunk ? '\n\n' : '') + para
      } else {
        if (currentChunk.trim().length > 0) {
          chunks.push(currentChunk.trim())
          const tail = getOverlapTail(currentChunk.trim())
          currentChunk = tail ? `${tail}\n\n${para}` : para
        } else {
          currentChunk = para
        }

        // If a single paragraph/block is larger than maxChars, split by sentences with overlap
        if (currentChunk.length > maxChars) {
          const sentences = currentChunk.match(/[^.!?]+[.!?]+(\s+|$)/g) || [currentChunk]
          let subChunk = ''

          for (const s of sentences) {
            const trimmedS = s.trim()
            if (!trimmedS) continue
            if ((subChunk.length + trimmedS.length + 1) <= maxChars) {
              subChunk += (subChunk ? ' ' : '') + trimmedS
            } else {
              if (subChunk.trim().length > 0) {
                chunks.push(subChunk.trim())
                const subTail = getOverlapTail(subChunk.trim())
                subChunk = subTail ? `${subTail} ${trimmedS}` : trimmedS
              } else {
                // Massive sentence/token: slice directly with overlap
                let start = 0
                while (start < trimmedS.length) {
                  const sliceChunk = trimmedS.slice(start, start + maxChars)
                  chunks.push(sliceChunk.trim())
                  start += maxChars - overlap
                }
                subChunk = ''
              }
            }
          }
          currentChunk = subChunk
        }
      }
    }

    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim())
    }

    return chunks
  }
}

export default new PDFIngestionService()
