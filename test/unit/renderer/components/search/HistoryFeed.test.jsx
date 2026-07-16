import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import HistoryFeed from '../../../../../src/renderer/src/components/search/HistoryFeed'

describe('HistoryFeed', () => {
  const defaultProps = {
    history: [],
    handleSelect: vi.fn(),
    activeReplyId: null,
    setActiveReplyId: vi.fn(),
    collapsedReplies: {},
    setCollapsedReplies: vi.fn(),
    submitFollowUp: vi.fn(),
    enableRag: true,
    handleSaveResponse: vi.fn(),
    savedResponses: {},
    setQuery: vi.fn(),
    textareaRef: { current: null }
  }

  it('renders empty state when no history', () => {
    render(<HistoryFeed {...defaultProps} />)
    expect(screen.getByText('Knowledge Management')).toBeInTheDocument()
    expect(screen.getByText('Ask anything across your entire knowledge base')).toBeInTheDocument()
  })

  it('renders suggestion buttons in empty state', () => {
    render(<HistoryFeed {...defaultProps} />)
    expect(screen.getByText('Summarize recent notes')).toBeInTheDocument()
    expect(screen.getByText('Find concepts in my vault')).toBeInTheDocument()
    expect(screen.getByText('Compare two topics')).toBeInTheDocument()
  })

  it('renders user message in history', () => {
    const props = {
      ...defaultProps,
      history: [{ id: '1', query: 'test query', results: [{ id: 'r1', content: 'test' }], isLoading: true }]
    }
    render(<HistoryFeed {...props} />)
    expect(screen.getByText('test query')).toBeInTheDocument()
  })
})
