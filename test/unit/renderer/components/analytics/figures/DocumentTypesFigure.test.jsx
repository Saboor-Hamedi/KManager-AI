import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import DocumentTypesFigure from '../../../../../../src/renderer/src/components/analytics/figures/DocumentTypesFigure'

vi.mock('html-to-image', () => ({
  toBlob: vi.fn().mockResolvedValue(new Blob(['x'])),
  toPng: vi.fn().mockResolvedValue('data:image/png;base64,x')
}))

describe('DocumentTypesFigure', () => {
  it('renders empty state when no doc types', () => {
    render(<DocumentTypesFigure data={{ realCharts: {} }} />)
    expect(screen.getByText('No documents ingested yet.')).toBeInTheDocument()
  })

  it('renders title when data present', () => {
    render(<DocumentTypesFigure data={{ realCharts: { docTypes: [{ name: 'PDF', value: 5 }, { name: 'Markdown', value: 3 }] } }} />)
    expect(screen.getByText('Vault Composition')).toBeInTheDocument()
    expect(screen.getByText('Distribution of ingested file formats')).toBeInTheDocument()
  })
})
