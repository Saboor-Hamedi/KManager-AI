import { describe, it, expect } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import React from 'react'
import ScrollToTopButton from '../../../../src/renderer/src/components/ScrollToTopButton'

describe('ScrollToTopButton', () => {
  it('renders hidden initially', () => {
    const { container } = render(<ScrollToTopButton />)
    const btn = container.querySelector('button')
    expect(btn).toHaveClass('opacity-0')
    expect(btn).toHaveClass('pointer-events-none')
  })

  it('becomes visible when scroll position exceeds 100', () => {
    const { container } = render(<ScrollToTopButton />)
    const btn = container.querySelector('button')
    const parent = btn.parentElement

    Object.defineProperty(parent, 'scrollTop', { configurable: true, value: 200 })
    fireEvent.scroll(parent)
    expect(btn).toHaveClass('opacity-100')
    expect(btn).toHaveClass('pointer-events-auto')
  })

  it('stays hidden when scroll position is low', () => {
    const { container } = render(<ScrollToTopButton />)
    const btn = container.querySelector('button')
    const parent = btn.parentElement

    Object.defineProperty(parent, 'scrollTop', { configurable: true, value: 10 })
    fireEvent.scroll(parent)
    expect(btn).toHaveClass('opacity-0')
  })

  it('scrolls container to top on click', () => {
    const { container } = render(<ScrollToTopButton />)
    const btn = container.querySelector('button')
    const parent = btn.parentElement
    const scroller = document.createElement('div')
    scroller.className = 'overflow-y-auto'
    scroller.scrollTo = vi.fn()
    parent.appendChild(scroller)

    Object.defineProperty(parent, 'scrollTop', { configurable: true, value: 200 })
    fireEvent.scroll(parent)
    fireEvent.click(btn)
    expect(scroller.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
  })
})
