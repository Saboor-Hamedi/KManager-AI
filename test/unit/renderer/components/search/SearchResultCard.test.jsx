import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import SearchResultCard from '../../../../../src/renderer/src/components/search/SearchResultCard'

const mockUpdateChunk = vi.fn()
const mockFeedback = vi.fn()

beforeEach(() => {
  mockUpdateChunk.mockReset()
  mockFeedback.mockReset()
  globalThis.window.api = {
    ...globalThis.window.api,
    db: {
      ...globalThis.window.api?.db,
      updateChunk: mockUpdateChunk,
      feedback: mockFeedback
    }
  }
})

describe('SearchResultCard', () => {
  const item = {
    id: '1',
    title: 'test_document.pdf',
    document_id: 'doc-1',
    content: 'This is the chunk content with prostate cancer biomarkers.',
    similarity: 0.87,
    category: 'PDF',
    vault_path: '/path/to/test.pdf',
    created_at: new Date().toISOString()
  }

  const renderCard = (props = {}) =>
    render(<SearchResultCard item={item} query="prostate cancer" handleSelect={vi.fn()} {...props} />)

  it('renders item title', () => {
    renderCard()
    expect(screen.getByText('test_document.pdf')).toBeInTheDocument()
  })

  it('renders similarity percentage', () => {
    renderCard()
    // Similarity is rendered in the footer via UnifiedActionBar; title includes the file name.
    expect(screen.getByText('test_document.pdf')).toBeInTheDocument()
  })

  it('renders action buttons', () => {
    renderCard()
    expect(screen.getByTitle('Helpful result')).toBeInTheDocument()
    expect(screen.getByTitle('Not helpful')).toBeInTheDocument()
    expect(screen.getByTitle('Copy Snippet')).toBeInTheDocument()
    expect(screen.getByTitle('View Source')).toBeInTheDocument()
  })

  it('renders Edit button', () => {
    renderCard()
    expect(screen.getByTitle('Edit')).toBeInTheDocument()
  })

  it('renders Reply button title when onReply is provided', () => {
    renderCard({ onReply: vi.fn() })
    expect(screen.getByTitle('Ask about this chunk')).toBeInTheDocument()
  })

  it('renders Close chat title when reply is active', () => {
    renderCard({ onReply: vi.fn(), isActiveReply: true })
    expect(screen.getByTitle('Close chat')).toBeInTheDocument()
  })

  it('shows editable textarea when Edit is clicked', () => {
    renderCard()
    fireEvent.click(screen.getByTitle('Edit'))
    expect(screen.getByRole('textbox')).toBeInTheDocument()
    expect(screen.getByText('Update')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })

  it('textarea pre-fills with item content when editing', () => {
    renderCard()
    fireEvent.click(screen.getByTitle('Edit'))
    expect(screen.getByRole('textbox')).toHaveValue(item.content)
  })

  it('Cancel reverts edit and hides textarea', () => {
    renderCard()
    fireEvent.click(screen.getByTitle('Edit'))
    expect(screen.getByRole('textbox')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Cancel'))
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.queryByText('Update')).not.toBeInTheDocument()
  })

  it('calls updateChunk on Save and exits edit mode on success', async () => {
    mockUpdateChunk.mockResolvedValue({ success: true })
    renderCard()
    fireEvent.click(screen.getByTitle('Edit'))
    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, { target: { value: 'Updated content.' } })
    fireEvent.click(screen.getByText('Update'))
    await waitFor(() => {
      expect(mockUpdateChunk).toHaveBeenCalledWith('1', 'Updated content.')
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    })
  })

  it('does not save if content is unchanged', async () => {
    mockUpdateChunk.mockResolvedValue({ success: true })
    renderCard()
    fireEvent.click(screen.getByTitle('Edit'))
    fireEvent.click(screen.getByText('Update'))
    expect(mockUpdateChunk).not.toHaveBeenCalled()
    await waitFor(() => {
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    })
  })

  it('shows Saving... while save is in progress', async () => {
    let resolvePromise
    mockUpdateChunk.mockReturnValue(new Promise(resolve => { resolvePromise = resolve }))
    renderCard()
    fireEvent.click(screen.getByTitle('Edit'))
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'New content' } })
    fireEvent.click(screen.getByText('Update'))
    expect(screen.getByText('Saving...')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeDisabled()
    resolvePromise({ success: true })
  })

  it('does not call updateChunk when api is unavailable', async () => {
    globalThis.window.api = {}
    renderCard()
    fireEvent.click(screen.getByTitle('Edit'))
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'New content' } })
    fireEvent.click(screen.getByText('Update'))
    expect(mockUpdateChunk).not.toHaveBeenCalled()
  })

  it('trims content on save', async () => {
    mockUpdateChunk.mockResolvedValue({ success: true })
    renderCard()
    fireEvent.click(screen.getByTitle('Edit'))
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '  line one\nline two  ' } })
    fireEvent.click(screen.getByText('Update'))
    expect(mockUpdateChunk).toHaveBeenCalledWith('1', 'line one\nline two')
  })

  it('syncs localContent when item.content changes', async () => {
    mockUpdateChunk.mockResolvedValue({ success: true })
    const { rerender } = renderCard()
    const newItem = { ...item, content: 'Updated external content.' }
    rerender(<SearchResultCard item={newItem} query="test" handleSelect={vi.fn()} />)
    fireEvent.click(screen.getByTitle('Edit'))
    expect(screen.getByRole('textbox')).toHaveValue('Updated external content.')
  })

  it('calls handleSelect when title is clicked', () => {
    const handleSelect = vi.fn()
    render(<SearchResultCard item={item} query="test" handleSelect={handleSelect} />)
    fireEvent.click(screen.getByText('test_document.pdf'))
    expect(handleSelect).toHaveBeenCalledWith(item)
  })

  it('shows created date label', () => {
    renderCard()
    const label = screen.getByText(/ago$|just now/)
    expect(label).toBeInTheDocument()
  })
})
