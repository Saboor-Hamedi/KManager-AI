import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
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

  it('renders item title', () => {
    render(<SearchResultCard item={item} query="prostate cancer" handleSelect={vi.fn()} />)
    expect(screen.getByText('test_document.pdf')).toBeInTheDocument()
  })

  it('renders similarity percentage', () => {
    render(<SearchResultCard item={item} query="prostate cancer" handleSelect={vi.fn()} />)
    expect(screen.getByText('87%')).toBeInTheDocument()
  })

  it('renders action buttons', () => {
    render(<SearchResultCard item={item} query="prostate cancer" handleSelect={vi.fn()} />)
    expect(screen.getByTitle('Open citation preview drawer')).toBeInTheDocument()
    expect(screen.getByTitle('Copy section text')).toBeInTheDocument()
    expect(screen.getByTitle('Helpful result')).toBeInTheDocument()
    expect(screen.getByTitle('Not helpful')).toBeInTheDocument()
  })

  it('renders Edit button when onEdit is provided', () => {
    render(<SearchResultCard item={item} query="test" handleSelect={vi.fn()} onReply={vi.fn()} />)
    expect(screen.getByTitle('Edit chunk content')).toBeInTheDocument()
  })

  it('renders Reply button title when onReply is provided', () => {
    render(<SearchResultCard item={item} query="test" handleSelect={vi.fn()} onReply={vi.fn()} />)
    expect(screen.getByTitle('Reply')).toBeInTheDocument()
  })

  it('renders Close chat title when reply is active', () => {
    render(<SearchResultCard item={item} query="test" handleSelect={vi.fn()} onReply={vi.fn()} isActiveReply={true} />)
    expect(screen.getByTitle('Close chat')).toBeInTheDocument()
  })

  it('shows editable textarea when Edit is clicked', () => {
    render(<SearchResultCard item={item} query="test" handleSelect={vi.fn()} onReply={vi.fn()} />)
    fireEvent.click(screen.getByTitle('Edit chunk content'))
    expect(screen.getByRole('textbox')).toBeInTheDocument()
    expect(screen.getByText('Update')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })

  it('textarea pre-fills with item content when editing', () => {
    render(<SearchResultCard item={item} query="test" handleSelect={vi.fn()} onReply={vi.fn()} />)
    fireEvent.click(screen.getByTitle('Edit chunk content'))
    expect(screen.getByRole('textbox')).toHaveValue(item.content)
  })

  it('Cancel reverts edit and hides textarea', () => {
    render(<SearchResultCard item={item} query="test" handleSelect={vi.fn()} onReply={vi.fn()} />)
    fireEvent.click(screen.getByTitle('Edit chunk content'))
    expect(screen.getByRole('textbox')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Cancel'))
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.queryByText('Update')).not.toBeInTheDocument()
  })

  it('calls updateChunk on Save and exits edit mode on success', async () => {
    mockUpdateChunk.mockResolvedValue({ success: true })
    render(<SearchResultCard item={item} query="test" handleSelect={vi.fn()} onReply={vi.fn()} />)
    fireEvent.click(screen.getByTitle('Edit chunk content'))
    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, { target: { value: 'Updated content.' } })
    fireEvent.click(screen.getByText('Update'))
    expect(mockUpdateChunk).toHaveBeenCalledWith('1', 'Updated content.  ')
    await vi.waitFor(() => {
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    })
  })

  it('does not save if content is unchanged', async () => {
    mockUpdateChunk.mockResolvedValue({ success: true })
    render(<SearchResultCard item={item} query="test" handleSelect={vi.fn()} onReply={vi.fn()} />)
    fireEvent.click(screen.getByTitle('Edit chunk content'))
    fireEvent.click(screen.getByText('Update'))
    expect(mockUpdateChunk).not.toHaveBeenCalled()
    await vi.waitFor(() => {
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    })
  })

  it('shows Saving... while save is in progress', async () => {
    let resolvePromise
    mockUpdateChunk.mockReturnValue(new Promise(resolve => { resolvePromise = resolve }))
    render(<SearchResultCard item={item} query="test" handleSelect={vi.fn()} onReply={vi.fn()} />)
    fireEvent.click(screen.getByTitle('Edit chunk content'))
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'New content' } })
    fireEvent.click(screen.getByText('Update'))
    expect(screen.getByText('Saving...')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeDisabled()
    resolvePromise({ success: true })
  })

  it('does not call updateChunk when api is unavailable', async () => {
    globalThis.window.api = {}
    render(<SearchResultCard item={item} query="test" handleSelect={vi.fn()} onReply={vi.fn()} />)
    fireEvent.click(screen.getByTitle('Edit chunk content'))
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'New content' } })
    fireEvent.click(screen.getByText('Update'))
    expect(mockUpdateChunk).not.toHaveBeenCalled()
  })

  it('formats content with double trailing spaces on save', async () => {
    mockUpdateChunk.mockResolvedValue({ success: true })
    render(<SearchResultCard item={item} query="test" handleSelect={vi.fn()} onReply={vi.fn()} />)
    fireEvent.click(screen.getByTitle('Edit chunk content'))
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'line one\nline two' } })
    fireEvent.click(screen.getByText('Update'))
    expect(mockUpdateChunk).toHaveBeenCalledWith('1', 'line one  \nline two  ')
  })

  it('syncs localContent when item.content changes', () => {
    const { rerender } = render(<SearchResultCard item={item} query="test" handleSelect={vi.fn()} />)
    const newItem = { ...item, content: 'Updated external content.' }
    rerender(<SearchResultCard item={item} query="test" handleSelect={vi.fn()} />)
    expect(screen.queryByText('Updated external content.')).not.toBeInTheDocument()
  })
})
