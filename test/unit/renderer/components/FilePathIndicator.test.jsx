import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import FilePathIndicator from '../../../../src/renderer/src/components/FilePathIndicator'

const vaultPath = 'C:\\vault\\docs\\file.md'

describe('FilePathIndicator', () => {
  beforeEach(() => {
    window.api.system.showInFolder = vi.fn()
  })

  it('renders nothing for ai-response paths', () => {
    const { container } = render(<FilePathIndicator vaultPath="ai-response-123" />)
    expect(container.innerHTML).toBe('')
  })

  it('renders nothing when no vault path', () => {
    const { container } = render(<FilePathIndicator vaultPath={null} />)
    expect(container.innerHTML).toBe('')
  })

  it('renders folder path indicator', () => {
    render(<FilePathIndicator vaultPath={vaultPath} />)
    expect(screen.getByTitle('Show in File Explorer')).toBeInTheDocument()
  })

  it('calls showInFolder on button click', () => {
    render(<FilePathIndicator vaultPath={vaultPath} />)
    fireEvent.click(screen.getByTitle('Show in File Explorer'))
    expect(window.api.system.showInFolder).toHaveBeenCalledWith(vaultPath)
  })
})
