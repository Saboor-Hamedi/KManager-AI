import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import React from 'react'
import PDFUploadZone from '../../../../../src/renderer/src/components/search/PDFUploadZone'

describe('PDFUploadZone', () => {
  it('renders without crashing', async () => {
    await act(async () => render(<PDFUploadZone />))
    expect(screen.getByText('Insert')).toBeInTheDocument()
  })

  it('expands to show dropzone and queue when clicked', async () => {
    await act(async () => render(<PDFUploadZone />))
    await act(async () => {
      fireEvent.click(screen.getByText('Insert'))
    })
    expect(screen.getByText('My Library Dropzone')).toBeInTheDocument()
    expect(screen.getByText(/Drag & drop files or folders here to index/)).toBeInTheDocument()
    expect(screen.getByText('Select Folder')).toBeInTheDocument()
    expect(screen.getByText('Add Files')).toBeInTheDocument()
  })

  it('shows empty queue message when expanded with no files', async () => {
    await act(async () => render(<PDFUploadZone />))
    await act(async () => {
      fireEvent.click(screen.getByText('Insert'))
    })
    expect(screen.getByText(/Queue and database are currently empty/)).toBeInTheDocument()
  })
})
