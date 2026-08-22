import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import TradeoffScatterFigure from '../../../../../../src/renderer/src/components/analytics/figures/TradeoffScatterFigure'

vi.mock('html-to-image', () => ({
  toBlob: vi.fn().mockResolvedValue(new Blob(['x'])),
  toPng: vi.fn().mockResolvedValue('data:image/png;base64,x')
}))

const mockData = {
  chartData: [
    { latency: 120, similarity: 0.85, isFallback: false, queryText: 'hybrid query' },
    { latency: 400, similarity: 0.7, isFallback: true, queryText: 'fallback query' },
    { latency: 130, similarity: 0.9, isFallback: false, queryText: 'hybrid query 2' }
  ]
}

describe('TradeoffScatterFigure', () => {
  it('renders title with record count', () => {
    render(<TradeoffScatterFigure data={mockData} />)
    expect(screen.getByText('Accuracy vs. Latency Trade-Off (3 records)')).toBeInTheDocument()
  })

  it('defaults to the last 25 records', () => {
    const many = { chartData: Array.from({ length: 40 }, (_, i) => ({ latency: 100 + i, similarity: 0.5, isFallback: false, queryText: `q${i}` })) }
    render(<TradeoffScatterFigure data={many} />)
    expect(screen.getByText('Accuracy vs. Latency Trade-Off (25 records)')).toBeInTheDocument()
  })

  it('shows all records when All selected', () => {
    const many = { chartData: Array.from({ length: 40 }, (_, i) => ({ latency: 100 + i, similarity: 0.5, isFallback: false, queryText: `q${i}` })) }
    render(<TradeoffScatterFigure data={many} />)
    fireEvent.click(screen.getByText('All'))
    expect(screen.getByText('Accuracy vs. Latency Trade-Off (40 records)')).toBeInTheDocument()
  })

  it('renders subtitle describing the chart', () => {
    render(<TradeoffScatterFigure data={mockData} />)
    expect(screen.getByText('Pareto frontier of execution speed against answer factuality')).toBeInTheDocument()
  })

  it('renders range selector buttons', () => {
    render(<TradeoffScatterFigure data={mockData} />)
    expect(screen.getByText('15')).toBeInTheDocument()
    expect(screen.getByText('50')).toBeInTheDocument()
    expect(screen.getByText('All')).toBeInTheDocument()
  })
})
