import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import SearchResultCard from '../../../../../src/renderer/src/components/search/SearchResultCard'

describe('SearchResultCard', () => {
  const item = {
    id: '1',
    title: 'test_document.pdf',
    document_id: 'doc-1',
    content: 'This is the chunk content with prostate cancer biomarkers.',
    similarity: 0.87,
    category: 'PDF',
    vault_path: '/path/to/test.pdf',
    created_at: new Date().toISOString()
  }

  it('renders item title', () => {
    render(<SearchResultCard item={item} query="prostate cancer" handleSelect={vi.fn()} />)
    expect(screen.getByText('test_document.pdf')).toBeInTheDocument()
  })

  it('renders similarity percentage', () => {
    render(<SearchResultCard item={item} query="prostate cancer" handleSelect={vi.fn()} />)
    expect(screen.getByText('87%')).toBeInTheDocument()
  })

  it('renders action buttons', () => {
    render(<SearchResultCard item={item} query="prostate cancer" handleSelect={vi.fn()} />)
    expect(screen.getByTitle('Open citation preview drawer')).toBeInTheDocument()
    expect(screen.getByTitle('Copy section text')).toBeInTheDocument()
    expect(screen.getByTitle('Helpful result')).toBeInTheDocument()
    expect(screen.getByTitle('Not helpful')).toBeInTheDocument()
  })

  it('renders Reply button', () => {
    render(<SearchResultCard item={item} query="test" handleSelect={vi.fn()} />)
    expect(screen.getByText('Reply')).toBeInTheDocument()
  })
})
