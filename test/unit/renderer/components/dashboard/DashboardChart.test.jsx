import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import DashboardChart from '../../../../../src/renderer/src/components/dashboard/DashboardChart'

vi.mock('html-to-image', () => ({
  toBlob: vi.fn().mockResolvedValue(new Blob(['x'])),
  toPng: vi.fn().mockResolvedValue('data:image/png;base64,x')
}))

const makeChartData = (count) =>
  Array.from({ length: count }, (_, i) => ({
    label: `Q${i}`,
    standard: 100 + i * 10,
    hybrid: 80 + i * 8,
    queryText: `Sample query ${i}`
  }))

describe('DashboardChart', () => {
  it('renders empty state when no data', () => {
    render(<DashboardChart results={{}} />)
    expect(screen.getByText(/Run database queries in the Assistant or Search/)).toBeInTheDocument()
  })

  it('renders title and data point count', () => {
    render(<DashboardChart results={{ chartData: makeChartData(30) }} />)
    expect(screen.getByText('Latency Comparison (ms)')).toBeInTheDocument()
    expect(screen.getByText('Showing 30 data points across 30 total historical queries')).toBeInTheDocument()
  })

  it('renders bar labels for each data point', () => {
    render(<DashboardChart results={{ chartData: makeChartData(10) }} />)
    expect(screen.getByText('Q0')).toBeInTheDocument()
    expect(screen.getByText('Q9')).toBeInTheDocument()
  })

  it('filters data when a time window is selected', () => {
    render(<DashboardChart results={{ chartData: makeChartData(30) }} />)
    fireEvent.click(screen.getByText('Last 25'))
    expect(screen.getByText('Showing 25 data points across 30 total historical queries')).toBeInTheDocument()
  })

  it('shows a tooltip when a bar is hovered', () => {
    render(<DashboardChart results={{ chartData: makeChartData(10) }} />)
    fireEvent.mouseEnter(screen.getByText('Q1'))
    expect(screen.getByText('Q1: Sample query 1')).toBeInTheDocument()
    expect(screen.getByText('Standard: 110ms')).toBeInTheDocument()
    expect(screen.getByText('Hybrid: 88ms')).toBeInTheDocument()
  })
})
