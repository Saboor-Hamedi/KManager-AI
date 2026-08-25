import { describe, it, expect, vi } from 'vitest'

// Mock dependencies before importing
vi.mock('../../../../src/main/db/embeddings', () => ({
  default: {
    embedQuery: vi.fn().mockResolvedValue(Array(384).fill(0.1))
  }
}))

vi.mock('../../../../src/main/services/hybridSearch', () => ({
  default: {
    performHybridSearchService: vi.fn().mockResolvedValue({ rows: [], isFallback: false })
  }
}))

import { performHybridSearch } from '../../../../src/main/db/Hybrid'

describe('Hybrid (facade)', () => {
  it('delegates performHybridSearch to the hybrid search service', async () => {
    const mockDb = { isConnected: () => true, query: vi.fn() }
    const result = await performHybridSearch(mockDb, 'test query', 10)
    expect(result).toBeDefined()
  })

  it('passes db, query and limit to the service', async () => {
    const hybridSearchService = (await import('../../../../src/main/services/hybridSearch')).default
    const mockDb = { isConnected: () => true, query: vi.fn() }
    await performHybridSearch(mockDb, 'some query', 5)
    expect(hybridSearchService.performHybridSearchService).toHaveBeenCalledWith(
      mockDb,
      expect.anything(),
      'some query',
      5
    )
  })
})
