import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import DocumentRenderer from '../../../../../src/renderer/src/components/search/document/DocumentRenderer'

describe('DocumentRenderer', () => {
  it('renders nothing for null content', () => {
    const { container } = render(<DocumentRenderer content={null} />)
    expect(container.innerHTML).toBe('')
  })

  it('renders loading state with fallback', () => {
    render(<DocumentRenderer content="Hello world" />)
    // Lazy-loaded ReactMarkdown shows fallback first
    expect(screen.getByText('Loading document...')).toBeInTheDocument()
  })

  it('renders JSON content with formatting', () => {
    const { container } = render(<DocumentRenderer content='{"name":"test","value":42}' category="JSON" />)
    const pre = container.querySelector('pre')
    expect(pre).toBeInTheDocument()
    expect(pre.textContent).toContain('"name"')
    expect(pre.textContent).toContain('"test"')
    expect(pre.textContent).toContain('42')
  })

  it('renders callout TIP paragraph', async () => {
    render(<DocumentRenderer content="[!TIP] Always back up your vault." />)
    expect(await screen.findByText('💡 TIP', {}, { timeout: 5000 })).toBeInTheDocument()
  })

  it('renders markdown headings', async () => {
    render(<DocumentRenderer content="# My Heading" />)
    expect(await screen.findByRole('heading', { level: 1, name: /My Heading/i })).toBeInTheDocument()
  })
})
