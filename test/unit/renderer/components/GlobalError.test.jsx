import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import GlobalError from '../../../../src/renderer/src/components/GlobalError'

describe('GlobalError', () => {
  it('renders children when no error', () => {
    render(
      <GlobalError>
        <div data-testid="child">Safe content</div>
      </GlobalError>
    )
    expect(screen.getByTestId('child')).toBeInTheDocument()
    expect(screen.queryByText('System Error')).not.toBeInTheDocument()
  })

  it('renders error UI when child throws', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const Thrower = () => { throw new Error('Test crash') }
    render(
      <GlobalError>
        <Thrower />
      </GlobalError>
    )
    expect(screen.getByText('System Error')).toBeInTheDocument()
    expect(screen.getByText('Error Details')).toBeInTheDocument()
    const textarea = screen.getByRole('textbox')
    expect(textarea).toBeInTheDocument()
    expect(textarea.textContent).toContain('Test crash')
    expect(screen.getByText('Try Again')).toBeInTheDocument()
    console.error.mockRestore()
  })

  it('displays error message and stack trace in textarea', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const Thrower = () => { throw new Error('Stack test') }
    render(
      <GlobalError>
        <Thrower />
      </GlobalError>
    )
    const ta = screen.getByRole('textbox')
    expect(ta.textContent).toContain('Stack test')
    expect(ta.textContent).toContain('at Thrower')
    console.error.mockRestore()
  })

  it('replaces children with error UI on throw, children not rendered', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const Thrower = () => { throw new Error('Hidden') }
    render(
      <GlobalError>
        <div data-testid="child">Visible</div>
        <Thrower />
      </GlobalError>
    )
    expect(screen.queryByTestId('child')).not.toBeInTheDocument()
    expect(screen.getByText('System Error')).toBeInTheDocument()
    console.error.mockRestore()
  })
})
