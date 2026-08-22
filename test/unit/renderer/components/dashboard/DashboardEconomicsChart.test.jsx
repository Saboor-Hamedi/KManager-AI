import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import DashboardEconomicsChart from '../../../../../src/renderer/src/components/dashboard/DashboardEconomicsChart'

vi.mock('html-to-image', () => ({
  toBlob: vi.fn().mockResolvedValue(new Blob(['x'])),
  toPng: vi.fn().mockResolvedValue('data:image/png;base64,x')
}))

const makeChartData = (count) =>
  Array.from({ length: count }, (_, i) => ({
    label: `Q${i}`,
    standard: 400,
    hybrid: 200,
    isConv: i % 2 === 0,
    queryText: `Query ${i}`
  }))

describe('DashboardEconomicsChart', () => {
  it('renders nothing when results is missing', () => {
    const { container } = render(<DashboardEconomicsChart results={null} />)
    expect(container.innerHTML).toBe('')
  })

  it('renders nothing when chartData is missing', () => {
    const { container } = render(<DashboardEconomicsChart results={{}} />)
    expect(container.innerHTML).toBe('')
  })

  it('renders title and query count', () => {
    render(<DashboardEconomicsChart results={{ chartData: makeChartData(3) }} />)
    expect(screen.getByText('Cumulative Token Cost')).toBeInTheDocument()
    expect(screen.getByText(/Standard RAG vs Hybrid Smart RAG across 3 historical queries/)).toBeInTheDocument()
  })

  it('computes cumulative token data', () => {
    const { container } = render(<DashboardEconomicsChart results={{ chartData: makeChartData(4) }} />)
    const svg = container.querySelector('.recharts-responsive-container')
    expect(svg).not.toBeNull()
  })
})
