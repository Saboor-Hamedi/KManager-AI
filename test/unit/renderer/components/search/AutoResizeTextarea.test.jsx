import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import AutoResizeTextarea from '../../../../../src/renderer/src/components/search/AutoResizeTextarea'

describe('AutoResizeTextarea', () => {
  it('renders a textarea with the given value', () => {
    render(<AutoResizeTextarea value="hello" onChange={vi.fn()} />)
    expect(screen.getByRole('textbox')).toHaveValue('hello')
  })

  it('calls onChange when text changes', () => {
    const onChange = vi.fn()
    render(<AutoResizeTextarea value="" onChange={onChange} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'new' } })
    expect(onChange).toHaveBeenCalled()
  })

  it('respects disabled and readOnly props', () => {
    render(<AutoResizeTextarea value="x" onChange={vi.fn()} disabled readOnly />)
    const ta = screen.getByRole('textbox')
    expect(ta).toBeDisabled()
    expect(ta).toHaveAttribute('readonly')
  })

  it('renders a mirror element for auto-height', () => {
    const { container } = render(<AutoResizeTextarea value="mirror text" onChange={vi.fn()} />)
    const mirror = container.querySelector('[aria-hidden="true"]')
    expect(mirror).toBeInTheDocument()
    expect(mirror.textContent).toContain('mirror text')
  })

  it('applies min and max height styles', () => {
    render(<AutoResizeTextarea value="" onChange={vi.fn()} minHeight="80px" maxHeight="200px" />)
    const wrapper = screen.getByRole('textbox').closest('div')
    expect(wrapper.style.minHeight).toBe('80px')
    expect(wrapper.style.maxHeight).toBe('200px')
  })
})
