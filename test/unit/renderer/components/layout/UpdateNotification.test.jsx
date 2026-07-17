import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import UpdateNotification from '../../../../../src/renderer/src/components/layout/UpdateNotification'

describe('UpdateNotification', () => {
  it('renders nothing in idle state', () => {
    const { container } = render(<UpdateNotification />)
    expect(container.innerHTML).toBe('')
  })
})
