import { describe, it, expect, vi } from 'vitest'

import { performHybridSearchService } from '../../../../src/main/services/hybridSearch'

const makeEmbedding = () => ({
  embedQuery: vi.fn().mockResolvedValue(Array(384).fill(0.1))
})

describe('performHybridSearchService', () => {
  it('throws if db is not connected', async () => {
    await expect(
      performHybridSearchService(null, {}, 'query', 10)
    ).rejects.toThrow('Database not connected')
  })

  it('returns empty results for empty query', async () => {
    const mockDb = { isConnected: () => true }
    const result = await performHybridSearchService(mockDb, {}, '   ', 10)
    expect(result).toEqual({ rows: [], isFallback: false })
  })

  it('calls search_chunks with the original query and embedding', async () => {
    const mockDb = {
      isConnected: () => true,
      query: vi.fn().mockResolvedValue({
        rows: [
          { id: '1', content: 'a', similarity: 0.05, cosine_similarity: 0.8 },
          { id: '2', content: 'b', similarity: 0.03, cosine_similarity: 0.7 }
        ]
      })
    }
    const embedding = makeEmbedding()
    const result = await performHybridSearchService(mockDb, embedding, 'prostate cancer', 2)

    expect(embedding.embedQuery).toHaveBeenCalledWith('prostate cancer')
    expect(mockDb.query).toHaveBeenCalledWith(
      'SELECT * FROM search_chunks($1, $2::vector, $3, $4, $5)',
      ['prostate cancer', expect.stringContaining('['), 6, null, null]
    )
    expect(result.isFallback).toBe(false)
    expect(result.rows).toHaveLength(2)
  })

  it('normalizes similarity to 0-1 blended with cosine', async () => {
    const mockDb = {
      isConnected: () => true,
      query: vi.fn().mockResolvedValue({
        rows: [
          { id: '1', content: 'a', similarity: 0.05, cosine_similarity: 0.8 },
          { id: '2', content: 'b', similarity: 0.03, cosine_similarity: 0.7 }
        ]
      })
    }
    const result = await performHybridSearchService(mockDb, makeEmbedding(), 'prostate cancer', 2)
    const [first] = result.rows
    // similarity = (sim / maxSim) * 0.3 + cosine * 0.7 => (0.05 / 0.05) * 0.3 + 0.8 * 0.7 = 0.86
    expect(first.similarity).toBeCloseTo(0.86, 5)
  })

  it('limits returned rows to the requested limit', async () => {
    const rows = Array.from({ length: 10 }, (_, i) => ({
      id: String(i),
      content: `c${i}`,
      similarity: 0.05,
      cosine_similarity: 0.5
    }))
    const mockDb = {
      isConnected: () => true,
      query: vi.fn().mockResolvedValue({ rows })
    }
    const result = await performHybridSearchService(mockDb, makeEmbedding(), 'test query', 3)
    expect(result.rows).toHaveLength(3)
  })

  it('falls back to pure vector search when search_chunks returns nothing', async () => {
    const mockDb = {
      isConnected: () => true,
      query: vi.fn()
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: '1', content: 'fallback', cosine_similarity: 0.5, similarity: 0.5 }] })
    }
    const result = await performHybridSearchService(mockDb, makeEmbedding(), 'test query', 10)
    expect(result.isFallback).toBe(true)
    expect(result.rows).toHaveLength(1)
    expect(mockDb.query).toHaveBeenCalledTimes(2)
  })

  it('returns empty rows when both legs return nothing', async () => {
    const mockDb = {
      isConnected: () => true,
      query: vi.fn().mockResolvedValue({ rows: [] })
    }
    const result = await performHybridSearchService(mockDb, makeEmbedding(), 'test query', 10)
    expect(result).toEqual({ rows: [], isFallback: false })
  })
})
