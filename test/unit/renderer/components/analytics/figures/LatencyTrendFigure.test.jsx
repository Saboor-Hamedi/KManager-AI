import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import LatencyTrendFigure from '../../../../../../src/renderer/src/components/analytics/figures/LatencyTrendFigure'

vi.mock('html-to-image', () => ({
  toBlob: vi.fn().mockResolvedValue(new Blob(['x'])),
  toPng: vi.fn().mockResolvedValue('data:image/png;base64,x')
}))

describe('LatencyTrendFigure', () => {
  it('renders empty state when no latency data', () => {
    render(<LatencyTrendFigure data={{ realCharts: {} }} />)
    expect(screen.getByText('No latency data available yet.')).toBeInTheDocument()
  })

  it('renders title when data present', () => {
    render(<LatencyTrendFigure data={{ realCharts: { latencyTrend: [{ label: 'Q1', latency: 120, similarity: 0.8, queryText: 'q1' }] } }} />)
    expect(screen.getByText('Real-time Latency Trend (ms)')).toBeInTheDocument()
    expect(screen.getByText(/End-to-end response time over the last 1 queries/)).toBeInTheDocument()
  })
})
