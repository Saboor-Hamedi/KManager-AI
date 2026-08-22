import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import PulseLoader from '../../../../src/renderer/src/components/PulseLoader'

describe('PulseLoader', () => {
  it('renders three dots', () => {
    const { container } = render(<PulseLoader />)
    expect(container.querySelectorAll('.rounded-full').length).toBe(3)
  })

  it('renders text label', () => {
    render(<PulseLoader text="Loading Document" />)
    expect(screen.getByText('Loading Document')).toBeInTheDocument()
  })

  it('uses small dot class for sm size', () => {
    const { container } = render(<PulseLoader size="sm" />)
    const dots = container.querySelectorAll('.rounded-full')
    expect(dots[0].className).toContain('w-1.5')
  })

  it('uses default md dot class', () => {
    const { container } = render(<PulseLoader />)
    const dots = container.querySelectorAll('.rounded-full')
    expect(dots[0].className).toContain('w-2')
  })

  it('applies custom className', () => {
    render(<PulseLoader text="x" className="my-custom" />)
    expect(screen.getByText('x').closest('div').className).toContain('my-custom')
  })
})
