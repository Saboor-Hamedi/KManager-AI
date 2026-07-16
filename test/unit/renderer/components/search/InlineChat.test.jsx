import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import InlineChat from '../../../../../src/renderer/src/components/search/InlineChat'

describe('InlineChat', () => {
  const baseProps = {
    resultId: 'test-result',
    msg: { id: 'msg1', replies: [] },
    activeReplyId: null,
    compositeId: 'msg1-0',
    collapsedReplies: {},
    setCollapsedReplies: vi.fn(),
    submitFollowUp: vi.fn(),
    showForm: true
  }

  it('renders nothing when no replies and form hidden', () => {
    const { container } = render(<InlineChat {...baseProps} showForm={false} />)
    expect(container.innerHTML).toBe('')
  })

  it('renders reply form when active', () => {
    render(<InlineChat {...baseProps} activeReplyId="msg1-0" />)
    expect(screen.getByPlaceholderText('Ask a question about this...')).toBeInTheDocument()
  })

  it('shows reply count when replies exist', () => {
    const props = {
      ...baseProps,
      msg: {
        id: 'msg1',
        replies: [
          { id: 'r1', resultId: 'test-result', query: 'test?', ragStatus: 'done', ragAnswer: 'answer' }
        ]
      }
    }
    render(<InlineChat {...props} />)
    expect(screen.getByText('1 Reply')).toBeInTheDocument()
  })

  it('shows "Replying..." when generating', () => {
    const props = {
      ...baseProps,
      msg: {
        id: 'msg1',
        replies: [
          { id: 'r2', resultId: 'test-result', query: 'test?', ragStatus: 'generating', ragAnswer: '' }
        ]
      }
    }
    render(<InlineChat {...props} />)
    expect(screen.getByText('Replying...')).toBeInTheDocument()
  })
})
