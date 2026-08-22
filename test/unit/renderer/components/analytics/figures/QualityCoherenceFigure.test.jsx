import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import QualityCoherenceFigure from '../../../../../../src/renderer/src/components/analytics/figures/QualityCoherenceFigure'

vi.mock('html-to-image', () => ({
  toBlob: vi.fn().mockResolvedValue(new Blob(['x'])),
  toPng: vi.fn().mockResolvedValue('data:image/png;base64,x')
}))

const mockData = {
  quality: { coherence: 90, relevance: 88, faithfulness: 96 },
  chartData: [
    { label: 'Q1', queryText: 'q1', metrics: { hybridCoherence: 90, hybridRelevance: 88, hybridFaithfulness: 96 } }
  ]
}

describe('QualityCoherenceFigure', () => {
  it('renders trend title by default', () => {
    render(<QualityCoherenceFigure data={mockData} />)
    expect(screen.getByText('Quality & Coherence Progression (%)')).toBeInTheDocument()
  })

  it('switches to summary mode', () => {
    render(<QualityCoherenceFigure data={mockData} />)
    fireEvent.click(screen.getByText('Summary'))
    expect(screen.getByText('Overall Quality Benchmark Comparison (%)')).toBeInTheDocument()
    expect(screen.getByText('Response Coherence')).toBeInTheDocument()
    expect(screen.getByText('Answer Relevance')).toBeInTheDocument()
  })

  it('renders summary baseline values', () => {
    render(<QualityCoherenceFigure data={mockData} />)
    fireEvent.click(screen.getByText('Summary'))
    expect(screen.getByText('Base: 76.0%')).toBeInTheDocument()
    expect(screen.getByText('Hybrid RAG: 90.0%')).toBeInTheDocument()
  })

  it('renders time window buttons in trend mode', () => {
    render(<QualityCoherenceFigure data={mockData} />)
    expect(screen.getByText('All')).toBeInTheDocument()
  })
})
