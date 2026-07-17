import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import ChatBot from '../../../../src/renderer/src/components/ChatBot'

describe('ChatBot', () => {
  it('renders welcome heading', () => {
    render(<ChatBot />)
    expect(screen.getByText('KManager AI')).toBeInTheDocument()
  })

  it('renders suggestion buttons', () => {
    render(<ChatBot />)
    expect(screen.getByText('How do I search my documents?')).toBeInTheDocument()
    expect(screen.getByText('What can KManager AI do?')).toBeInTheDocument()
    expect(screen.getByText('How do I connect to a database?')).toBeInTheDocument()
  })
})
