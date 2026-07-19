import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'
import React from 'react'
import SettingAIPanel from '../../../../../src/renderer/src/components/settings/SettingAIPanel'

const mockSave = vi.fn()

beforeEach(() => {
  mockSave.mockClear()
  globalThis.window.api = {
    ...globalThis.window.api,
    config: {
      get: (key, def) => Promise.resolve(key === 'ACTIVE_LLM_PROVIDER' ? 'deepseek' : ''),
      set: mockSave
    }
  }
})

describe('SettingAIPanel', () => {
  it('renders API key field', async () => {
    await act(async () => render(<SettingAIPanel />))
    expect(screen.getByText('DeepSeek API Key')).toBeInTheDocument()
  })

  it('renders embedding model field', async () => {
    await act(async () => render(<SettingAIPanel />))
    expect(screen.getByText('Embedding Model')).toBeInTheDocument()
  })

  it('renders RAG toggle', async () => {
    await act(async () => render(<SettingAIPanel />))
    expect(screen.getByText('Enable RAG Answer Synthesis')).toBeInTheDocument()
  })

  it('does not render Save button', async () => {
    await act(async () => render(<SettingAIPanel />))
    expect(screen.queryByText('Save')).not.toBeInTheDocument()
  })

  it('auto-saves API key on input after debounce', async () => {
    await act(async () => render(<SettingAIPanel />))
    const input = screen.getByPlaceholderText('sk-...')
    fireEvent.change(input, { target: { value: 'sk-test-key' } })
    // Debounce is 400ms, wait for it
    await new Promise(r => setTimeout(r, 600))
    expect(mockSave).toHaveBeenCalledWith('DEEPSEEK_API_KEY', 'sk-test-key')
  })

  it('shows Saved indicator after saving key', async () => {
    await act(async () => render(<SettingAIPanel />))
    const input = screen.getByPlaceholderText('sk-...')
    fireEvent.change(input, { target: { value: 'sk-test' } })
    await new Promise(r => setTimeout(r, 600))
    expect(screen.getByText('Saved')).toBeInTheDocument()
  })

  it('auto-saves when provider is changed', async () => {
    await act(async () => render(<SettingAIPanel />))
    const providerBtn = screen.getByText('DeepSeek')
    fireEvent.click(providerBtn)
    const chatgptOption = screen.getByText('ChatGPT (OpenAI)')
    fireEvent.mouseDown(chatgptOption)
    expect(mockSave).toHaveBeenCalledWith('ACTIVE_LLM_PROVIDER', 'chatgpt')
  })

  it('switches API key placeholder when provider changes', async () => {
    await act(async () => render(<SettingAIPanel />))
    const providerBtn = screen.getByText('DeepSeek')
    fireEvent.click(providerBtn)
    fireEvent.mouseDown(screen.getByText('Gemini (Google)'))
    expect(screen.getByPlaceholderText('AIza...')).toBeInTheDocument()
  })
})
