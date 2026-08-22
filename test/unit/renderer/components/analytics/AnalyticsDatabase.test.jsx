import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import AnalyticsDatabase from '../../../../../src/renderer/src/components/analytics/AnalyticsDatabase'

vi.mock('html-to-image', () => ({
  toBlob: vi.fn().mockResolvedValue(new Blob(['x'])),
  toPng: vi.fn().mockResolvedValue('data:image/png;base64,x')
}))

const mockData = {
  chartData: [
    { latency: 100, similarity: 0.8, isFallback: true, queryText: 'fallback query' },
    { latency: 650, similarity: 0.9, isFallback: false, queryText: 'hybrid query' }
  ]
}

describe('AnalyticsDatabase', () => {
  it('renders nothing when data is missing', () => {
    const { container } = render(<AnalyticsDatabase data={null} />)
    expect(container.innerHTML).toBe('')
  })

  it('renders tradeoff figure title', () => {
    render(<AnalyticsDatabase data={mockData} />)
    expect(screen.getByText('Accuracy vs. Latency Trade-Off (2 records)')).toBeInTheDocument()
  })

  it('renders latency bottleneck figure title', () => {
    render(<AnalyticsDatabase data={mockData} />)
    expect(screen.getByText('Execution Bottlenecks (650ms Avg Hybrid)')).toBeInTheDocument()
  })

  it('renders pipeline step names', () => {
    render(<AnalyticsDatabase data={mockData} />)
    expect(screen.getByText('Local Routing')).toBeInTheDocument()
    expect(screen.getByText('Vector Retrieval')).toBeInTheDocument()
    expect(screen.getByText('LLM Synthesis')).toBeInTheDocument()
  })
})
