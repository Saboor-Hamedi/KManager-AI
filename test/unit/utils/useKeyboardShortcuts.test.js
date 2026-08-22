import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import React from 'react'
import { useKeyboardShortcuts } from '../../../src/utils/useKeyboardShortcuts'

describe('useKeyboardShortcuts', () => {
  let handlers

  beforeEach(() => {
    handlers = {}
    window.addEventListener('keydown', (e) => {
      const key = e.key
      if (!handlers[key]) handlers[key] = []
      handlers[key].push(e)
    }, { capture: true })
  })

  afterEach(() => {
    handlers = {}
  })

  const dispatchKey = (key, opts = {}) => {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...opts })
    window.dispatchEvent(event)
    return event
  }

  it('calls onEscape when Escape is pressed', () => {
    const onEscape = vi.fn().mockReturnValue(true)
    renderHook(() => useKeyboardShortcuts({ onEscape }))
    dispatchKey('Escape')
    expect(onEscape).toHaveBeenCalled()
  })

  it('prevents default and stops propagation when onEscape returns true', () => {
    const onEscape = vi.fn().mockReturnValue(true)
    renderHook(() => useKeyboardShortcuts({ onEscape }))
    const ev = dispatchKey('Escape')
    expect(ev.defaultPrevented).toBe(true)
  })

  it('does not prevent default when onEscape returns false', () => {
    const onEscape = vi.fn().mockReturnValue(false)
    renderHook(() => useKeyboardShortcuts({ onEscape }))
    const ev = dispatchKey('Escape')
    expect(ev.defaultPrevented).toBe(false)
  })

  it('calls onSave on Ctrl+S', () => {
    const onSave = vi.fn()
    renderHook(() => useKeyboardShortcuts({ onSave }))
    dispatchKey('s', { ctrlKey: true })
    expect(onSave).toHaveBeenCalled()
  })

  it('does not call onSave with shift held', () => {
    const onSave = vi.fn()
    renderHook(() => useKeyboardShortcuts({ onSave }))
    dispatchKey('s', { ctrlKey: true, shiftKey: true })
    expect(onSave).not.toHaveBeenCalled()
  })

  it('calls onToggleSidebar on Ctrl+B', () => {
    const onToggleSidebar = vi.fn()
    renderHook(() => useKeyboardShortcuts({ onToggleSidebar }))
    dispatchKey('b', { ctrlKey: true })
    expect(onToggleSidebar).toHaveBeenCalled()
  })

  it('calls onTogglePalette on Ctrl+P', () => {
    const onTogglePalette = vi.fn()
    renderHook(() => useKeyboardShortcuts({ onTogglePalette }))
    dispatchKey('p', { ctrlKey: true })
    expect(onTogglePalette).toHaveBeenCalled()
  })

  it('calls onToggleTheme on Ctrl+T', () => {
    const onToggleTheme = vi.fn()
    renderHook(() => useKeyboardShortcuts({ onToggleTheme }))
    dispatchKey('t', { ctrlKey: true })
    expect(onToggleTheme).toHaveBeenCalled()
  })

  it('calls onInlineAI on Ctrl+K and stops propagation', () => {
    const onInlineAI = vi.fn().mockReturnValue(true)
    renderHook(() => useKeyboardShortcuts({ onInlineAI }))
    dispatchKey('k', { ctrlKey: true })
    expect(onInlineAI).toHaveBeenCalled()
  })

  it('unregisters the escape handler on unmount', () => {
    const onEscape = vi.fn()
    const { unmount } = renderHook(() => useKeyboardShortcuts({ onEscape }))
    unmount()
    dispatchKey('Escape')
    expect(onEscape).not.toHaveBeenCalled()
  })
})
