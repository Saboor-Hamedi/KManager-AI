import { describe, it, expect, vi } from 'vitest'

describe('EmbeddingService', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('exports a singleton with embedQuery method', async () => {
    vi.mock('@xenova/transformers', () => ({
      pipeline: vi.fn().mockResolvedValue(function mockExtractor(input, options) {
        if (Array.isArray(input)) {
          return { tolist: () => input.map(() => Array(384).fill(0.1)) }
        }
        return { data: Array(384).fill(0.1) }
      }),
      env: {
        allowRemoteModels: false,
        allowLocalModels: true,
        useBrowserCache: false,
        localModelPath: '',
        cacheDir: ''
      }
    }))

    vi.mock('electron', () => ({
      app: { isPackaged: false, getAppPath: () => '' }
    }))

    const embeddingService = (await import('../../../../src/main/db/embeddings')).default
    expect(embeddingService).toHaveProperty('embedQuery')
    expect(typeof embeddingService.embedQuery).toBe('function')
  })

  it('handles single string input', async () => {
    vi.mock('@xenova/transformers', () => ({
      pipeline: vi.fn().mockResolvedValue(function mockExtractor(input) {
        return { data: Array(384).fill(0.1) }
      }),
      env: {
        allowRemoteModels: false,
        allowLocalModels: true,
        useBrowserCache: false,
        localModelPath: '',
        cacheDir: ''
      }
    }))

    vi.mock('electron', () => ({
      app: { isPackaged: false, getAppPath: () => '' }
    }))

    const embeddingService = (await import('../../../../src/main/db/embeddings')).default
    const result = await embeddingService.embedQuery('test query')
    expect(Array.isArray(result)).toBe(true)
    expect(result).toHaveLength(384)
  })
})
