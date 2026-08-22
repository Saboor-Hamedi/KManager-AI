import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import AnalyticsModal from '../../../../../src/renderer/src/components/analytics/AnalyticsModal'

vi.mock('html-to-image', () => ({
  toBlob: vi.fn().mockResolvedValue(new Blob(['x'])),
  toPng: vi.fn().mockResolvedValue('data:image/png;base64,x')
}))

describe('AnalyticsModal', () => {
  beforeEach(() => {
    window.api.db.getAnalytics = vi.fn().mockResolvedValue({
      success: true,
      metrics: {
        recentQueries: [
          { id: 1, query_text: 'search for cats', latency_ms: 400, top_similarity: 0.85, is_fallback: false, created_at: '2026-01-01T00:00:00Z' },
          { id: 2, query_text: 'explain economics', latency_ms: 500, top_similarity: 0.7, is_fallback: true, created_at: '2026-01-02T00:00:00Z' }
        ]
      }
    })
  })
  it('renders nothing when closed', () => {
    const { container } = render(<AnalyticsModal isOpen={false} onClose={vi.fn()} />)
    expect(container.innerHTML).toBe('')
  })

  it('renders header and loads analytics when open', async () => {
    render(<AnalyticsModal isOpen={true} onClose={vi.fn()} />)
    expect(screen.getByText('Hybrid RAG Analytics')).toBeInTheDocument()
    expect(await screen.findByText('System Usage & Feedback')).toBeInTheDocument()
  })

  it('switches to Performance Charts tab', async () => {
    render(<AnalyticsModal isOpen={true} onClose={vi.fn()} />)
    await screen.findByText('System Usage & Feedback')
    fireEvent.click(screen.getByText('Performance Charts'))
    expect(await screen.findByText('No search volume data available yet.')).toBeInTheDocument()
  })

  it('switches to Raw Telemetry tab', async () => {
    render(<AnalyticsModal isOpen={true} onClose={vi.fn()} />)
    await screen.findByText('System Usage & Feedback')
    fireEvent.click(screen.getByText('Raw Telemetry'))
    expect(await screen.findByText('Raw Query Telemetry')).toBeInTheDocument()
    expect(screen.getByText('search for cats')).toBeInTheDocument()
  })

  it('calls onClose when the X button is clicked', async () => {
    const onClose = vi.fn()
    render(<AnalyticsModal isOpen={true} onClose={onClose} />)
    await screen.findByText('System Usage & Feedback')
    fireEvent.click(screen.getByTitle('Close Analytics (Esc)'))
    expect(onClose).toHaveBeenCalled()
  })

  it('closes via Escape key', async () => {
    const onClose = vi.fn()
    render(<AnalyticsModal isOpen={true} onClose={onClose} />)
    await screen.findByText('System Usage & Feedback')
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })
})
