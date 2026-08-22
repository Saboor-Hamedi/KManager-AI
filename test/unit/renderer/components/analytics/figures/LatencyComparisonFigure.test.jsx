import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import LatencyComparisonFigure from '../../../../../../src/renderer/src/components/analytics/figures/LatencyComparisonFigure'

vi.mock('html-to-image', () => ({
  toBlob: vi.fn().mockResolvedValue(new Blob(['x'])),
  toPng: vi.fn().mockResolvedValue('data:image/png;base64,x')
}))

const makeChartData = (count) =>
  Array.from({ length: count }, (_, i) => ({
    label: `Q${i}`,
    standard: 400 + i * 10,
    hybrid: 200 + i * 5,
    queryText: `query ${i}`
  }))

describe('LatencyComparisonFigure', () => {
  it('renders title and query count', () => {
    render(<LatencyComparisonFigure data={{ chartData: makeChartData(3) }} />)
    expect(screen.getByText('End-to-End Latency Comparison (ms)')).toBeInTheDocument()
    expect(screen.getByText(/Standard RAG vs Intent-Aware Hybrid Routing across 3 queries/)).toBeInTheDocument()
  })

  it('defaults to the last 25 queries', () => {
    render(<LatencyComparisonFigure data={{ chartData: makeChartData(30) }} />)
    expect(screen.getByText(/across 25 queries/)).toBeInTheDocument()
  })

  it('shows all queries when All selected', () => {
    render(<LatencyComparisonFigure data={{ chartData: makeChartData(30) }} />)
    fireEvent.click(screen.getByText('All'))
    expect(screen.getByText(/across 30 queries/)).toBeInTheDocument()
  })

  it('renders legend labels', () => {
    render(<LatencyComparisonFigure data={{ chartData: makeChartData(3) }} />)
    expect(screen.getAllByText('Standard').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Hybrid').length).toBeGreaterThanOrEqual(1)
  })
})
