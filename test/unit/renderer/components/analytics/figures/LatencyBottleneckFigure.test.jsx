import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import LatencyBottleneckFigure from '../../../../../../src/renderer/src/components/analytics/figures/LatencyBottleneckFigure'

vi.mock('html-to-image', () => ({
  toBlob: vi.fn().mockResolvedValue(new Blob(['x'])),
  toPng: vi.fn().mockResolvedValue('data:image/png;base64,x')
}))

describe('LatencyBottleneckFigure', () => {
  it('renders title with default values when no data', () => {
    render(<LatencyBottleneckFigure data={{}} />)
    expect(screen.getByText('Execution Bottlenecks (650ms Avg Hybrid)')).toBeInTheDocument()
  })

  it('renders pipeline step names', () => {
    render(<LatencyBottleneckFigure data={{}} />)
    expect(screen.getByText('Local Routing')).toBeInTheDocument()
    expect(screen.getByText('Vector Retrieval')).toBeInTheDocument()
    expect(screen.getByText('LLM Synthesis')).toBeInTheDocument()
  })

  it('computes averages from fallback and hybrid queries', () => {
    const data = {
      chartData: [
        { latency: 100, isFallback: true },
        { latency: 700, isFallback: false }
      ]
    }
    render(<LatencyBottleneckFigure data={data} />)
    expect(screen.getByText('Execution Bottlenecks (700ms Avg Hybrid)')).toBeInTheDocument()
  })

  it('renders step details text', () => {
    render(<LatencyBottleneckFigure data={{}} />)
    expect(screen.getByText('Short-circuits conversational queries without network hop.')).toBeInTheDocument()
    expect(screen.getByText('Dense and sparse hybrid scoring over document chunks.')).toBeInTheDocument()
  })
})
