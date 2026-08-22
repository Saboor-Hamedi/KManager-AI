import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import TokenEconomicsFigure from '../../../../../../src/renderer/src/components/analytics/figures/TokenEconomicsFigure'

vi.mock('html-to-image', () => ({
  toBlob: vi.fn().mockResolvedValue(new Blob(['x'])),
  toPng: vi.fn().mockResolvedValue('data:image/png;base64,x')
}))

describe('TokenEconomicsFigure', () => {
  it('renders empty state when no token data', () => {
    render(<TokenEconomicsFigure data={{ realCharts: {} }} />)
    expect(screen.getByText('No token data available yet.')).toBeInTheDocument()
  })

  it('renders title when data present', () => {
    render(<TokenEconomicsFigure data={{ realCharts: { tokenEconomics: [{ date: 'Jan 1', used: 1200, saved: 800 }] } }} />)
    expect(screen.getByText('Token Economics')).toBeInTheDocument()
    expect(screen.getByText('Estimated tokens sent to LLM vs avoided via Standard local routing')).toBeInTheDocument()
  })
})
