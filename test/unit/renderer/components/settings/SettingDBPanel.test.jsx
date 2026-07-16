import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import SettingDBPanel from '../../../../../src/renderer/src/components/settings/SettingDBPanel'

describe('SettingDBPanel', () => {
  it('renders connection form fields', () => {
    render(<SettingDBPanel />)
    expect(screen.getByText('PostgreSQL Connection')).toBeInTheDocument()
    expect(screen.getByText('Host')).toBeInTheDocument()
    expect(screen.getByText('Port')).toBeInTheDocument()
    expect(screen.getByText('Database')).toBeInTheDocument()
    expect(screen.getByText('Username')).toBeInTheDocument()
    expect(screen.getByText('Password')).toBeInTheDocument()
  })

  it('renders action buttons', () => {
    render(<SettingDBPanel />)
    expect(screen.getByText('Test')).toBeInTheDocument()
    expect(screen.getByText('Connect')).toBeInTheDocument()
  })
})
