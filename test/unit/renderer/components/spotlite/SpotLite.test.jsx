import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import React from 'react'

// SpotLite mounts ChatBot inline, and ChatBot registers a module-level
// capture-phase Escape handler (useKeyboardShortcuts) that stops propagation,
// which would swallow SpotLite's own Escape listener in jsdom. Mock the hook
// so we test SpotLite's Escape handling in isolation.
vi.mock('../../../../../src/utils/useKeyboardShortcuts', () => ({
  useKeyboardShortcuts: () => {}
}))

import SpotLite from '../../../../../src/renderer/src/components/spotlite/SpotLite'

describe('SpotLite', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  const openSpotlite = async () => {
    render(<SpotLite />)
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
    await act(async () => {
      await new Promise((r) => setTimeout(r, 120))
    })
  }

  it('renders nothing when closed', () => {
    const { container } = render(<SpotLite />)
    expect(container.innerHTML).toBe('')
  })

  it('opens on Ctrl+K', async () => {
    await openSpotlite()
    expect(screen.getByPlaceholderText('Search your library...')).toBeInTheDocument()
    expect(screen.getByText('KManager SpotLite')).toBeInTheDocument()
  })

  it('opens on Cmd+K (meta key)', async () => {
    render(<SpotLite />)
    fireEvent.keyDown(window, { key: 'k', metaKey: true })
    await act(async () => {
      await new Promise((r) => setTimeout(r, 120))
    })
    expect(screen.getByPlaceholderText('Search your library...')).toBeInTheDocument()
  })

  it('shows search hint when no results', async () => {
    window.api.db.query = vi.fn().mockResolvedValue({ rows: [] })
    await openSpotlite()
    expect(screen.getByText('Type to search documents...')).toBeInTheDocument()
  })

  it('toggles mode to Ask AI', async () => {
    await openSpotlite()
    fireEvent.click(screen.getByText('Ask AI'))
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })
    expect(screen.getAllByText('KManager AI').length).toBeGreaterThanOrEqual(1)
  })

  it('closes on Escape', async () => {
    await openSpotlite()
    expect(screen.getByPlaceholderText('Search your library...')).toBeInTheDocument()
    await act(async () => {
      fireEvent.keyDown(window, { key: 'Escape' })
      await new Promise((r) => setTimeout(r, 0))
    })
    expect(screen.queryByPlaceholderText('Search your library...')).not.toBeInTheDocument()
  })

  it('shows results and preview when db.query returns documents', async () => {
    const mockDocs = {
      rows: [
        {
          document_id: 'd1',
          file_name: 'notes.md',
          file_type: 'md',
          vault_path: '/vault/notes.md',
          content: 'hello world',
          file_size: 1024,
          created_at: new Date().toISOString()
        }
      ]
    }
    window.api.db.query = vi.fn().mockResolvedValue(mockDocs)

    await openSpotlite()
    fireEvent.change(screen.getByPlaceholderText('Search your library...'), { target: { value: 'notes' } })
    await waitFor(() => {
      expect(screen.getByText('notes.md')).toBeInTheDocument()
    })
    expect(window.api.db.query).toHaveBeenCalled()
  })

  it('shows no results message for empty search', async () => {
    window.api.db.query = vi.fn().mockResolvedValue({ rows: [] })
    await openSpotlite()
    fireEvent.change(screen.getByPlaceholderText('Search your library...'), { target: { value: 'zzz' } })
    expect(await screen.findByText('No results found')).toBeInTheDocument()
  })
})
