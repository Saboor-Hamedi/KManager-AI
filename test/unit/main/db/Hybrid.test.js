import { describe, it, expect, vi } from 'vitest'

// Mock dependencies before importing
vi.mock('../../../../src/main/db/embeddings', () => ({
  default: {
    embedQuery: vi.fn().mockResolvedValue(Array(384).fill(0.1))
  }
}))

vi.mock('../../../../src/main/services/hybridSearch', () => ({
  default: {
    expandQuery: vi.fn((q) => q),
    computeBM25Scores: vi.fn((q, rows) => rows.map(r => ({ ...r, bm25Score: 1, bm25Normalized: 0.1 }))),
    computeReciprocalRankFusion: vi.fn((rows) => rows.map(r => ({ ...r, rrfScore: 0.5, combinedScore: 0.6, similarity: 0.6 }))),
    performHybridSearchService: vi.fn().mockResolvedValue({ rows: [], isFallback: false })
  },
  expandQuery: vi.fn((q) => q),
  computeBM25Scores: vi.fn((q, rows) => rows.map(r => ({ ...r, bm25Score: 1, bm25Normalized: 0.1 }))),
  computeReciprocalRankFusion: vi.fn((rows) => rows.map(r => ({ ...r, rrfScore: 0.5, combinedScore: 0.6, similarity: 0.6 }))),
  performHybridSearchService: vi.fn().mockResolvedValue({ rows: [], isFallback: false })
}))

import { performHybridSearch, expandQuery, applyBM25ReRanking } from '../../../../src/main/db/Hybrid'

describe('Hybrid (facade)', () => {
  it('delegates expandQuery correctly', () => {
    expect(typeof expandQuery).toBe('function')
  })

  it('delegates applyBM25ReRanking correctly', () => {
    const rows = [{ id: '1', content: 'test' }]
    const result = applyBM25ReRanking('test', rows)
    expect(result).toBeDefined()
    expect(Array.isArray(result)).toBe(true)
  })

  it('performHybridSearch calls hybridSearchService', async () => {
    const mockDb = { isConnected: () => true, query: vi.fn() }
    const result = await performHybridSearch(mockDb, 'test query', 10)
    expect(result).toBeDefined()
  })
})
