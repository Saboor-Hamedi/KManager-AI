import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import DashboardSearch from '../../../../../src/renderer/src/components/search/DashboardSearch'

const makeRow = (overrides = {}) => ({
  id: 'r1',
  document_id: 'd1',
  file_type: 'md',
  file_name: 'Test Doc.md',
  content: 'The test query matches this document content.',
  similarity: 0.9,
  vault_path: '/docs/test.md',
  created_at: '2026-01-01T00:00:00.000Z',
  ...overrides
})

describe('DashboardSearch', () => {
  let mockSearch
  let mockLexicalSearch
  let mockConfigSet

  beforeEach(() => {
    mockSearch = vi.fn().mockResolvedValue({ success: true, rows: [makeRow()] })
    mockLexicalSearch = vi.fn().mockResolvedValue([])
    mockConfigSet = vi.fn().mockResolvedValue(true)

    window.api.config.get = vi.fn((key, def) => {
      if (key === 'ENABLE_RAG') return Promise.resolve(false)
      if (key === 'ACTIVE_LLM_PROVIDER') return Promise.resolve('deepseek')
      if (key === 'DEEPSEEK_API_KEY') return Promise.resolve('')
      if (key === 'SEARCH_RESULT_LIMIT') return Promise.resolve('3')
      return Promise.resolve(def)
    })
    window.api.config.set = mockConfigSet
    window.api.db.search = mockSearch
    window.api.db.lexicalSearch = mockLexicalSearch
    window.api.db.getStats = vi.fn().mockResolvedValue({ success: true, stats: {} })
    window.api.db.query = vi.fn().mockResolvedValue({ rows: [] })
    window.electron.ipcRenderer = {
      invoke: vi.fn().mockResolvedValue({ connected: true })
    }
  })

  it('renders the empty state with suggestions', async () => {
    await act(async () => {
      render(<DashboardSearch />)
    })
    expect(await screen.findByText('Knowledge Management')).toBeInTheDocument()
    expect(screen.getByText('Ask anything across your entire knowledge base')).toBeInTheDocument()
    expect(screen.getByText('Summarize key insights across documents')).toBeInTheDocument()
    expect(screen.getByText('Find core concepts and definitions')).toBeInTheDocument()
    expect(screen.getByText('Compare two related topics')).toBeInTheDocument()
  })

  it('updates the search input value when typing', async () => {
    await act(async () => {
      render(<DashboardSearch />)
    })
    await screen.findByText('Knowledge Management')
    const textarea = screen.getByPlaceholderText(/Ask anything across your knowledge base/i)
    fireEvent.change(textarea, { target: { value: 'database' } })
    expect(textarea.value).toBe('database')
  })

  it('fills the search input when a suggestion button is clicked', async () => {
    await act(async () => {
      render(<DashboardSearch />)
    })
    await screen.findByText('Knowledge Management')
    fireEvent.click(screen.getByText('Find core concepts and definitions'))
    const textarea = screen.getByPlaceholderText(/Ask anything across your knowledge base/i)
    expect(textarea.value).toBe('Find core concepts and definitions')
  })

  it('submits a search on Enter and renders results list', async () => {
    await act(async () => {
      render(<DashboardSearch />)
    })
    await screen.findByText(/AI Answers: Off/)
    const textarea = screen.getByPlaceholderText(/Ask anything across your knowledge base/i)
    fireEvent.change(textarea, { target: { value: 'test query' } })
    fireEvent.keyDown(textarea, { key: 'Enter' })
    expect(await screen.findByText('test query')).toBeInTheDocument()
    expect(await screen.findByText('Test Doc.md')).toBeInTheDocument()
    expect(mockSearch).toHaveBeenCalledWith('test query', 12)
  })

  it('submits a search via the send button', async () => {
    await act(async () => {
      render(<DashboardSearch />)
    })
    await screen.findByText(/AI Answers: Off/)
    const textarea = screen.getByPlaceholderText(/Ask anything across your knowledge base/i)
    fireEvent.change(textarea, { target: { value: 'send via button' } })
    fireEvent.click(screen.getByTitle('Send message'))
    expect(await screen.findByText('send via button')).toBeInTheDocument()
    expect(mockSearch).toHaveBeenCalledWith('send via button', 12)
  })

  it('shows empty results state when search returns no rows', async () => {
    mockSearch.mockResolvedValue({ success: true, rows: [] })
    await act(async () => {
      render(<DashboardSearch />)
    })
    await screen.findByText(/AI Answers: Off/)
    const textarea = screen.getByPlaceholderText(/Ask anything across your knowledge base/i)
    fireEvent.change(textarea, { target: { value: 'nothing found' } })
    fireEvent.keyDown(textarea, { key: 'Enter' })
    expect(await screen.findByText('nothing found')).toBeInTheDocument()
  })

  it('closes the reference modal on Escape', async () => {
    await act(async () => {
      render(<DashboardSearch />)
    })
    await screen.findByText('Knowledge Management')
    await act(async () => {
      window.__openCitationPreviewModal({
        id: 'r1',
        document_id: 'd1',
        category: 'MD',
        title: 'Doc Title',
        content: 'Some content',
        vault_path: '/docs/doc.md'
      })
    })
    expect(screen.getByText('Doc Title')).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByText('Library')).not.toBeInTheDocument())
  })

  it('navigates autocomplete with arrow keys and selects on Enter', async () => {
    mockLexicalSearch.mockResolvedValue([
      { id: 1, document_id: 1, file_name: 'notes.md', content: 'The database schema is documented in the schema guide.' }
    ])
    let container
    await act(async () => {
      ({ container } = render(<DashboardSearch />))
    })
    await screen.findByText('Knowledge Management')
    const textarea = screen.getByPlaceholderText(/Ask anything across your knowledge base/i)
    fireEvent.change(textarea, { target: { value: 'database' } })
    await new Promise(r => setTimeout(r, 300))
    await act(async () => {})
    expect(container.querySelector('[class*="bottom-full"]')).not.toBeNull()
    expect(mockLexicalSearch).toHaveBeenCalledWith('database', 20)
    fireEvent.keyDown(textarea, { key: 'ArrowDown' })
    fireEvent.keyDown(textarea, { key: 'Enter' })
    await act(async () => {})
    expect(textarea.value).toContain('database schema is documented')
  })

  it('shows confirm dialog on new-session-intent and clears history', async () => {
    await act(async () => {
      render(<DashboardSearch />)
    })
    await screen.findByText(/AI Answers: Off/)
    const textarea = screen.getByPlaceholderText(/Ask anything across your knowledge base/i)
    fireEvent.change(textarea, { target: { value: 'test query' } })
    fireEvent.keyDown(textarea, { key: 'Enter' })
    await screen.findByText('Test Doc.md')
    window.dispatchEvent(new Event('new-session-intent'))
    expect(await screen.findByText(/Your current chat will be cleared/)).toBeInTheDocument()
    fireEvent.click(screen.getByText('New Session'))
    await waitFor(() => expect(screen.getByText('Knowledge Management')).toBeInTheDocument())
  })

  it('clears the query when a new-session event is dispatched', async () => {
    await act(async () => {
      render(<DashboardSearch />)
    })
    await screen.findByText('Knowledge Management')
    const textarea = screen.getByPlaceholderText(/Ask anything across your knowledge base/i)
    fireEvent.change(textarea, { target: { value: 'draft query' } })
    window.dispatchEvent(new Event('new-session'))
    await waitFor(() => expect(textarea.value).toBe(''))
  })

  it('toggles RAG and saves the setting', async () => {
    await act(async () => {
      render(<DashboardSearch />)
    })
    await screen.findByText(/AI Answers: Off/)
    fireEvent.click(screen.getByText(/AI Answers: Off/))
    await waitFor(() => expect(mockConfigSet).toHaveBeenCalledWith('ENABLE_RAG', true))
    expect(screen.getByText(/AI Answers: On/)).toBeInTheDocument()
  })
})
