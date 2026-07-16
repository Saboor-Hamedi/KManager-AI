import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import SidebarHeader from '../../../../src/renderer/src/components/SidebarHeader'

describe('SidebarHeader', () => {
  it('renders KMANAGER text when expanded', () => {
    render(<SidebarHeader collapsed={false} />)
    expect(screen.getByText('KMANAGER')).toBeInTheDocument()
  })

  it('renders only logo when collapsed', () => {
    const { container } = render(<SidebarHeader collapsed={true} />)
    expect(screen.queryByText('KMANAGER')).not.toBeInTheDocument()
    expect(container.querySelector('.rounded-md')).toBeInTheDocument()
  })
})
