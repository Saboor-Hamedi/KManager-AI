import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import AnalyticsTable from '../../../../../src/renderer/src/components/analytics/AnalyticsTable'

const mockData = {
  chartData: [
    { label: 'Q1', queryText: 'search for cats', isConv: true, standard: 400, hybrid: 200, metrics: { hybridCoherence: 90, hybridRelevance: 85, hybridFaithfulness: 95 } },
    { label: 'Q2', queryText: 'explain economics', isConv: false, standard: 500, hybrid: 480, metrics: { hybridCoherence: 80, hybridRelevance: 70, hybridFaithfulness: 88 } }
  ]
}

describe('AnalyticsTable', () => {
  it('renders nothing when no chart data', () => {
    const { container } = render(<AnalyticsTable data={{}} />)
    expect(container.innerHTML).toBe('')
  })

  it('renders title and record count', () => {
    render(<AnalyticsTable data={mockData} />)
    expect(screen.getByText('Raw Query Telemetry')).toBeInTheDocument()
    expect(screen.getByText(/\(2 records\)/)).toBeInTheDocument()
  })

  it('renders query rows with latency and route', () => {
    render(<AnalyticsTable data={mockData} />)
    expect(screen.getByText('search for cats')).toBeInTheDocument()
    expect(screen.getByText('explain economics')).toBeInTheDocument()
    expect(screen.getByText('400ms')).toBeInTheDocument()
    expect(screen.getByText('200ms')).toBeInTheDocument()
    expect(screen.getByText('Conv')).toBeInTheDocument()
    expect(screen.getAllByText('Vector').length).toBeGreaterThanOrEqual(1)
  })

  it('filters rows by search query', async () => {
    render(<AnalyticsTable data={mockData} />)
    fireEvent.change(screen.getByPlaceholderText('Search...'), { target: { value: 'cats' } })
    await waitFor(() => expect(screen.queryByText('explain economics')).not.toBeInTheDocument())
    expect(screen.getByText('search for cats')).toBeInTheDocument()
  })

  it('filters rows by route', () => {
    render(<AnalyticsTable data={mockData} />)
    fireEvent.click(screen.getByText('Conversational'))
    expect(screen.getByText('search for cats')).toBeInTheDocument()
    expect(screen.queryByText('explain economics')).not.toBeInTheDocument()
  })
})
