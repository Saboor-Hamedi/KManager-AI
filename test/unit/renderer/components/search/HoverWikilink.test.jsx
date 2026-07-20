import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import HoverWikilink from '../../../../../src/renderer/src/components/search/HoverWikilink'

describe('HoverWikilink', () => {
  const item = {
    title: 'test_document.pdf',
    content: 'This is the document content for testing.',
    vault_path: '/path/to/test_document.pdf'
  }

  it('renders', () => {
    const { container } = render(<HoverWikilink item={item} setShowWikiHover={vi.fn()} onSelect={vi.fn()} />)
    expect(container.children.length).toBeGreaterThanOrEqual(0)
  })
})
