import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import DocumentRenderer from '../../../../../src/renderer/src/components/search/DocumentRenderer'

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
    render(<DocumentRenderer content='{"name":"test","value":42}' category="JSON" />)
    expect(screen.getByText('"name"')).toBeInTheDocument()
  })
})
