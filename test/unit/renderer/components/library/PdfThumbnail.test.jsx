import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import PdfThumbnail from '../../../../../src/renderer/src/components/library/PdfThumbnail'

describe('PdfThumbnail', () => {
  it('shows fallback when no file path', () => {
    render(<PdfThumbnail filePath={null} fallbackSnippet="some snippet" />)
    expect(screen.getByText('PDF')).toBeInTheDocument()
    expect(screen.getByText('some snippet')).toBeInTheDocument()
  })

  it('shows error fallback when pdf loading fails', async () => {
    window.api.system.readFileBinary = vi.fn().mockRejectedValue(new Error('boom'))
    render(<PdfThumbnail filePath="/path/to/file.pdf" fallbackSnippet="fallback" />)
    expect(await screen.findByText('PDF')).toBeInTheDocument()
    expect(await screen.findByText('fallback')).toBeInTheDocument()
  })
})
