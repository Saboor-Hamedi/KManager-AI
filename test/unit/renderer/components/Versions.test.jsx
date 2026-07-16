import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import Versions from '../../../../src/renderer/src/components/Versions'

describe('Versions', () => {
  it('renders Electron version', () => {
    render(<Versions />)
    expect(screen.getByText(/Electron/)).toBeInTheDocument()
  })

  it('renders Chrome version', () => {
    render(<Versions />)
    expect(screen.getByText(/Chromium/)).toBeInTheDocument()
  })

  it('renders Node version', () => {
    render(<Versions />)
    expect(screen.getByText(/Node/)).toBeInTheDocument()
  })
})
