import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import SettingDataPanel from '../../../../../src/renderer/src/components/settings/SettingDataPanel'

describe('SettingDataPanel', () => {
  it('renders data ingestion title', () => {
    render(<SettingDataPanel />)
    expect(screen.getByText('Data Ingestion')).toBeInTheDocument()
  })

  it('renders upload area text', () => {
    render(<SettingDataPanel />)
    expect(screen.getByText(/Drag and drop files or folders here/)).toBeInTheDocument()
  })
})
