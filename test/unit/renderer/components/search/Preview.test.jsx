import { describe, it, expect, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import React from 'react'
import Preview from '../../../../../src/renderer/src/components/search/Preview'

describe('Preview', () => {
  const pdfItem = {
    title: 'test.pdf',
    content: 'PDF text content',
    category: 'PDF',
    vault_path: '/path/to/test.pdf'
  }

  const mdItem = {
    title: 'notes.md',
    content: 'Markdown notes',
    category: 'MD',
    vault_path: '/path/to/notes.md'
  }

  it('renders nothing when no item selected', () => {
    const { container } = render(<Preview selectedPdf={null} onClose={vi.fn()} fileExists={true} />)
    expect(container.innerHTML).toBe('')
  })

  it('renders PDF item title', () => {
    render(<Preview selectedPdf={pdfItem} onClose={vi.fn()} fileExists={true} />)
    expect(screen.getByText('test.pdf')).toBeInTheDocument()
  })

  it('shows archived badge when file missing', () => {
    render(<Preview selectedPdf={pdfItem} onClose={vi.fn()} fileExists={false} />)
    expect(screen.getByText('Archived (disk file removed)')).toBeInTheDocument()
  })
})
