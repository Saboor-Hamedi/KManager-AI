import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import SpotLitePreview from '../../../../../src/renderer/src/components/spotlite/SpotLitePreview'

describe('SpotLitePreview', () => {
  const mdItem = {
    id: '1',
    title: 'notes.md',
    category: 'MD',
    vault_path: '/path/to/notes.md',
    content: 'Markdown notes'
  }

  it('renders nothing when no item selected', () => {
    const { container } = render(<SpotLitePreview selectedPdf={null} onClose={vi.fn()} fileExists={true} />)
    expect(container.innerHTML).toBe('')
  })

  it('renders document title', () => {
    render(<SpotLitePreview selectedPdf={mdItem} fileExists={true} onClose={vi.fn()} />)
    expect(screen.getByText('notes.md')).toBeInTheDocument()
  })

  it('renders markdown content', async () => {
    render(<SpotLitePreview selectedPdf={{ ...mdItem, content: 'Hello **bold**' }} fileExists={true} onClose={vi.fn()} />)
    expect(await screen.findByText(/Hello/, {}, { timeout: 5000 })).toBeInTheDocument()
  })

  it('shows archived notice for missing PDF files', async () => {
    const pdfItem = { ...mdItem, title: 'test.pdf', category: 'PDF', vault_path: '/path/to/test.pdf' }
    render(<SpotLitePreview selectedPdf={pdfItem} fileExists={false} onClose={vi.fn()} />)
    expect(screen.getByText(/Original file no longer on disk/)).toBeInTheDocument()
  })

  it('enters edit mode and saves edited content', async () => {
    const mockUpdateTitle = vi.fn().mockResolvedValue({ success: true })
    const mockSaveFile = vi.fn().mockResolvedValue({ success: true })
    const mockIngest = vi.fn().mockResolvedValue({ success: true })
    const onDocumentUpdate = vi.fn()

    window.api.db.updateDocumentTitle = mockUpdateTitle
    window.api.system.saveFileContent = mockSaveFile
    window.api.db.ingestFile = mockIngest

    const { container } = render(
      <SpotLitePreview
        selectedPdf={mdItem}
        fullText={mdItem.content}
        fileExists={true}
        onClose={vi.fn()}
        onDocumentUpdate={onDocumentUpdate}
      />
    )
    fireEvent.click(screen.getByText('Edit'))
    const textarea = container.querySelector('textarea')
    expect(textarea).toBeInTheDocument()
    fireEvent.change(textarea, { target: { value: 'Updated content' } })
    fireEvent.click(screen.getByText('Save'))
    await waitFor(() => {
      expect(mockSaveFile).toHaveBeenCalledWith('/path/to/notes.md', 'Updated content')
      expect(mockIngest).toHaveBeenCalledWith('/path/to/notes.md')
      expect(onDocumentUpdate).toHaveBeenCalled()
    })
  })

  it('cancels edit without saving', () => {
    const { container } = render(
      <SpotLitePreview selectedPdf={mdItem} fullText={mdItem.content} fileExists={true} onClose={vi.fn()} />
    )
    fireEvent.click(screen.getByText('Edit'))
    expect(container.querySelector('textarea')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Cancel'))
    expect(container.querySelector('textarea')).not.toBeInTheDocument()
  })

  it('does not show Edit for PDF files', () => {
    const pdfItem = { ...mdItem, title: 'test.pdf', category: 'PDF', vault_path: '/path/to/test.pdf' }
    render(<SpotLitePreview selectedPdf={pdfItem} fileExists={true} onClose={vi.fn()} />)
    expect(screen.queryByText('Edit')).not.toBeInTheDocument()
  })
})
