import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import AnalyticsCards from '../../../../../src/renderer/src/components/analytics/AnalyticsCards'

describe('AnalyticsCards', () => {
  const data = {
    isUsingBenchmark: true,
    totalQueries: 50,
    avgStandard: 780,
    avgHybrid: 320,
    dbSearchesAvoided: 20,
    totalTokensSaved: 45000,
    quality: { faithfulness: '92', relevance: '88', coherence: '95', hallucinationDrop: '12' },
    retrieval: { avgCosine: '0.86', contextDensity: '78', mrrAt3: '0.82', avgSearchSpeed: '14' },
    chartData: [],
    activityFeed: []
  }

  it('renders latency metrics', () => {
    render(<AnalyticsCards data={data} />)
    expect(screen.getByText('Avg Latency (Std)')).toBeInTheDocument()
    expect(screen.getByText('Avg Latency (Hybrid)')).toBeInTheDocument()
  })

  it('renders quality metrics', () => {
    render(<AnalyticsCards data={data} />)
    expect(screen.getByText('Faithfulness')).toBeInTheDocument()
    expect(screen.getByText('Relevance')).toBeInTheDocument()
    expect(screen.getByText('Coherence')).toBeInTheDocument()
  })

  it('renders retrieval metrics', () => {
    render(<AnalyticsCards data={data} />)
    expect(screen.getByText('Avg Cosine Sim.')).toBeInTheDocument()
    expect(screen.getByText('MRR@3')).toBeInTheDocument()
  })
})
