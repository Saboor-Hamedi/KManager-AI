import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import SidebarFooter from '../../../../src/renderer/src/components/SidebarFooter'

describe('SidebarFooter', () => {
  it('renders buttons', () => {
    render(<SidebarFooter collapsed={false} onOpenSettings={vi.fn()} onOpenTheme={vi.fn()} />)
    expect(screen.getByText('Appearance')).toBeInTheDocument()
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })

  it('calls onOpenTheme when Appearance clicked', () => {
    const onTheme = vi.fn()
    render(<SidebarFooter collapsed={false} onOpenSettings={vi.fn()} onOpenTheme={onTheme} />)
    fireEvent.click(screen.getByText('Appearance'))
    expect(onTheme).toHaveBeenCalledOnce()
  })

  it('calls onOpenSettings when Settings clicked', () => {
    const onSettings = vi.fn()
    render(<SidebarFooter collapsed={false} onOpenSettings={onSettings} onOpenTheme={vi.fn()} />)
    fireEvent.click(screen.getByText('Settings'))
    expect(onSettings).toHaveBeenCalledOnce()
  })
})
