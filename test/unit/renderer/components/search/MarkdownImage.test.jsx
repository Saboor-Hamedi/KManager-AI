import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import MarkdownImage from '../../../../../src/renderer/src/components/search/MarkdownImage'

describe('MarkdownImage', () => {
  it('renders the image with alt text', () => {
    render(<MarkdownImage src="https://example.com/img.png" alt="test image" />)
    expect(screen.getByAltText('test image')).toBeInTheDocument()
    expect(screen.getByText('test image')).toBeInTheDocument()
  })

  it('shows error state when image fails to load', () => {
    render(<MarkdownImage src="bad-url" alt="broken" />)
    fireEvent.error(screen.getByAltText('broken'))
    expect(screen.getByText(/broken/)).toBeInTheDocument()
  })

  it('opens fullscreen modal on expand', () => {
    window.open = vi.fn()
    render(<MarkdownImage src="https://example.com/img.png" alt="img" />)
    fireEvent.click(screen.getByTitle('Expand to fullscreen'))
    expect(screen.getByTitle('Close Fullscreen (Esc)')).toBeInTheDocument()
  })

  it('closes fullscreen modal', () => {
    render(<MarkdownImage src="https://example.com/img.png" alt="img" />)
    fireEvent.click(screen.getByTitle('Expand to fullscreen'))
    fireEvent.click(screen.getByTitle('Close Fullscreen (Esc)'))
    expect(screen.queryByTitle('Close Fullscreen (Esc)')).not.toBeInTheDocument()
  })

  it('closes modal on Escape', () => {
    render(<MarkdownImage src="https://example.com/img.png" alt="img" />)
    fireEvent.click(screen.getByTitle('Expand to fullscreen'))
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByTitle('Close Fullscreen (Esc)')).not.toBeInTheDocument()
  })

  it('zooms in and out', () => {
    render(<MarkdownImage src="https://example.com/img.png" alt="img" />)
    const img = screen.getByAltText('img')
    expect(img.style.transform).toContain('scale(1)')
    fireEvent.click(screen.getByTitle('Zoom In'))
    expect(screen.getByAltText('img').style.transform).toContain('scale(1.25)')
    fireEvent.click(screen.getByTitle('Zoom Out'))
    expect(screen.getByAltText('img').style.transform).toContain('scale(1)')
  })

  it('downloads image on download click', () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    render(<MarkdownImage src="https://example.com/img.png" alt="img" />)
    fireEvent.click(screen.getByTitle('Download Image'))
    expect(clickSpy).toHaveBeenCalled()
    clickSpy.mockRestore()
  })
})
