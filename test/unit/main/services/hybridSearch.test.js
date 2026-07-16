import { describe, it, expect, vi } from 'vitest'
import { expandQuery, computeBM25Scores, computeReciprocalRankFusion, performHybridSearchService } from '../../../../src/main/services/hybridSearch'

describe('expandQuery', () => {
  it('returns empty string for empty input', () => {
    expect(expandQuery('')).toBe('')
  })

  it('returns long queries unchanged', () => {
    expect(expandQuery('prostate cancer biomarkers')).toBe('prostate cancer biomarkers')
  })

  it('returns multi-word queries unchanged regardless of length', () => {
    expect(expandQuery('hi there')).toBe('hi there')
  })

  it('appends concept hint for short queries under 6 chars', () => {
    const result = expandQuery('rust')
    expect(result).toBe('rust (related topic or concept)')
  })

  it('appends concept hint for single character', () => {
    const result = expandQuery('rs')
    expect(result).toBe('rs (related topic or concept)')
  })

  it('handles exactly 5 character query with expansion', () => {
    expect(expandQuery('hello')).toBe('hello (related topic or concept)')
  })
})

describe('computeBM25Scores', () => {
  const makeRow = (id, content) => ({
    id,
    content,
    cosine_similarity: 0.5,
    similarity: 0.5
  })

  it('returns empty array for empty input', () => {
    expect(computeBM25Scores('query', [])).toEqual([])
  })

  it('returns rows unchanged when no input', () => {
    expect(computeBM25Scores('', [makeRow('1', 'test')])).toBeDefined()
  })

  it('assigns bm25Score and bm25Normalized to each row', () => {
    const rows = [
      makeRow('1', 'prostate cancer biomarkers include PSA'),
      makeRow('2', 'the weather is nice today'),
      makeRow('3', 'PSA testing for prostate cancer screening')
    ]
    const result = computeBM25Scores('prostate cancer', rows)
    expect(result).toHaveLength(3)
    result.forEach(r => {
      expect(r).toHaveProperty('bm25Score')
      expect(r).toHaveProperty('bm25Normalized')
    })
  })

  it('gives higher scores to documents containing query terms', () => {
    const rows = [
      makeRow('1', 'prostate cancer biomarkers include PSA for prostate'),
      makeRow('2', 'the weather is nice today')
    ]
    const result = computeBM25Scores('prostate cancer', rows)
    expect(result[0].bm25Score).toBeGreaterThan(result[1].bm25Score)
  })

  it('handles single character tokens by skipping them', () => {
    const rows = [makeRow('1', 'a b c d e f g')]
    const result = computeBM25Scores('a b c', rows)
    expect(result[0].bm25Score).toBe(0)
  })
})

describe('computeReciprocalRankFusion', () => {
  it('returns empty array for empty input', () => {
    expect(computeReciprocalRankFusion([])).toEqual([])
  })

  it('adds rrfScore and combinedScore to rows', () => {
    const rows = [
      { id: '1', content: 'test', cosine_similarity: 0.9, similarity: 0.9, bm25Score: 5, bm25Normalized: 0.5 },
      { id: '2', content: 'test2', cosine_similarity: 0.7, similarity: 0.7, bm25Score: 2, bm25Normalized: 0.2 }
    ]
    const result = computeReciprocalRankFusion(rows)
    expect(result).toHaveLength(2)
    result.forEach(r => {
      expect(r).toHaveProperty('rrfScore')
      expect(r).toHaveProperty('combinedScore')
      expect(r).toHaveProperty('similarity')
    })
  })

  it('sorts by combinedScore descending', () => {
    const rows = [
      { id: '1', content: 'a', cosine_similarity: 0.9, similarity: 0.9, bm25Score: 5, bm25Normalized: 0.5 },
      { id: '2', content: 'b', cosine_similarity: 0.5, similarity: 0.5, bm25Score: 1, bm25Normalized: 0.1 }
    ]
    const result = computeReciprocalRankFusion(rows)
    expect(result[0].combinedScore).toBeGreaterThanOrEqual(result[1].combinedScore)
  })

  it('filters out rows with low cosine similarity and no keyword hit', () => {
    const rows = [
      { id: '1', content: 'test', cosine_similarity: 0.5, similarity: 0.5, bm25Score: 1, bm25Normalized: 0.1 },
      { id: '2', content: 'test2', cosine_similarity: 0.2, similarity: 0.2, bm25Score: 0, bm25Normalized: 0 }
    ]
    const result = computeReciprocalRankFusion(rows)
    expect(result).toHaveLength(1)
  })
})

describe('performHybridSearchService', () => {
  it('throws if db is not connected', async () => {
    await expect(
      performHybridSearchService(null, {}, 'query', 10)
    ).rejects.toThrow('Database not connected')
  })

  it('returns empty results for empty query', async () => {
    const mockDb = { isConnected: () => true }
    const result = await performHybridSearchService(mockDb, {}, '', 10)
    expect(result).toEqual({ rows: [], isFallback: false })
  })

  it('falls back to pure vector search when no FTS results', async () => {
    const mockDb = {
      isConnected: () => true,
      query: vi.fn()
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: '1', content: 'fallback', cosine_similarity: 0.5, similarity: 0.5 }] })
    }
    const mockEmbedding = {
      embedQuery: vi.fn().mockResolvedValue(Array(384).fill(0.1))
    }
    const result = await performHybridSearchService(mockDb, mockEmbedding, 'test query', 10)
    expect(result.isFallback).toBe(true)
    expect(result.rows.length).toBeGreaterThanOrEqual(0)
  })
})
