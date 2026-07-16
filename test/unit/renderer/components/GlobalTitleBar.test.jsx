import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import GlobalTitleBar from '../../../../src/renderer/src/components/GlobalTitleBar'

describe('GlobalTitleBar', () => {
  it('renders app name', () => {
    render(<GlobalTitleBar />)
    expect(screen.getByText('KManager AI')).toBeInTheDocument()
  })

  it('renders subtitle', () => {
    render(<GlobalTitleBar />)
    expect(screen.getByText('Knowledge Management Studio')).toBeInTheDocument()
  })

  it('renders window control buttons', () => {
    render(<GlobalTitleBar />)
    expect(screen.getByTitle('Minimize')).toBeInTheDocument()
    expect(screen.getByTitle('Maximize')).toBeInTheDocument()
    expect(screen.getByTitle('Close')).toBeInTheDocument()
  })
})
