import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import SearchesOverTimeFigure from '../../../../../../src/renderer/src/components/analytics/figures/SearchesOverTimeFigure'

vi.mock('html-to-image', () => ({
  toBlob: vi.fn().mockResolvedValue(new Blob(['x'])),
  toPng: vi.fn().mockResolvedValue('data:image/png;base64,x')
}))

describe('SearchesOverTimeFigure', () => {
  it('renders empty state when no search data', () => {
    render(<SearchesOverTimeFigure data={{ realCharts: {} }} />)
    expect(screen.getByText('No search volume data available yet.')).toBeInTheDocument()
  })

  it('renders title when data present', () => {
    render(<SearchesOverTimeFigure data={{ realCharts: { searchesOverTime: [{ date: 'Jan 1', count: 5 }, { date: 'Jan 2', count: 9 }] } }} />)
    expect(screen.getByText('Search Volume (Last 7 Days)')).toBeInTheDocument()
    expect(screen.getByText('Daily count of queries processed by the semantic engine')).toBeInTheDocument()
  })
})
