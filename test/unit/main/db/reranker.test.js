import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { pipeline } from '@xenova/transformers'

// Mock the transformers pipeline BEFORE importing the reranker
vi.mock('@xenova/transformers', () => ({
  pipeline: vi.fn(),
  env: { allowRemoteModels: false, allowLocalModels: true, useBrowserCache: false, localModelPath: '' }
}))

vi.mock('electron', () => ({
  app: { isPackaged: false, getAppPath: () => '/mock-app' }
}))

import reranker from '../../../../src/main/db/reranker'

describe('ReRankerService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    reranker.classifier = null
    reranker.initPromise = null
  })

  afterEach(() => {
    reranker.classifier = null
    reranker.initPromise = null
  })

  it('rerank returns empty array for empty documents', async () => {
    const result = await reranker.rerank('query', [])
    expect(result).toEqual([])
  })

  it('initializes the classifier on first use', async () => {
    const mockClassifier = vi.fn().mockResolvedValue([{ label: 'LABEL_0', score: 0.9 }])
    pipeline.mockReturnValue(Promise.resolve(mockClassifier))

    await reranker.init()
    expect(pipeline).toHaveBeenCalledWith('text-classification', 'Xenova/ms-marco-MiniLM-L-6-v2', { quantized: true })
    expect(reranker.classifier).toBe(mockClassifier)
  })

  it('reranks documents by cross-encoder score descending', async () => {
    const mockClassifier = vi.fn()
      .mockResolvedValueOnce([{ label: 'LABEL_0', score: 0.2 }])
      .mockResolvedValueOnce([{ label: 'LABEL_0', score: 0.9 }])
      .mockResolvedValueOnce([{ label: 'LABEL_0', score: 0.5 }])
    pipeline.mockReturnValue(Promise.resolve(mockClassifier))

    const docs = [
      { content: 'low relevance' },
      { content: 'high relevance' },
      { content: 'medium relevance' }
    ]
    const result = await reranker.rerank('query', docs)
    expect(result[0].content).toBe('high relevance')
    expect(result[0].crossEncoderScore).toBe(0.9)
    expect(result[2].crossEncoderScore).toBe(0.2)
  })

  it('assigns score 0 when a single document fails', async () => {
    const mockClassifier = vi.fn()
      .mockResolvedValueOnce([{ label: 'LABEL_0', score: 0.8 }])
      .mockRejectedValueOnce(new Error('fail'))
    pipeline.mockReturnValue(Promise.resolve(mockClassifier))

    const docs = [{ content: 'ok' }, { content: 'broken' }]
    const result = await reranker.rerank('query', docs)
    expect(result[1].crossEncoderScore).toBe(0)
  })

  it('does not re-init when classifier already exists', async () => {
    reranker.classifier = vi.fn()
    await reranker.init()
    expect(pipeline).not.toHaveBeenCalled()
  })
})
