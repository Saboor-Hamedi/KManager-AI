import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import SuggestedPrompts from '../../../../../src/renderer/src/components/search/SuggestedPrompts'

describe('SuggestedPrompts', () => {
  it('renders nothing when no prompts available', () => {
    const msg = { ragStatus: 'generating', ragAnswer: '' }
    const { container } = render(<SuggestedPrompts msg={msg} onSelectPrompt={vi.fn()} />)
    expect(container.innerHTML).toBe('')
  })

  it('renders prompt pills when available', () => {
    const msg = {
      id: '1',
      query: 'biomarkers',
      ragStatus: 'done',
      ragAnswer: '### Key Biomarkers\nPSA is important.\n### Testing Methods\nPSMA testing.',
      results: []
    }
    render(<SuggestedPrompts msg={msg} onSelectPrompt={vi.fn()} />)
    expect(screen.getByText(/Key Biomarkers/)).toBeInTheDocument()
  })
})
