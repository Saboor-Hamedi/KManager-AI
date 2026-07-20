import { describe, it, expect, vi } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'
import React from 'react'
import ChatBot from '../../../../src/renderer/src/components/ChatBot'

describe('ChatBot', () => {
  async function openChat() {
    await act(async () => render(<ChatBot />))
    fireEvent.click(screen.getByTitle('Open Assistant'))
  }

  it('renders welcome heading', async () => {
    await openChat()
    expect(screen.getByText('KManager AI')).toBeInTheDocument()
  })

  it('renders suggestion buttons', async () => {
    await openChat()
    expect(screen.getByRole('button', { name: 'Summarize key insights across documents' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Find core concepts and definitions' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Compare two related topics' })).toBeInTheDocument()
  })
})
