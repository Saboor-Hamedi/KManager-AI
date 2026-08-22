import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import DashboardQualityChart from '../../../../../src/renderer/src/components/dashboard/DashboardQualityChart'

vi.mock('html-to-image', () => ({
  toBlob: vi.fn().mockResolvedValue(new Blob(['x'])),
  toPng: vi.fn().mockResolvedValue('data:image/png;base64,x')
}))

const mockChartData = [
  {
    label: 'Q1',
    queryText: 'query one',
    metrics: { baseFaithfulness: 50, hybridFaithfulness: 90, baseRelevance: 55, hybridRelevance: 85, baseCoherence: 60, hybridCoherence: 80 }
  },
  {
    label: 'Q2',
    queryText: 'query two',
    metrics: { baseFaithfulness: 60, hybridFaithfulness: 94, baseRelevance: 65, hybridRelevance: 88, baseCoherence: 70, hybridCoherence: 84 }
  }
]

describe('DashboardQualityChart', () => {
  it('renders empty state when no data', () => {
    render(<DashboardQualityChart results={{}} />)
    expect(screen.getByText(/Run real database queries to populate Coherence and Quality history/)).toBeInTheDocument()
  })

  it('renders trend title by default', () => {
    render(<DashboardQualityChart results={{ chartData: mockChartData }} />)
    expect(screen.getByText('Coherence & Quality Trend (%)')).toBeInTheDocument()
  })

  it('switches to summary mode', () => {
    render(<DashboardQualityChart results={{ chartData: mockChartData }} />)
    fireEvent.click(screen.getByText('Summary Bars'))
    expect(screen.getByText('Overall Quality Benchmark (%)')).toBeInTheDocument()
    expect(screen.getByText('Response Coherence')).toBeInTheDocument()
    expect(screen.getByText('Answer Relevance')).toBeInTheDocument()
    expect(screen.getByText('Faithfulness (Factuality)')).toBeInTheDocument()
  })

  it('shows summary values computed from data', () => {
    render(<DashboardQualityChart results={{ chartData: mockChartData }} />)
    fireEvent.click(screen.getByText('Summary Bars'))
    expect(screen.getByText('82.0% (vs Base 65.0%)')).toBeInTheDocument()
    expect(screen.getByText('86.5% (vs Base 60.0%)')).toBeInTheDocument()
    expect(screen.getByText('92.0% (vs Base 55.0%)')).toBeInTheDocument()
  })

  it('renders legend labels in trend mode', () => {
    render(<DashboardQualityChart results={{ chartData: mockChartData }} />)
    expect(screen.getByText('Coherence')).toBeInTheDocument()
    expect(screen.getByText('Relevance')).toBeInTheDocument()
    expect(screen.getByText('Faithfulness')).toBeInTheDocument()
  })
})
