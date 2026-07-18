import { describe, it, expect, vi } from 'vitest'

const { getLocalSuggestedPrompts } = await import('../../../../src/renderer/src/lib/suggestedPrompts')

describe('getLocalSuggestedPrompts', () => {
  it('returns empty array for empty query', () => {
    const result = getLocalSuggestedPrompts('', [])
    expect(Array.isArray(result)).toBe(true)
  })

  it('extracts headings from RAG answer', () => {
    const result = getLocalSuggestedPrompts('biomarkers', [], '### Key Biomarkers\nPSA is important.\n### Testing Methods\nPSMA testing.')
    expect(result.length).toBeGreaterThan(0)
    const hasHeadingPrompt = result.some(p => p.includes('Key Biomarkers'))
    expect(hasHeadingPrompt).toBe(true)
  })

  it('falls back to generic prompts when no answer provided', () => {
    const result = getLocalSuggestedPrompts('cancer', [])
    expect(result.length).toBeGreaterThan(0)
  })

  it('uses document titles for suggestions', () => {
    const result = getLocalSuggestedPrompts('cancer', [
      { title: 'prostate_cancer_review.pdf' },
      { title: 'biomarkers_2024.pdf' }
    ])
    expect(result.length).toBeGreaterThan(0)
  })
})

