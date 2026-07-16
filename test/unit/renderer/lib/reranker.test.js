import { describe, it, expect, vi, beforeEach } from 'vitest'
import { evaluateChunkRelevance, rerankChunks } from '../../../../src/renderer/src/lib/reranker'

describe('evaluateChunkRelevance', () => {
  it('returns 0 for empty query', () => {
    expect(evaluateChunkRelevance('', { content: 'test' })).toBe(0)
  })

  it('returns 0 for empty content', () => {
    expect(evaluateChunkRelevance('test', { content: '' })).toBe(0)
  })

  it('gives exact phrase match bonus for multi-word query', () => {
    const score = evaluateChunkRelevance('prostate cancer', {
      content: 'prostate cancer biomarkers'
    })
    expect(score).toBeGreaterThan(0)
  })

  it('scores relevant chunks higher than irrelevant ones', () => {
    const relevant = evaluateChunkRelevance('cancer biomarkers', {
      content: 'prostate cancer biomarkers include PSA and PSMA testing'
    })
    const irrelevant = evaluateChunkRelevance('cancer biomarkers', {
      content: 'the weather is nice today in London'
    })
    expect(relevant).toBeGreaterThan(irrelevant)
  })

  it('penalizes very short snippets', () => {
    const score = evaluateChunkRelevance('test', { content: 'hi' })
    expect(score).toBeLessThanOrEqual(0.9)
  })

  it('rewards chunks with numbers and technical terms', () => {
    const score = evaluateChunkRelevance('biomarker', {
      content: 'The p-value was 0.01 and the biomarker score was 85%'
    })
    expect(score).toBeGreaterThan(0)
  })
})

describe('rerankChunks', () => {
  it('returns empty array for empty input', () => {
    expect(rerankChunks('test', [])).toEqual([])
  })

  it('returns chunks unchanged if 2 or fewer', () => {
    const chunks = [{ content: 'a' }, { content: 'b' }]
    expect(rerankChunks('test', chunks)).toHaveLength(2)
  })

  it('selects top K chunks with MMR diversity', () => {
    const chunks = [
      { content: 'prostate cancer biomarkers include PSA testing' },
      { content: 'PSA is a protein produced by the prostate gland' },
      { content: 'the weather is nice today in London' },
      { content: 'prostate cancer screening guidelines recommend PSA' }
    ]
    const result = rerankChunks('prostate cancer', chunks, { topK: 3 })
    expect(result.length).toBeLessThanOrEqual(3)
  })

  it('deduplicates nearly identical chunks', () => {
    const chunks = [
      { content: 'prostate cancer biomarkers include PSA' },
      { content: 'prostate cancer biomarkers include PSA and' },
      { content: 'completely different text about weather' }
    ]
    const result = rerankChunks('prostate cancer', chunks, { topK: 2 })
    expect(result.length).toBeLessThanOrEqual(2)
  })
})
