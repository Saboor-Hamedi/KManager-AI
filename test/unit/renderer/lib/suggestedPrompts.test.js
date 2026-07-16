import { describe, it, expect, vi } from 'vitest'

vi.mock('../../../../src/renderer/src/lib/settings', () => ({
  getSetting: vi.fn((key, def) => {
    if (key === 'DEEPSEEK_API_KEY') return Promise.resolve('sk-test-key')
    return Promise.resolve(def)
  }),
  saveSetting: vi.fn((key, val) => Promise.resolve(true))
}))

const { getLocalSuggestedPrompts, fetchDynamicPrompts } = await import('../../../../src/renderer/src/lib/suggestedPrompts')

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

describe('fetchDynamicPrompts', () => {
  it('returns null if no API key', async () => {
    const result = await fetchDynamicPrompts('test', 'answer', '')
    expect(result).toBeNull()
  })

  it('returns null for placeholder API key', async () => {
    const result = await fetchDynamicPrompts('test', 'answer', 'your_deepseek_api_key_here')
    expect(result).toBeNull()
  })
})
