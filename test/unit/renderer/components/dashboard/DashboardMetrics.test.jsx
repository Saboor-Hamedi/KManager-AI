import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import DashboardMetrics from '../../../../../src/renderer/src/components/dashboard/DashboardMetrics'

const mockResults = {
  avgStandard: 400,
  avgHybrid: 200,
  dbSearchesAvoided: 42,
  totalTokensSaved: 12000,
  quality: {
    faithfulness: 96,
    relevance: 92,
    coherence: 88,
    hallucinationDrop: 45
  },
  retrieval: {
    avgCosine: 0.85,
    contextDensity: 78,
    mrrAt3: 0.62,
    avgSearchSpeed: 30
  }
}

describe('DashboardMetrics', () => {
  it('renders waiting state cards when no results', () => {
    render(<DashboardMetrics results={null} />)
    expect(screen.getAllByText('Waiting')).toHaveLength(4)
    expect(screen.getByText('Avg Latency (Std)')).toBeInTheDocument()
    expect(screen.getAllByText('-- ms')).toHaveLength(2)
  })

  it('renders latency values from results', () => {
    render(<DashboardMetrics results={mockResults} />)
    expect(screen.getByText('400ms')).toBeInTheDocument()
    expect(screen.getByText('200ms')).toBeInTheDocument()
    expect(screen.getByText('Avg Latency (Hybrid)')).toBeInTheDocument()
  })

  it('renders quality metrics', () => {
    render(<DashboardMetrics results={mockResults} />)
    expect(screen.getByText('96%')).toBeInTheDocument()
    expect(screen.getByText('92%')).toBeInTheDocument()
    expect(screen.getByText('+45%')).toBeInTheDocument()
    expect(screen.getByText('Avg Faithfulness')).toBeInTheDocument()
  })

  it('renders retrieval metrics', () => {
    render(<DashboardMetrics results={mockResults} />)
    expect(screen.getByText('0.62')).toBeInTheDocument()
    expect(screen.getByText('78%')).toBeInTheDocument()
    expect(screen.getByText('30ms')).toBeInTheDocument()
    expect(screen.getByText('MRR@3')).toBeInTheDocument()
  })

  it('shows user feedback count and tokens saved', () => {
    render(<DashboardMetrics results={mockResults} />)
    expect(screen.getByText('42')).toBeInTheDocument()
    expect(screen.getByText('12000')).toBeInTheDocument()
    expect(screen.getByText('Est. Tokens Saved')).toBeInTheDocument()
  })
})
