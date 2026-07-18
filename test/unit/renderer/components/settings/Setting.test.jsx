import { describe, it, expect, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import React from 'react'
import Setting from '../../../../../src/renderer/src/components/settings/Setting'

describe('Setting', () => {
  it('renders nothing when closed', async () => {
    await act(async () => {
      const { container } = render(<Setting isOpen={false} onClose={vi.fn()} />)
      expect(container.innerHTML).toBe('')
    })
  })

  it('renders settings panel heading when open', async () => {
    await act(async () => {
      render(<Setting isOpen={true} onClose={vi.fn()} />)
    })
    expect(screen.getByText('Settings & Knowledge Hub')).toBeInTheDocument()
  })
})
