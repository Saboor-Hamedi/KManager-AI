import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import MyLibrary from '../../../../../src/renderer/src/components/library/MyLibrary'

const makeDocs = () => [
  {
    id: '1',
    file_name: 'alpha.md',
    file_type: 'md',
    vault_path: '/vault/alpha.md',
    created_at: '2026-01-01T00:00:00Z',
    file_size: 2048,
    snippet: 'Alpha content',
    content: 'Alpha content'
  },
  {
    id: '2',
    file_name: 'beta.pdf',
    file_type: 'pdf',
    vault_path: '/vault/beta.pdf',
    created_at: '2026-01-02T00:00:00Z',
    file_size: 4096,
    snippet: 'Beta content',
    content: 'Beta content'
  }
]

describe('MyLibrary', () => {
  beforeEach(() => {
    window.api.db.query = vi.fn().mockResolvedValue({ rows: makeDocs() })
    window.api.config.get = vi.fn().mockResolvedValue('newest')
    window.api.config.set = vi.fn().mockResolvedValue(true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders document titles from the database', async () => {
    render(<MyLibrary />)
    expect(await screen.findByText('alpha.md')).toBeInTheDocument()
    expect(screen.getByText('beta.pdf')).toBeInTheDocument()
  })

  it('shows empty state when no documents', async () => {
    window.api.db.query = vi.fn().mockResolvedValue({ rows: [] })
    render(<MyLibrary />)
    expect(await screen.findByText('No documents found matching your search.')).toBeInTheDocument()
  })

  it('searches documents using hybrid search after typing', async () => {
    window.api.db.search = vi.fn().mockResolvedValue({
      rows: [
        {
          document_id: '9',
          file_name: 'result.md',
          file_type: 'md',
          vault_path: '/vault/result.md',
          created_at: '2026-01-05T00:00:00Z',
          file_size: 100,
          content: 'found it'
        }
      ]
    })
    render(<MyLibrary />)
    await screen.findByText('alpha.md')
    const input = screen.getByPlaceholderText(/Search documents by name/i)
    fireEvent.change(input, { target: { value: 'found' } })
    expect(await screen.findByText('result.md')).toBeInTheDocument()
  })

  it('filters by file type', async () => {
    render(<MyLibrary />)
    await screen.findByText('alpha.md')
    fireEvent.click(screen.getAllByText('pdf')[0])
    await waitFor(() => {
      expect(screen.queryByText('alpha.md')).not.toBeInTheDocument()
    })
    expect(screen.getByText('beta.pdf')).toBeInTheDocument()
  })

  it('switches layout to list view', async () => {
    render(<MyLibrary />)
    await screen.findByText('alpha.md')
    const listBtn = screen.getByTitle('List View')
    fireEvent.click(listBtn)
    expect(listBtn.className).toContain('bg-[var(--bg-active)]')
    expect(window.api.config.set).toHaveBeenCalledWith('libraryLayout', 'list')
  })

  it('opens a document preview on click', async () => {
    render(<MyLibrary />)
    await screen.findByText('alpha.md')
    fireEvent.click(screen.getByText('alpha.md'))
    // Preview titlebar is rendered synchronously; content depends on lazy markdown load
    expect(await screen.findByText('alpha.md', {}, { timeout: 5000 })).toBeInTheDocument()
    expect(await screen.findByText('Alpha content', {}, { timeout: 5000 })).toBeInTheDocument()
  })

  it('sorts by name A-Z', async () => {
    render(<MyLibrary />)
    await screen.findByText('alpha.md')
    fireEvent.click(screen.getByText('Newest'))
    fireEvent.click(screen.getByText('A-Z'))
    expect(window.api.config.set).toHaveBeenCalledWith('librarySortOrder', 'az')
  })
})
