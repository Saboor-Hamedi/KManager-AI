import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, afterEach } from 'vitest'
import Wrapper from '../../src/renderer/src/components/code/Wrapper'

describe('Wrapper Component', () => {
  afterEach(() => {
    delete HTMLElement.prototype.scrollHeight
  })

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
    const innerWrapper = container.querySelector('.transition-\\[max-height\\]')
    expect(innerWrapper).toBeInTheDocument()
    expect(innerWrapper).toHaveClass('overflow-hidden')
  })

  it('shows See more button when content overflows', () => {
    // Simulate a tall inner content node so the overflow check triggers
    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
      configurable: true,
      value: 1000
    })
    const { container } = render(
      <Wrapper maxHeight={10}>
        <div>Lots of content here</div>
      </Wrapper>
    )
    expect(screen.getByText('See more')).toBeInTheDocument()
    expect(container.querySelector('.absolute.bottom-0')).toBeInTheDocument()
  })

  it('expands and collapses when See more / Show less is clicked', async () => {
    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
      configurable: true,
      value: 1000
    })
    render(
      <Wrapper maxHeight={10}>
        <div>Lots of content here</div>
      </Wrapper>
    )
    fireEvent.click(screen.getByText('See more'))
    expect(screen.getByText('Show less')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Show less'))
    expect(screen.getByText('See more')).toBeInTheDocument()
  })
})
