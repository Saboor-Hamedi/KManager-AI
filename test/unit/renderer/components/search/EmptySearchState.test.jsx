import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import EmptySearchState from '../../../../../src/renderer/src/components/search/EmptySearchState'

describe('EmptySearchState', () => {
  it('renders the query in the message', () => {
    render(<EmptySearchState query="prostate cancer" />)
    expect(screen.getByText(/prostate cancer/)).toBeInTheDocument()
  })

  it('renders heading', () => {
    render(<EmptySearchState query="test" />)
    expect(screen.getByText('No matching documents found')).toBeInTheDocument()
  })

  it('renders suggestion to adjust keywords', () => {
    render(<EmptySearchState query="test" />)
    expect(screen.getByText(/Try adjusting your keywords/)).toBeInTheDocument()
  })
})
