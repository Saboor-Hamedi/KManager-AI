import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import SuccessRateFigure from '../../../../../../src/renderer/src/components/analytics/figures/SuccessRateFigure'

vi.mock('html-to-image', () => ({
  toBlob: vi.fn().mockResolvedValue(new Blob(['x'])),
  toPng: vi.fn().mockResolvedValue('data:image/png;base64,x')
}))

describe('SuccessRateFigure', () => {
  it('renders empty state when no search data', () => {
    render(<SuccessRateFigure data={{ realCharts: {} }} />)
    expect(screen.getByText('No search data available yet.')).toBeInTheDocument()
  })

  it('renders title when data present', () => {
    render(<SuccessRateFigure data={{ realCharts: { successBuckets: [{ category: 'Successful (Hits > 0)', count: 9 }, { category: 'Zero-Hit (No Results)', count: 1 }] } }} />)
    expect(screen.getByText('Search Success Rate')).toBeInTheDocument()
    expect(screen.getByText('Proportion of queries that found matching documents vs zero-hits')).toBeInTheDocument()
  })
})
