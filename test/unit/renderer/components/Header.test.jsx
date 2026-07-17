import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import Header from '../../../../src/renderer/src/components/Header'

describe('Header', () => {
  it('renders breadcrumb', () => {
    render(<Header toggleSidebar={() => {}} collapsed={false} />)
    expect(screen.getByText('Knowledge Base')).toBeInTheDocument()
    expect(screen.getByText('Search & Explore')).toBeInTheDocument()
  })

  it('calls toggleSidebar when sidebar button clicked', () => {
    const toggle = vi.fn()
    render(<Header toggleSidebar={toggle} collapsed={false} />)
    fireEvent.click(screen.getByTitle('Toggle sidebar (Ctrl+B)'))
    expect(toggle).toHaveBeenCalledOnce()
  })
})
