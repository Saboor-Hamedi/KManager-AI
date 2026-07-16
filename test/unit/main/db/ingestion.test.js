import { describe, it, expect, vi } from 'vitest'

vi.mock('../../../../src/main/services/pdfIngestion', () => ({
  default: {
    sanitizeText: vi.fn((t) => {
      if (!t) return ''
      return t.replace(/\x00/g, '').replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, ' ').replace(/  +/g, ' ').trim()
    }),
    splitIntoSemanticChunks: vi.fn((text) => text ? ['chunk1', 'chunk2'] : []),
    extractText: vi.fn().mockResolvedValue('extracted text content')
  }
}))

vi.mock('../../../../src/main/db/embeddings', () => ({
  default: { embedQuery: vi.fn().mockResolvedValue([[0.1, 0.2], [0.3, 0.4]]) }
}))

import ingestionService from '../../../../src/main/db/ingestion'

describe('IngestionService', () => {
  describe('sanitizeText', () => {
    it('delegates to pdfIngestion sanitizeText', () => {
      const result = ingestionService.sanitizeText('hello\x00world')
      expect(typeof result).toBe('string')
    })
  })

  describe('chunkText', () => {
    it('returns array of chunks', () => {
      const result = ingestionService.chunkText('some text content')
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('extractText', () => {
    it('returns extracted text', async () => {
      const result = await ingestionService.extractText('/path/to/file.pdf')
      expect(result).toBe('extracted text content')
    })
  })

  describe('ingestFile', () => {
    it('throws if db not connected', async () => {
      await expect(
        ingestionService.ingestFile('test.pdf', { isConnected: () => false })
      ).rejects.toThrow('Database not connected')
    })
  })

  describe('ingestText', () => {
    it('throws if db not connected', async () => {
      await expect(
        ingestionService.ingestText('title', 'text', { isConnected: () => false })
      ).rejects.toThrow('Database not connected')
    })
  })
})
