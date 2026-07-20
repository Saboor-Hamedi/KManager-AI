import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import AnalyticsCards from '../../../../../src/renderer/src/components/analytics/AnalyticsCards'

const mockData = {
  totalQueries: 100,
  avgStandard: 45,
  dbSearchesAvoided: 50,
  tokensIngested: 500000,
  totalSearches: 200,
  avgFusion: 120,
  dbSearchesDisplayed: 80,
  documentsProcessed: 300,
  embeddingSuccessRate: 95,
  chunksProcessed: 1500,
  avgEmbeddingTime: 35,
  totalErrors: 5,
  retrieval: {
    avgCosine: 0.85,
    avgBm25: 0.72,
    avgRrf: 0.78
  },
  feedbackPositive: 40,
  feedbackNegative: 10,
  avgRetrievalLatency: 80,
  avgRerankLatency: 30,
  avgFusionLatency: 50,
  avgTotalLatency: 160
}

describe('AnalyticsCards', () => {
  it('renders the dashboard', () => {
    render(<AnalyticsCards data={mockData} />)
    expect(screen.getByText('System Usage & Feedback')).toBeInTheDocument()
  })
})
