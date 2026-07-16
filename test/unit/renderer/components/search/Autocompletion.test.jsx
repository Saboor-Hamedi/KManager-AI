import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import Autocompletion from '../../../../../src/renderer/src/components/search/Autocompletion'

describe('Autocompletion', () => {
  const results = [
    { content: 'prostate cancer biomarkers include PSA testing', file_name: 'doc1.pdf' },
    { content: 'prostate specific antigen is a key biomarker', file_name: 'doc2.pdf' }
  ]

  it('renders nothing when not visible', () => {
    const { container } = render(
      <Autocompletion results={results} visible={false} query="prostate" onSelect={vi.fn()} selectedIndex={-1} />
    )
    expect(container.innerHTML).toBe('')
  })

  it('renders suggestions when visible', () => {
    render(
      <Autocompletion results={results} visible={true} query="prostate" onSelect={vi.fn()} selectedIndex={-1} />
    )
    expect(screen.getByText('doc1.pdf')).toBeInTheDocument()
    expect(screen.getByText('doc2.pdf')).toBeInTheDocument()
  })

  it('calls onSelect when suggestion clicked', () => {
    const onSelect = vi.fn()
    render(
      <Autocompletion results={results} visible={true} query="prostate" onSelect={onSelect} selectedIndex={-1} />
    )
    const items = screen.getAllByText('doc1.pdf')
    fireEvent.click(items[0].closest('div'))
    expect(onSelect).toHaveBeenCalled()
  })
})
