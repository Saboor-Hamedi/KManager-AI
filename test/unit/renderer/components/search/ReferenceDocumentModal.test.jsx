import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import React from 'react'
import ReferenceDocumentModal from '../../../../../src/renderer/src/components/search/ReferenceDocumentModal'

describe('ReferenceDocumentModal', () => {
  const onClose = vi.fn()

  beforeEach(() => {
    onClose.mockClear()
  })

  const mdItem = {
    id: 'c1',
    title: 'notes.md',
    category: 'MD',
    content: 'notes.md\n\nBody text of the notes document.',
    vault_path: '/docs/notes.md'
  }

  const pdfItem = {
    id: 'c2',
    title: 'report.pdf',
    category: 'PDF',
    content: 'pdf content',
    vault_path: 'C:\\docs\\report.pdf'
  }

  it('renders nothing when no document selected', () => {
    const { container } = render(<ReferenceDocumentModal selectedPdf={null} onClose={onClose} fileExists={true} />)
    expect(container.innerHTML).toBe('')
  })

  it('renders document title and category', () => {
    render(<ReferenceDocumentModal selectedPdf={mdItem} onClose={onClose} fileExists={true} />)
    expect(screen.getByText('notes.md')).toBeInTheDocument()
    expect(screen.getByText('MD')).toBeInTheDocument()
  })

  it('renders markdown body content after ready', async () => {
    render(<ReferenceDocumentModal selectedPdf={mdItem} onClose={onClose} fileExists={true} />)
    expect(await screen.findByText('Body text of the notes document.', {}, { timeout: 10000 })).toBeInTheDocument()
  })

  it('renders webview for PDF files that exist on disk', () => {
    const { container } = render(<ReferenceDocumentModal selectedPdf={pdfItem} onClose={onClose} fileExists={true} />)
    const webview = container.querySelector('webview')
    expect(webview).toBeInTheDocument()
    expect(webview.getAttribute('src')).toBe('file:///C:/docs/report.pdf')
  })

  it('falls back to archived text when PDF file is missing', async () => {
    render(<ReferenceDocumentModal selectedPdf={pdfItem} onClose={onClose} fileExists={false} />)
    expect(await screen.findByText(/Pdf content/, {}, { timeout: 10000 })).toBeInTheDocument()
  })

  it('closes on Escape key', async () => {
    render(<ReferenceDocumentModal selectedPdf={mdItem} onClose={onClose} fileExists={true} />)
    fireEvent.keyDown(window, { key: 'Escape' })
    await new Promise(r => setTimeout(r, 250))
    expect(onClose).toHaveBeenCalled()
  })

  it('closes when clicking outside the modal box', async () => {
    const { container } = render(<ReferenceDocumentModal selectedPdf={mdItem} onClose={onClose} fileExists={true} />)
    fireEvent.click(container.firstChild)
    await new Promise(r => setTimeout(r, 250))
    expect(onClose).toHaveBeenCalled()
  })

  it('does not close when clicking inside the modal box', async () => {
    const { container } = render(<ReferenceDocumentModal selectedPdf={mdItem} onClose={onClose} fileExists={true} />)
    const modalBox = container.querySelector('[style*="border-radius"]')
    fireEvent.click(modalBox)
    await new Promise(r => setTimeout(r, 250))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('strips the title from the beginning of the content', async () => {
    render(<ReferenceDocumentModal selectedPdf={mdItem} onClose={onClose} fileExists={true} />)
    expect(await screen.findByText('Body text of the notes document.', {}, { timeout: 10000 })).toBeInTheDocument()
  })
})
