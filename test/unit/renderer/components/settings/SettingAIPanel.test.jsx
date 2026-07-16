import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import SettingAIPanel from '../../../../../src/renderer/src/components/settings/SettingAIPanel'

describe('SettingAIPanel', () => {
  it('renders API key field', () => {
    render(<SettingAIPanel />)
    expect(screen.getByText('DeepSeek API Key')).toBeInTheDocument()
  })

  it('renders embedding model field', () => {
    render(<SettingAIPanel />)
    expect(screen.getByText('Embedding Model')).toBeInTheDocument()
  })

  it('renders RAG toggle', () => {
    render(<SettingAIPanel />)
    expect(screen.getByText('Enable RAG Answer Synthesis')).toBeInTheDocument()
  })

  it('renders save button', () => {
    render(<SettingAIPanel />)
    expect(screen.getByText('Save Configuration')).toBeInTheDocument()
  })
})
