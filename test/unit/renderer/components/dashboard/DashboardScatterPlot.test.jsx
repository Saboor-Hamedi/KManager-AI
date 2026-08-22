import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import DashboardScatterPlot from '../../../../../src/renderer/src/components/dashboard/DashboardScatterPlot'

vi.mock('html-to-image', () => ({
  toBlob: vi.fn().mockResolvedValue(new Blob(['x'])),
  toPng: vi.fn().mockResolvedValue('data:image/png;base64,x')
}))

const mockChartData = [
  {
    label: 'Q1',
    queryText: 'query one',
    standard: 400,
    hybrid: 200,
    metrics: { baseFaithfulness: 45, hybridFaithfulness: 92 }
  },
  {
    label: 'Q2',
    queryText: 'query two',
    standard: 500,
    hybrid: 480,
    metrics: { baseFaithfulness: 40, hybridFaithfulness: 88 }
  }
]

describe('DashboardScatterPlot', () => {
  it('renders nothing when results is missing', () => {
    const { container } = render(<DashboardScatterPlot results={null} />)
    expect(container.innerHTML).toBe('')
  })

  it('renders nothing when chartData is missing', () => {
    const { container } = render(<DashboardScatterPlot results={{}} />)
    expect(container.innerHTML).toBe('')
  })

  it('renders title when data is present', () => {
    render(<DashboardScatterPlot results={{ chartData: mockChartData }} />)
    expect(screen.getByText('Accuracy vs. Latency Trade-off')).toBeInTheDocument()
    expect(screen.getByText('Clustering of Architecture Performance')).toBeInTheDocument()
  })
})
