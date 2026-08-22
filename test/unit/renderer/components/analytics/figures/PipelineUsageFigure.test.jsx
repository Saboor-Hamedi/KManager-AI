import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import PipelineUsageFigure from '../../../../../../src/renderer/src/components/analytics/figures/PipelineUsageFigure'

vi.mock('html-to-image', () => ({
  toBlob: vi.fn().mockResolvedValue(new Blob(['x'])),
  toPng: vi.fn().mockResolvedValue('data:image/png;base64,x')
}))

describe('PipelineUsageFigure', () => {
  it('renders empty state when no pipeline data', () => {
    render(<PipelineUsageFigure data={{ realCharts: {} }} />)
    expect(screen.getByText('No pipeline data available yet.')).toBeInTheDocument()
  })

  it('renders title when data present', () => {
    render(<PipelineUsageFigure data={{ realCharts: { routingBuckets: [{ category: 'Smart Hybrid', count: 7 }, { category: 'Standard Fallback', count: 3 }] } }} />)
    expect(screen.getByText('Pipeline Routing')).toBeInTheDocument()
    expect(screen.getByText('Proportion of queries sent to the Hybrid LLM vs Base Engine')).toBeInTheDocument()
  })
})
