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
   * Clears the extraction cache (used when truncating the database)
   */
  clearCache() {
    _extractionCache.clear()
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

      const result = await pdfParse(dataBuffer, {
        pagerender: async function(pageData) {
          const render_options = {
            normalizeWhitespace: true,
            disableCombineTextItems: false
          }
          const textContent = await pageData.getTextContent(render_options)
          let lastY = null
          let text = ''

          for (const item of textContent.items) {
            if (!item?.str) continue
            const currentY = item.transform ? item.transform[5] : null

            // If vertical Y position jumped (> 4 units), add a newline
            if (lastY !== null && currentY !== null && Math.abs(currentY - lastY) > 4) {
              text += '\n'
            } else if (
              text.length > 0 &&
              !text.endsWith(' ') &&
              !text.endsWith('\n') &&
              !text.endsWith('-') &&
              !item.str.startsWith(' ') &&
              !/^[.,;:!?')\]]/.test(item.str)
            ) {
              // Same line: insert space if neither previous ends with space/hyphen nor current starts with space/punctuation
              text += ' '
            }
            text += item.str
            lastY = currentY
          }
          return text
        }
      })
      const sanitized = this.sanitizeText(result.text)

      if (_extractionCache.size >= 200) {
        const firstKey = _extractionCache.keys().next().value
        _extractionCache.delete(firstKey)
      }
      _extractionCache.set(bufHash, sanitized)
      return sanitized
    } else if (ext === '.xlsx' || ext === '.xls') {
      try {
        const xlsx = require('xlsx')
        const workbook = xlsx.readFile(filePath)
        let allText = ''
        for (const sheetName of workbook.SheetNames) {
          const sheet = workbook.Sheets[sheetName]
          const sheetText = xlsx.utils.sheet_to_csv(sheet)
          allText += `\n--- Sheet: ${sheetName} ---\n` + sheetText
        }
        return this.sanitizeText(allText)
      } catch (err) {
        console.error('Failed to parse excel file:', err)
        throw new Error('Failed to parse excel file. Make sure it is not corrupted.')
      }
    } else if (ext === '.docx' || ext === '.doc') {
      try {
        const mammoth = require('mammoth')
        const result = await mammoth.extractRawText({ path: filePath })
        return this.sanitizeText(result.value)
      } catch (err) {
        console.error('Failed to parse word doc:', err)
        throw new Error('Failed to parse word document. Make sure it is a valid .docx file.')
      }
    } else {
      const rawText = await fs.promises.readFile(filePath, 'utf8')
      return this.sanitizeText(rawText)
    }
  }

  /**
   * Split text into semantic chunks with overlapping boundaries.
   * Detects markdown headings and keeps sections together.
   * Falls back to paragraph splitting for non-markdown content.
   */
  splitIntoSemanticChunks(text, maxChars = 1500, overlap = 250) {
    if (!text) return []
    const cleanText = this.sanitizeText(text)
    if (!cleanText) return []

    // Try heading-aware splitting first
    const headingChunks = this.splitByHeadings(cleanText, maxChars, overlap)
    if (headingChunks.length > 1 || (headingChunks.length === 1 && cleanText.match(/^#{1,4}\s/m))) {
      return headingChunks
    }

    // Fallback to paragraph-based splitting
    return this.splitByParagraphs(cleanText, maxChars, overlap)
  }

  /**
   * Split by markdown headings, keeping each section together.
   */
  splitByHeadings(text, maxChars, overlap) {
    const lines = text.split('\n')
    const sections = []
    let currentHeading = ''
    let currentLines = []

    for (const line of lines) {
      const match = line.match(/^(#{1,4})\s+(.+)$/)
      if (match) {
        if (currentLines.length > 0 || currentHeading) {
          sections.push({ heading: currentHeading, content: currentLines.join('\n') })
          currentLines = []
        }
        currentHeading = match[2].trim()
      }
      currentLines.push(line)
    }
    if (currentLines.length > 0 || currentHeading) {
      sections.push({ heading: currentHeading, content: currentLines.join('\n') })
    }

    if (sections.length <= 1 && !sections[0]?.heading) {
      return [] // No headings found, signal fallback
    }

    const getOverlapTail = (str) => {
      if (str.length <= overlap) return str
      const slice = str.slice(-overlap)
      const firstSpace = slice.indexOf(' ')
      return firstSpace > 0 && firstSpace < overlap / 2 ? slice.slice(firstSpace + 1) : slice
    }

    const chunks = []
    let buffer = ''

    for (const section of sections) {
      const headingTag = section.heading ? `## ${section.heading}\n\n` : ''
      const sectionText = headingTag + section.content.trim()

      if (buffer.length + sectionText.length + 2 <= maxChars) {
        buffer += (buffer ? '\n\n' : '') + sectionText
      } else {
        if (buffer.trim().length > 0) {
          chunks.push({ text: buffer.trim(), section: sections[sections.indexOf(section) - 1]?.heading || '' })
        }
        if (sectionText.length <= maxChars) {
          buffer = sectionText
        } else {
          // Large section: split by sentences with overlap
          this.splitLargeSection(section, maxChars, overlap).forEach(c => chunks.push(c))
          buffer = ''
        }
      }
    }
    if (buffer.trim().length > 0) {
      chunks.push({ text: buffer.trim(), section: sections[sections.length - 1]?.heading || '' })
    }

    // Handle overlap between chunks
    for (let i = 1; i < chunks.length; i++) {
      const prevText = chunks[i - 1].text
      const tail = getOverlapTail(prevText)
      if (tail) {
        chunks[i] = { ...chunks[i], text: `${tail}\n\n${chunks[i].text}` }
      }
    }

    return chunks.map(c => c.text)
  }

  /**
   * Split a large section that exceeds maxChars into sentence-bounded chunks.
   */
  splitLargeSection(section, maxChars, overlap) {
    const text = (section.heading ? `## ${section.heading}\n\n` : '') + section.content.trim()
    const sentences = text.match(/[^.!?]+[.!?]+(\s+|$)/g) || [text]
    const chunks = []
    let subChunk = ''
    const headingTag = section.heading ? `## ${section.heading}\n\n` : ''

    const getOverlapTail = (str) => {
      if (str.length <= overlap) return str
      const slice = str.slice(-overlap)
      const firstSpace = slice.indexOf(' ')
      return firstSpace > 0 && firstSpace < overlap / 2 ? slice.slice(firstSpace + 1) : slice
    }

    for (const s of sentences) {
      const trimmed = s.trim()
      if (!trimmed) continue
      if (subChunk.length + trimmed.length + 1 <= maxChars) {
        subChunk += (subChunk ? ' ' : headingTag) + trimmed
      } else {
        if (subChunk.trim().length > 0) {
          chunks.push({ text: subChunk.trim(), section: section.heading })
        }
        subChunk = headingTag + trimmed
      }
    }
    if (subChunk.trim().length > 0) {
      chunks.push({ text: subChunk.trim(), section: section.heading })
    }

    if (chunks.length > 1) {
      for (let i = 1; i < chunks.length; i++) {
        const prevText = chunks[i - 1].text
        const tail = getOverlapTail(prevText)
        if (tail) {
          chunks[i] = { ...chunks[i], text: `${tail}\n${chunks[i].text}` }
        }
      }
    }

    return chunks
  }

  /**
   * Original paragraph-based splitting (fallback for non-markdown content).
   */
  splitByParagraphs(text, maxChars, overlap) {
    const paragraphs = text.split(/\n\s*\n/)
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
