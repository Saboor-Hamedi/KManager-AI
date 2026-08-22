import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import CopyFigureButton from '../../../../../src/renderer/src/components/analytics/CopyFigureButton'

vi.mock('html-to-image', () => ({
  toBlob: vi.fn().mockResolvedValue(new Blob(['x'])),
  toPng: vi.fn().mockResolvedValue('data:image/png;base64,x')
}))

describe('analytics CopyFigureButton', () => {
  beforeEach(() => {
    navigator.clipboard.write = vi.fn().mockResolvedValue(undefined)
    global.ClipboardItem = class ClipboardItem {
      constructor(items) {
        this.items = items
      }
    }
  })

  it('renders copy button with title', () => {
    render(<CopyFigureButton targetRef={{ current: document.createElement('div') }} />)
    expect(screen.getByText('Copy')).toBeInTheDocument()
    expect(screen.getByTitle('Copy Figure')).toBeInTheDocument()
  })

  it('copies to clipboard on click and shows copied state', async () => {
    render(<CopyFigureButton targetRef={{ current: document.createElement('div') }} />)
    fireEvent.click(screen.getByTitle('Copy Figure'))
    await waitFor(() => expect(navigator.clipboard.write).toHaveBeenCalled())
    await waitFor(() => expect(screen.getByText('Copied')).toBeInTheDocument())
  })

  it('does nothing when targetRef has no current node', () => {
    render(<CopyFigureButton targetRef={{ current: null }} />)
    fireEvent.click(screen.getByTitle('Copy Figure'))
    expect(navigator.clipboard.write).not.toHaveBeenCalled()
    expect(screen.getByText('Copy')).toBeInTheDocument()
  })
})
