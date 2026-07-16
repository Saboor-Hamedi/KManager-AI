import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import UsersView from '../../../../../src/renderer/src/components/users/UsersView'

describe('UsersView', () => {
  it('renders search input', () => {
    render(<UsersView />)
    expect(screen.getByPlaceholderText('Search users...')).toBeInTheDocument()
  })

  it('renders Add User button', () => {
    render(<UsersView />)
    expect(screen.getByText('Add User')).toBeInTheDocument()
  })

  it('renders user table with data', () => {
    render(<UsersView />)
    expect(screen.getByText('Alex Morgan')).toBeInTheDocument()
    expect(screen.getByText('Sarah Chen')).toBeInTheDocument()
    expect(screen.getByText('Harvey Specter')).toBeInTheDocument()
  })
})
