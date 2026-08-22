import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'
import React from 'react'
import CitationPreviewModal from '../../../../../src/renderer/src/components/search/CitationPreviewModal'

describe('CitationPreviewModal', () => {
  const onClose = vi.fn()
  const onOpenFullFile = vi.fn()

  const item = {
    id: 'c1',
    title: 'report.pdf',
    category: 'PDF',
    content: 'This is the excerpt content.',
    document_id: 'd1',
    vault_path: '/docs/report.pdf',
    similarity: 0.82
  }

  beforeEach(() => {
    onClose.mockClear()
    onOpenFullFile.mockClear()
    window.api.db.query = vi.fn().mockResolvedValue({ rows: [] })
  })

  it('renders nothing when no preview item', () => {
    const { container } = render(<CitationPreviewModal previewItem={null} onClose={onClose} />)
    expect(container.innerHTML).toBe('')
  })

  it('renders item title and category', () => {
    render(<CitationPreviewModal previewItem={item} onClose={onClose} />)
    expect(screen.getByText('report.pdf')).toBeInTheDocument()
    expect(screen.getByText('PDF')).toBeInTheDocument()
  })

  it('shows Retrieved Excerpt header', () => {
    render(<CitationPreviewModal previewItem={item} onClose={onClose} />)
    expect(screen.getByText('Retrieved Excerpt')).toBeInTheDocument()
  })

  it('copies excerpt content to clipboard', async () => {
    render(<CitationPreviewModal previewItem={item} onClose={onClose} />)
    const copyBtn = screen.getByRole('button', { name: /copy/i })
    fireEvent.click(copyBtn)
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('This is the excerpt content.')
    expect(screen.getByText('Copied')).toBeInTheDocument()
  })

  it('closes on Escape', () => {
    render(<CitationPreviewModal previewItem={item} onClose={onClose} />)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  it('closes on backdrop click', () => {
    const { container } = render(<CitationPreviewModal previewItem={item} onClose={onClose} />)
    const backdrop = container.querySelector('.bg-black\\/50')
    fireEvent.click(backdrop)
    expect(onClose).toHaveBeenCalled()
  })

  it('opens full file and closes when onOpenFullFile provided', () => {
    render(<CitationPreviewModal previewItem={item} onClose={onClose} onOpenFullFile={onOpenFullFile} />)
    fireEvent.click(screen.getByRole('button', { name: /open full/i }))
    expect(onClose).toHaveBeenCalled()
    expect(onOpenFullFile).toHaveBeenCalledWith(item)
  })

  it('does not show Open Full button when no vault_path', () => {
    render(<CitationPreviewModal previewItem={{ ...item, vault_path: null }} onClose={onClose} onOpenFullFile={onOpenFullFile} />)
    expect(screen.queryByRole('button', { name: /open full/i })).not.toBeInTheDocument()
  })

  it('shows full document context when db query returns content', async () => {
    window.api.db.query = vi.fn().mockResolvedValue([{ content: 'Full document text content.' }])
    await act(async () => {
      render(<CitationPreviewModal previewItem={item} onClose={onClose} />)
    })
    expect(await screen.findByRole('button', { name: /show full document/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /show full document/i }))
    expect(screen.getByText('Complete Document Context')).toBeInTheDocument()
    expect(screen.getByText('Showing Full Context')).toBeInTheDocument()
  })
})
