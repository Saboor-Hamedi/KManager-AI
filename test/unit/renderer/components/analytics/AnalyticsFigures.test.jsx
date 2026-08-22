import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import AnalyticsFigures from '../../../../../src/renderer/src/components/analytics/AnalyticsFigures'

vi.mock('html-to-image', () => ({
  toBlob: vi.fn().mockResolvedValue(new Blob(['x'])),
  toPng: vi.fn().mockResolvedValue('data:image/png;base64,x')
}))

const mockData = {
  chartData: [],
  realCharts: {
    searchesOverTime: [{ date: 'Jan 1', count: 3 }],
    docTypes: [{ name: 'PDF', value: 5 }],
    similarityBuckets: [{ category: 'High (>0.8)', count: 4 }],
    routingBuckets: [{ category: 'Smart Hybrid', count: 2 }],
    feedbackBuckets: [{ category: 'Positive', count: 1 }],
    successBuckets: [{ category: 'Successful (Hits > 0)', count: 5 }],
    tokenEconomics: [{ date: 'Jan 1', used: 100, saved: 50 }],
    latencyTrend: [{ label: 'Q1', latency: 100, similarity: 0.8, queryText: 'q1' }]
  }
}

describe('AnalyticsFigures', () => {
  it('renders nothing when data is missing', () => {
    const { container } = render(<AnalyticsFigures data={null} />)
    expect(container.innerHTML).toBe('')
  })

  it('renders figure titles across all rows', () => {
    render(<AnalyticsFigures data={mockData} />)
    expect(screen.getByText('Search Volume (Last 7 Days)')).toBeInTheDocument()
    expect(screen.getByText('Real-time Latency Trend (ms)')).toBeInTheDocument()
    expect(screen.getByText('Vault Composition')).toBeInTheDocument()
    expect(screen.getByText('Routing & Relevance')).toBeInTheDocument()
    expect(screen.getByText('Pipeline Routing')).toBeInTheDocument()
    expect(screen.getByText('Search Success Rate')).toBeInTheDocument()
    expect(screen.getByText('Token Economics')).toBeInTheDocument()
    expect(screen.getByText('Feedback Sentiment')).toBeInTheDocument()
  })

  it('renders empty state messages when charts have no data', () => {
    render(<AnalyticsFigures data={{ realCharts: {} }} />)
    expect(screen.getByText('No search volume data available yet.')).toBeInTheDocument()
    expect(screen.getByText('No documents ingested yet.')).toBeInTheDocument()
    expect(screen.getByText('No latency data available yet.')).toBeInTheDocument()
  })
})
