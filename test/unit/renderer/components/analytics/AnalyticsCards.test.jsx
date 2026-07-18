import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import AnalyticsCards from '../../../../../src/renderer/src/components/analytics/AnalyticsCards'

describe('AnalyticsCards', () => {
  const data = {
    totalQueries: 50,
    avgStandard: 780,
    dbSearchesAvoided: 20,
    totalTokensSaved: 45000,
    positiveFeedback: 15,
    hybridRate: '42.5',
    avgTokens: 32,
    retrieval: { avgCosine: '0.86', contextDensity: '78', mrrAt3: '0.82', avgSearchSpeed: '14' },
    realCharts: {},
    chartData: [],
    activityFeed: []
  }

  it('renders system usage metrics', () => {
    render(<AnalyticsCards data={data} />)
    expect(screen.getByText('Total Queries')).toBeInTheDocument()
    expect(screen.getByText('Avg Latency')).toBeInTheDocument()
    expect(screen.getByText('User Feedback')).toBeInTheDocument()
    expect(screen.getByText('Tokens Ingested')).toBeInTheDocument()
  })

  it('renders retrieval metrics', () => {
    render(<AnalyticsCards data={data} />)
    expect(screen.getByText('Avg Cosine Sim.')).toBeInTheDocument()
    expect(screen.getByText('Context Density')).toBeInTheDocument()
    expect(screen.getByText('Mean Reciprocal')).toBeInTheDocument()
    expect(screen.getByText('Index Speed')).toBeInTheDocument()
  })

  it('renders pipeline metrics', () => {
    render(<AnalyticsCards data={data} />)
    expect(screen.getByText('Hybrid Routing Rate')).toBeInTheDocument()
    expect(screen.getByText('Avg Query Length')).toBeInTheDocument()
  })
})
