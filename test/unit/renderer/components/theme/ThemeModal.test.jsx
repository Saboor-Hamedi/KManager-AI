import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import ThemeModal from '../../../../../src/renderer/src/components/theme/ThemeModal'

vi.mock('../../../../../src/renderer/src/components/theme/useTheme', () => ({
  useTheme: () => ({
    theme: 'dark',
    setTheme: vi.fn(),
    allThemes: [
      { id: 'dark', name: 'Dark', description: 'Dark theme', colors: { '--bg-app': '#000' } },
      { id: 'dracula', name: 'Dracula', description: 'Dracula theme', colors: { '--bg-app': '#282a36' } },
      { id: 'light', name: 'Minimal Light', description: 'Light theme', colors: { '--bg-app': '#fff' } }
    ],
    currentThemeConfig: { id: 'dark', name: 'Dark', colors: {} }
  })
}))

describe('ThemeModal', () => {
  it('renders nothing when closed', () => {
    const { container } = render(<ThemeModal isOpen={false} onClose={vi.fn()} />)
    expect(container.innerHTML).toBe('')
  })

  it('renders theme search when open', () => {
    render(<ThemeModal isOpen={true} onClose={vi.fn()} />)
    expect(screen.getByPlaceholderText('Filter themes...')).toBeInTheDocument()
  })

  it('renders available themes', () => {
    render(<ThemeModal isOpen={true} onClose={vi.fn()} />)
    expect(screen.getByText('Dark')).toBeInTheDocument()
    expect(screen.getByText('Dracula')).toBeInTheDocument()
  })
})
