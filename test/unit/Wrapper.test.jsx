import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import Wrapper from '../../src/renderer/src/components/code/Wrapper'

describe('Wrapper Component', () => {
  it('renders children correctly', () => {
    render(
      <Wrapper>
        <div data-testid="child">Test Content</div>
      </Wrapper>
    )
    expect(screen.getByTestId('child')).toBeInTheDocument()
    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })

  it('renders with correct default classNames', () => {
    const { container } = render(
      <Wrapper>
        <div>Test</div>
      </Wrapper>
    )
    // Check if the relative wrapper is present
    expect(container.firstChild).toHaveClass('relative w-full')
    
    // Check if the transition container is present
    const innerWrapper = container.querySelector('.transition-all')
    expect(innerWrapper).toBeInTheDocument()
    expect(innerWrapper).toHaveClass('overflow-hidden')
  })
})
