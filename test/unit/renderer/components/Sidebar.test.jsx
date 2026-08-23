import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import Sidebar from '../../../../src/renderer/src/components/Sidebar'

describe('Sidebar', () => {
  const defaultProps = {
    activeTab: 'search',
    setActiveTab: vi.fn(),
    onOpenSettings: vi.fn(),
    onOpenTheme: vi.fn(),
    onOpenDocs: vi.fn(),
    onOpenAnalytics: vi.fn(),
    collapsed: false,
    toggleCollapsed: vi.fn()
  }

  it('renders all main navigation items', () => {
    render(<Sidebar {...defaultProps} />)
    expect(screen.getByText('Search')).toBeInTheDocument()
    expect(screen.getByText('Analytics')).toBeInTheDocument()
  })

  it('renders footer buttons', () => {
    render(<Sidebar {...defaultProps} />)
    expect(screen.getByText('Appearance')).toBeInTheDocument()
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })

  it('renders branding', () => {
    render(<Sidebar {...defaultProps} />)
    expect(screen.getByText('KMANAGER')).toBeInTheDocument()
  })

  it('hides labels when collapsed', () => {
    render(<Sidebar {...defaultProps} collapsed={true} />)
    expect(screen.getByText('Search').closest('div')).toHaveClass('opacity-0')
    expect(screen.getByText('Analytics').closest('div')).toHaveClass('opacity-0')
  })
})
