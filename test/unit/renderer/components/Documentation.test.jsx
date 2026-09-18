import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import React from 'react'
import Documentation from '../../../../src/renderer/src/components/Documentation'

describe('Documentation', () => {
  const onClose = vi.fn()

  const docs = {
    GENERAL: [
      { title: 'Introduction', path: '/docs/introduction.md' },
      { title: 'Setup Guide', path: '/docs/setup.md' }
    ],
    ADVANCED: [
      { title: 'Architecture', path: '/docs/architecture.md' }
    ]
  }

  const readFileContent = vi.fn()
  const readBrainDocs = vi.fn()

  beforeEach(() => {
    onClose.mockClear()
    readFileContent.mockClear()
    readBrainDocs.mockClear()
    readBrainDocs.mockResolvedValue(docs)
    readFileContent.mockResolvedValue('# Hello Docs')
    window.api.system.readBrainDocs = readBrainDocs
    window.api.system.readFileContent = readFileContent
    window.api.system.openExternal = vi.fn()
    window.api.config.get = vi.fn().mockResolvedValue({})
    window.api.config.set = vi.fn().mockResolvedValue(true)
  })

  it('renders nothing when closed', () => {
    const { container } = render(<Documentation isOpen={false} onClose={onClose} />)
    expect(container.innerHTML).toBe('')
  })

  it('renders documentation modal and sidebar when open', async () => {
    await act(async () => {
      render(<Documentation isOpen={true} onClose={onClose} />)
    })
    expect(screen.getByText('Documentation')).toBeInTheDocument()
    const intros = await screen.findAllByText('Introduction')
    expect(intros.length).toBeGreaterThan(0)
  })

  it('closes on Escape key', async () => {
    await act(async () => {
      render(<Documentation isOpen={true} onClose={onClose} />)
    })
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })
})
