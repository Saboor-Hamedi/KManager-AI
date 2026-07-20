import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import React from 'react'
import PDFUploadZone from '../../../../../src/renderer/src/components/search/PDFUploadZone'

describe('PDFUploadZone', () => {
  it('renders without crashing', async () => {
    await act(async () => render(<PDFUploadZone />))
    expect(screen.getByText('Ingest Docs')).toBeInTheDocument()
  })
})
