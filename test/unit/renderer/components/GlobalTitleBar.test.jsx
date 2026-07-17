import { describe, it, expect } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'
import React from 'react'
import GlobalTitleBar from '../../../../src/renderer/src/components/GlobalTitleBar'

describe('GlobalTitleBar', () => {
  it('renders app name', async () => {
    await act(async () => render(<GlobalTitleBar />))
    expect(screen.getByText('KManager AI')).toBeInTheDocument()
  })

  it('renders window control buttons', async () => {
    await act(async () => render(<GlobalTitleBar />))
    expect(screen.getByTitle('Minimize')).toBeInTheDocument()
    expect(screen.getByTitle('Maximize')).toBeInTheDocument()
    expect(screen.getByTitle('Close')).toBeInTheDocument()
  })
})
