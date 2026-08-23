import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import React from 'react'
import ChatBot from '../../../../src/renderer/src/components/ChatBot'

describe('ChatBot', () => {
  beforeEach(() => {
    // Suggestions are picked randomly (3 of 8); stabilize selection for assertions
    vi.spyOn(Math, 'random').mockReturnValue(0)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  async function openChat() {
    await act(async () => render(<ChatBot inline />))
  }

  it('renders welcome heading', async () => {
    await openChat()
    expect(screen.getByText('KManager AI')).toBeInTheDocument()
  })

  it('renders three suggestion buttons', async () => {
    await openChat()
    expect(screen.getAllByText(/Summarize|Find core|Compare two/).length).toBe(3)
  })

  it('renders suggestion prompt text', async () => {
    await openChat()
    expect(screen.getByText('Summarize key insights across documents')).toBeInTheDocument()
  })
})
