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

  it('fetches docs tree and renders sidebar', async () => {
    await act(async () => {
      render(<Documentation isOpen={true} onClose={onClose} />)
    })
    expect(screen.getByText('Documentation')).toBeInTheDocument()
    expect(await screen.findByText('Introduction')).toBeInTheDocument()
    expect(screen.getAllByText('Setup Guide').length).toBeGreaterThan(0)
    expect(screen.getByText('Architecture')).toBeInTheDocument()
    expect(readBrainDocs).toHaveBeenCalled()
  })

  it('selects the Introduction document and renders its content', async () => {
    await act(async () => {
      render(<Documentation isOpen={true} onClose={onClose} />)
    })
    expect(await screen.findByRole('heading', { level: 1, name: /hello docs/i })).toBeInTheDocument()
    expect(readFileContent).toHaveBeenCalledWith('/docs/introduction.md')
  })

  it('renders the no-document selected state when docs are empty', async () => {
    readBrainDocs.mockResolvedValue({})
    await act(async () => {
      render(<Documentation isOpen={true} onClose={onClose} />)
    })
    expect(await screen.findByText('No Document Selected')).toBeInTheDocument()
  })

  it('closes on Escape key', async () => {
    await act(async () => {
      render(<Documentation isOpen={true} onClose={onClose} />)
    })
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  it('renders next navigation button and navigates to it', async () => {
    await act(async () => {
      render(<Documentation isOpen={true} onClose={onClose} />)
    })
    const nextBtn = screen.getAllByRole('button').find(b =>
      b.textContent.includes('Setup Guide') && b.querySelector('polyline')
    )
    fireEvent.click(nextBtn)
    await waitFor(() => expect(readFileContent).toHaveBeenCalledWith('/docs/setup.md'))
  })

  it('navigates when an internal markdown link is clicked', async () => {
    readFileContent.mockResolvedValue('# Home\n\nSee the [architecture guide](architecture.md).')
    await act(async () => {
      render(<Documentation isOpen={true} onClose={onClose} />)
    })
    const link = await screen.findByRole('link', { name: /architecture guide/i })
    fireEvent.click(link)
    await waitFor(() => expect(readFileContent).toHaveBeenCalledWith('/docs/architecture.md'))
  })
})
