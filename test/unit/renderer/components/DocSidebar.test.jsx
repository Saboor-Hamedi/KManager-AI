import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import DocSidebar from '../../../../src/renderer/src/components/DocSidebar'

describe('DocSidebar', () => {
  const docs = {
    GENERAL: [
      { title: 'Introduction', path: '/docs/introduction.md' },
      { title: 'Setup', path: '/docs/setup.md' }
    ],
    ADVANCED: [
      { title: 'Architecture', path: '/docs/architecture.md' }
    ]
  }

  const defaultProps = {
    docs,
    activeDoc: null,
    setActiveDoc: vi.fn(),
    searchQuery: '',
    setSearchQuery: vi.fn(),
    isSidebarOpen: true,
    setIsSidebarOpen: vi.fn()
  }

  beforeEach(() => {
    window.api.config.set = vi.fn().mockResolvedValue(true)
    window.api.config.get = vi.fn().mockResolvedValue({})
  })

  it('renders categories and document titles', () => {
    render(<DocSidebar {...defaultProps} />)
    expect(screen.getByText('GENERAL')).toBeInTheDocument()
    expect(screen.getByText('ADVANCED')).toBeInTheDocument()
    expect(screen.getByText('Introduction')).toBeInTheDocument()
    expect(screen.getByText('Setup')).toBeInTheDocument()
    expect(screen.getByText('Architecture')).toBeInTheDocument()
  })

  it('filters documents by search query', () => {
    render(<DocSidebar {...defaultProps} searchQuery="arch" />)
    expect(screen.queryByText('Introduction')).not.toBeInTheDocument()
    expect(screen.getByText('Architecture')).toBeInTheDocument()
  })

  it('shows empty state when no documents match', () => {
    render(<DocSidebar {...defaultProps} searchQuery="zzz" />)
    expect(screen.getByText(/No documents found/)).toBeInTheDocument()
  })

  it('calls setActiveDoc when a document is clicked', () => {
    const setActiveDoc = vi.fn()
    render(<DocSidebar {...defaultProps} setActiveDoc={setActiveDoc} />)
    fireEvent.click(screen.getByText('Setup'))
    expect(setActiveDoc).toHaveBeenCalledWith({ title: 'Setup', path: '/docs/setup.md' })
  })

  it('collapses a category and saves state to config', () => {
    const configSet = vi.fn().mockResolvedValue(true)
    window.api.config.set = configSet
    const { container } = render(<DocSidebar {...defaultProps} />)
    fireEvent.click(screen.getByText('GENERAL'))
    expect(container.querySelector('.max-h-0')).toBeInTheDocument()
    expect(configSet).toHaveBeenCalledWith('docCategoriesState', { GENERAL: true })
  })

  it('does not collapse categories while searching', () => {
    const { container } = render(<DocSidebar {...defaultProps} searchQuery="intro" />)
    fireEvent.click(screen.getByText('GENERAL'))
    expect(container.querySelector('.max-h-0')).not.toBeInTheDocument()
  })

  it('calls setSearchQuery when typing in the search box', () => {
    const setSearchQuery = vi.fn()
    render(<DocSidebar {...defaultProps} setSearchQuery={setSearchQuery} />)
    fireEvent.change(screen.getByPlaceholderText('Search documentation...'), { target: { value: 'intro' } })
    expect(setSearchQuery).toHaveBeenCalledWith('intro')
  })

  it('shows search input with empty state message when sidebar is closed', () => {
    const { container } = render(<DocSidebar {...defaultProps} isSidebarOpen={false} />)
    expect(container.querySelector('.w-0')).not.toBeNull()
  })
})
