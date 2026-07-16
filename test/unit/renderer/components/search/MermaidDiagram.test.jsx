import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import MermaidDiagram from '../../../../../src/renderer/src/components/search/MermaidDiagram'

describe('MermaidDiagram', () => {
  it('renders loading state initially', () => {
    render(<MermaidDiagram chart="graph TD; A-->B;" />)
    expect(screen.getByText('Rendering diagram...')).toBeInTheDocument()
  })

  it('renders header with Mermaid label', () => {
    render(<MermaidDiagram chart="graph TD; A-->B;" />)
    expect(screen.getByText('Mermaid')).toBeInTheDocument()
  })
})
