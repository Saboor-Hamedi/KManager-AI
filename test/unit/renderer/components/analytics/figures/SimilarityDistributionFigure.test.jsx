import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import SimilarityDistributionFigure from '../../../../../../src/renderer/src/components/analytics/figures/SimilarityDistributionFigure'

vi.mock('html-to-image', () => ({
  toBlob: vi.fn().mockResolvedValue(new Blob(['x'])),
  toPng: vi.fn().mockResolvedValue('data:image/png;base64,x')
}))

describe('SimilarityDistributionFigure', () => {
  it('renders empty state when no searches', () => {
    render(<SimilarityDistributionFigure data={{ realCharts: {} }} />)
    expect(screen.getByText('No semantic searches performed yet.')).toBeInTheDocument()
  })

  it('renders title when data present', () => {
    render(<SimilarityDistributionFigure data={{ realCharts: { similarityBuckets: [{ category: 'High (>0.8)', count: 6 }] } }} />)
    expect(screen.getByText('Routing & Relevance')).toBeInTheDocument()
    expect(screen.getByText('Distribution of Pipeline Usage and Semantic Scores')).toBeInTheDocument()
  })
})
