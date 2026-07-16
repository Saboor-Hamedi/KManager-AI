import { describe, it, expect } from 'vitest'
import pdfIngestionService from '../../../../src/main/services/pdfIngestion'

describe('PDFIngestionService', () => {
  describe('sanitizeText', () => {
    it('removes null bytes', () => {
      expect(pdfIngestionService.sanitizeText('hello\x00world')).toBe('helloworld')
    })

    it('handles empty string', () => {
      expect(pdfIngestionService.sanitizeText('')).toBe('')
    })

    it('handles null', () => {
      expect(pdfIngestionService.sanitizeText(null)).toBe('')
    })

    it('trims whitespace', () => {
      expect(pdfIngestionService.sanitizeText('  hello world  ')).toBe('hello world')
    })
  })

  describe('splitIntoSemanticChunks', () => {
    it('returns empty array for empty text', () => {
      expect(pdfIngestionService.splitIntoSemanticChunks('')).toEqual([])
    })

    it('returns chunks for a simple text', () => {
      const text = 'Paragraph one.\n\nParagraph two.\n\nParagraph three.'
      const chunks = pdfIngestionService.splitIntoSemanticChunks(text)
      expect(chunks.length).toBeGreaterThan(0)
    })

    it('handles text shorter than maxChars as single chunk', () => {
      const text = 'Short text'
      const chunks = pdfIngestionService.splitIntoSemanticChunks(text, 1500, 250)
      expect(chunks.length).toBe(1)
      expect(chunks[0]).toBe('Short text')
    })
  })

  describe('validExtensions', () => {
    it('includes common file types', () => {
      expect(pdfIngestionService.validExtensions.has('.pdf')).toBe(true)
      expect(pdfIngestionService.validExtensions.has('.txt')).toBe(true)
      expect(pdfIngestionService.validExtensions.has('.md')).toBe(true)
    })
  })
})
