import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import DashboardRetrievalChart from '../../../../../src/renderer/src/components/dashboard/DashboardRetrievalChart'

vi.mock('html-to-image', () => ({
  toBlob: vi.fn().mockResolvedValue(new Blob(['x'])),
  toPng: vi.fn().mockResolvedValue('data:image/png;base64,x')
}))

describe('DashboardRetrievalChart', () => {
  it('renders nothing when results is missing', () => {
    const { container } = render(<DashboardRetrievalChart results={null} />)
    expect(container.innerHTML).toBe('')
  })

  it('renders hint when avgStandard is zero', () => {
    render(<DashboardRetrievalChart results={{ avgStandard: 0 }} />)
    expect(screen.getByText(/Run queries to calculate exact pipeline execution bottlenecks/)).toBeInTheDocument()
  })

  it('renders title and total latency breakdown', () => {
    render(<DashboardRetrievalChart results={{ avgStandard: 1000 }} />)
    expect(screen.getByText('Latency Bottleneck')).toBeInTheDocument()
    expect(screen.getByText('Pipeline execution time breakdown (Total: 1000ms)')).toBeInTheDocument()
  })

  it('renders pipeline step cards with computed times', () => {
    render(<DashboardRetrievalChart results={{ avgStandard: 1000 }} />)
    expect(screen.getByText('Router')).toBeInTheDocument()
    expect(screen.getByText('Vector DB')).toBeInTheDocument()
    expect(screen.getAllByText('Cloud LLM').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('10ms')).toBeInTheDocument()
    expect(screen.getByText('50ms')).toBeInTheDocument()
    expect(screen.getByText('940ms')).toBeInTheDocument()
  })

  it('renders LLM generation percentage text', () => {
    render(<DashboardRetrievalChart results={{ avgStandard: 1000 }} />)
    expect(screen.getByText('LLM Generation (94%)')).toBeInTheDocument()
  })
})
