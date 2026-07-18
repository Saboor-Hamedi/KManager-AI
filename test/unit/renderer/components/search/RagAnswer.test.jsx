import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import RagAnswer from '../../../../../src/renderer/src/components/search/RagAnswer'

vi.mock('../../../../../src/renderer/src/components/search/DocumentRenderer', () => ({
  default: ({ content }) => <div data-testid="document-renderer">{content}</div>
}))

vi.mock('../../../../../src/renderer/src/components/search/SuggestedPrompts', () => ({
  default: ({ msg, onSelectPrompt }) => (
    <div data-testid="suggested-prompts">
      <button onClick={() => onSelectPrompt('test prompt')}>Suggested Prompt</button>
    </div>
  )
}))

vi.mock('../../../../../src/renderer/src/components/search/InlineChat', () => ({
  default: () => <div data-testid="inline-chat" />
}))

describe('RagAnswer', () => {
  const baseProps = {
    msg: { id: 'msg1', query: 'test query', ragAnswer: '', ragStatus: 'generating', results: [{ id: 'r1' }, { id: 'r2' }] },
    handleSaveResponse: vi.fn(),
    savedResponses: {},
    setQuery: vi.fn(),
    textareaRef: { current: null },
    activeReplyId: null,
    setActiveReplyId: vi.fn(),
    collapsedReplies: {},
    setCollapsedReplies: vi.fn(),
    submitFollowUp: vi.fn()
  }

  it('returns null when ragStatus is undefined', () => {
    const { container } = render(<RagAnswer {...baseProps} msg={{ id: 'm1', query: 'q' }} />)
    expect(container.innerHTML).toBe('')
  })

  it('returns null when ragStatus is disabled', () => {
    const { container } = render(<RagAnswer {...baseProps} msg={{ id: 'm1', query: 'q', ragStatus: 'disabled' }} />)
    expect(container.innerHTML).toBe('')
  })

  it('shows synthesizing indicator when generating and no answer yet', () => {
    render(<RagAnswer {...baseProps} />)
    expect(screen.getByText(/Synthesizing answer from 2 sources/)).toBeInTheDocument()
  })

  it('shows synthesizing with correct source count', () => {
    render(<RagAnswer {...baseProps} msg={{ ...baseProps.msg, results: [{ id: 'r1' }] }} />)
    expect(screen.getByText(/Synthesizing answer from 1 source/)).toBeInTheDocument()
  })

  it('shows 0 sources when results is empty', () => {
    render(<RagAnswer {...baseProps} msg={{ ...baseProps.msg, results: [] }} />)
    expect(screen.getByText(/Synthesizing answer from 0 sources/)).toBeInTheDocument()
  })

  it('shows 0 sources when results is undefined', () => {
    render(<RagAnswer {...baseProps} msg={{ ...baseProps.msg, results: undefined }} />)
    expect(screen.getByText(/Synthesizing answer from 0 sources/)).toBeInTheDocument()
  })

  it('renders ragAnswer text when present', () => {
    render(<RagAnswer {...baseProps} msg={{ ...baseProps.msg, ragAnswer: 'PSA is a biomarker for prostate cancer.' }} />)
    expect(screen.getByText('PSA is a biomarker for prostate cancer.')).toBeInTheDocument()
  })

  it('renders pulsing cursor when generating with partial answer', () => {
    const { container } = render(
      <RagAnswer {...baseProps} msg={{ ...baseProps.msg, ragAnswer: 'Partial answer' }} />
    )
    expect(screen.getByText('Partial answer')).toBeInTheDocument()
  })

  it('shows Save button when ragStatus is done', () => {
    render(
      <RagAnswer {...baseProps} msg={{ ...baseProps.msg, ragStatus: 'done', ragAnswer: 'Final answer.' }} />
    )
    expect(screen.getByText('Save')).toBeInTheDocument()
  })

  it('shows Saved to Knowledge Base when save succeeded', () => {
    render(
      <RagAnswer
        {...baseProps}
        msg={{ ...baseProps.msg, ragStatus: 'done', ragAnswer: 'Final answer.' }}
        savedResponses={{ msg1: 'saved' }}
      />
    )
    expect(screen.getByText('Saved to Knowledge Base')).toBeInTheDocument()
  })

  it('shows Saving... with spinner when saving in progress', () => {
    render(
      <RagAnswer
        {...baseProps}
        msg={{ ...baseProps.msg, ragStatus: 'done', ragAnswer: 'Final answer.' }}
        savedResponses={{ msg1: 'saving' }}
      />
    )
    expect(screen.getByText('Saving...')).toBeInTheDocument()
  })

  it('disables Save button when saving or saved', () => {
    const { rerender } = render(
      <RagAnswer
        {...baseProps}
        msg={{ ...baseProps.msg, ragStatus: 'done', ragAnswer: 'Answer.' }}
        savedResponses={{ msg1: 'saving' }}
      />
    )
    expect(screen.getByText('Saving...').closest('button')).toBeDisabled()

    rerender(
      <RagAnswer
        {...baseProps}
        msg={{ ...baseProps.msg, ragStatus: 'done', ragAnswer: 'Answer.' }}
        savedResponses={{ msg1: 'saved' }}
      />
    )
    expect(screen.getByText('Saved to Knowledge Base').closest('button')).toBeDisabled()
  })

  it('calls handleSaveResponse with msg id, query, and answer on Save click', () => {
    const handleSaveResponse = vi.fn()
    render(
      <RagAnswer
        {...baseProps}
        msg={{ ...baseProps.msg, ragStatus: 'done', ragAnswer: 'The answer.' }}
        handleSaveResponse={handleSaveResponse}
      />
    )
    fireEvent.click(screen.getByText('Save'))
    expect(handleSaveResponse).toHaveBeenCalledWith('msg1', 'test query', 'The answer.')
  })

  it('renders error state with ragError message', () => {
    render(
      <RagAnswer {...baseProps} msg={{ ...baseProps.msg, ragStatus: 'error', ragError: 'API key missing' }} />
    )
    expect(screen.getByText(/RAG Synthesis failed/)).toBeInTheDocument()
    expect(screen.getByText(/API key missing/)).toBeInTheDocument()
  })

  it('shows SuggestedPrompts and InlineChat in done state', () => {
    render(
      <RagAnswer {...baseProps} msg={{ ...baseProps.msg, ragStatus: 'done', ragAnswer: 'Done.' }} />
    )
    expect(screen.getByTestId('suggested-prompts')).toBeInTheDocument()
    expect(screen.getByTestId('inline-chat')).toBeInTheDocument()
  })

  it('calls setQuery and focuses textarea when prompt selected', () => {
    const setQuery = vi.fn()
    const textareaRef = { current: document.createElement('textarea') }
    render(
      <RagAnswer
        {...baseProps}
        msg={{ ...baseProps.msg, ragStatus: 'done', ragAnswer: 'Done.' }}
        setQuery={setQuery}
        textareaRef={textareaRef}
      />
    )
    fireEvent.click(screen.getByText('Suggested Prompt'))
    expect(setQuery).toHaveBeenCalledWith('test prompt')
  })

  it('does not show suggested prompts or inline chat when not done', () => {
    const { rerender } = render(<RagAnswer {...baseProps} />)
    expect(screen.queryByTestId('suggested-prompts')).not.toBeInTheDocument()
    expect(screen.queryByTestId('inline-chat')).not.toBeInTheDocument()

    rerender(
      <RagAnswer {...baseProps} msg={{ ...baseProps.msg, ragStatus: 'generating', ragAnswer: 'Partial' }} />
    )
    expect(screen.queryByTestId('suggested-prompts')).not.toBeInTheDocument()
  })

  it('does not show save button when still generating', () => {
    render(
      <RagAnswer {...baseProps} msg={{ ...baseProps.msg, ragAnswer: 'Partial answer.' }} />
    )
    expect(screen.queryByText('Save')).not.toBeInTheDocument()
  })
})
