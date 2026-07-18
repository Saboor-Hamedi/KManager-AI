import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import AnalyticsModal from '../../../../../src/renderer/src/components/analytics/AnalyticsModal'

describe('AnalyticsModal', () => {
  it('renders nothing when closed', () => {
    const { container } = render(<AnalyticsModal isOpen={false} onClose={vi.fn()} />)
    expect(container.innerHTML).toBe('')
  })

  it('renders content when open', () => {
    render(<AnalyticsModal isOpen={true} onClose={vi.fn()} />)
    expect(screen.getByText('Hybrid RAG Analytics')).toBeInTheDocument()
  })
})
