import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import ChatBot from '../../../../src/renderer/src/components/ChatBot'

describe('ChatBot', () => {
  it('starts with welcome message', () => {
    render(<ChatBot />)
    expect(screen.getByText('Hello. How can I help you?')).toBeInTheDocument()
  })
})
