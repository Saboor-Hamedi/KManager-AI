import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import DocHeader from '../../../../src/renderer/src/components/DocHeader'

describe('DocHeader', () => {
  it('renders Documentation title', () => {
    render(<DocHeader isSidebarOpen={true} onToggleSidebar={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByText('Documentation')).toBeInTheDocument()
  })

  it('calls onToggleSidebar when toggle button clicked', () => {
    const onToggleSidebar = vi.fn()
    render(<DocHeader isSidebarOpen={true} onToggleSidebar={onToggleSidebar} onClose={vi.fn()} />)
    fireEvent.click(screen.getByTitle('Toggle Sidebar'))
    expect(onToggleSidebar).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn()
    render(<DocHeader isSidebarOpen={true} onToggleSidebar={vi.fn()} onClose={onClose} />)
    fireEvent.click(screen.getByTitle('Close (Esc)'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('renders a close icon regardless of sidebar state', () => {
    render(<DocHeader isSidebarOpen={false} onToggleSidebar={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByTitle('Toggle Sidebar')).toBeInTheDocument()
    expect(screen.getByTitle('Close (Esc)')).toBeInTheDocument()
  })
})
