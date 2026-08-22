import { describe, it, expect, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import React from 'react'
import SettingDBPanel from '../../../../../src/renderer/src/components/settings/SettingDBPanel'

describe('SettingDBPanel', () => {
  it('renders connection form fields', async () => {
    await act(async () => render(<SettingDBPanel />))
    expect(screen.getByText('PostgreSQL Connection')).toBeInTheDocument()
    expect(screen.getByText('Host')).toBeInTheDocument()
    expect(screen.getByText('Port')).toBeInTheDocument()
    expect(screen.getByText('Database')).toBeInTheDocument()
    expect(screen.getByText('Username')).toBeInTheDocument()
    expect(screen.getByText('Password')).toBeInTheDocument()
  })

  it('renders action buttons', async () => {
    await act(async () => render(<SettingDBPanel />))
    expect(screen.getByText('Test Connection')).toBeInTheDocument()
    expect(screen.getByText('Connect')).toBeInTheDocument()
  })
})
