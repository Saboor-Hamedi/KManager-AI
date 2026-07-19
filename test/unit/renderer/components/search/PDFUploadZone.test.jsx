import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'
import React from 'react'
import PDFUploadZone from '../../../../../src/renderer/src/components/search/PDFUploadZone'

const mockGetQueue = vi.fn()
const mockOnQueueUpdated = vi.fn()
const mockOnIngestProgress = vi.fn()
const mockQueueFiles = vi.fn()
const mockResolvePaths = vi.fn()
const mockCancelQueue = vi.fn()
const mockClearQueue = vi.fn()
const mockSelectFolder = vi.fn()

beforeEach(() => {
  mockGetQueue.mockReset()
  mockOnQueueUpdated.mockReset()
  mockOnIngestProgress.mockReset()
  mockQueueFiles.mockReset()
  mockResolvePaths.mockReset()
  mockCancelQueue.mockReset()
  mockClearQueue.mockReset()
  mockSelectFolder.mockReset()

  mockGetQueue.mockResolvedValue([])
  mockOnQueueUpdated.mockReturnValue(() => {})
  mockOnIngestProgress.mockReturnValue(() => {})
  mockQueueFiles.mockResolvedValue(undefined)
  mockResolvePaths.mockImplementation((paths) => Promise.resolve(paths))
  mockSelectFolder.mockResolvedValue([])

  globalThis.window.api = {
    ...globalThis.window.api,
    getPathForFile: (f) => f?.name || f || '',
    db: {
      ...globalThis.window.api?.db,
      getQueue: mockGetQueue,
      onQueueUpdated: mockOnQueueUpdated,
      onIngestProgress: mockOnIngestProgress,
      queueFiles: mockQueueFiles,
      cancelQueue: mockCancelQueue,
      clearQueue: mockClearQueue
    },
    system: {
      ...globalThis.window.api?.system,
      resolvePaths: mockResolvePaths,
      selectFolder: mockSelectFolder
    }
  }
})

async function expand() {
  await act(async () => render(<PDFUploadZone />))
  await act(async () => {
    fireEvent.click(screen.getByText('Smart PDF & Multi-Format Ingestion'))
  })
}

describe('PDFUploadZone', () => {
  it('renders collapsed by default', async () => {
    await act(async () => render(<PDFUploadZone />))
    expect(screen.getByText('Smart PDF & Multi-Format Ingestion')).toBeInTheDocument()
    expect(screen.queryByText(/Drag & drop files/)).not.toBeInTheDocument()
  })

  it('expands on click', async () => {
    await act(async () => render(<PDFUploadZone />))
    fireEvent.click(screen.getByText('Smart PDF & Multi-Format Ingestion'))
    expect(screen.getByText(/Drag & drop files/)).toBeInTheDocument()
    expect(screen.getByText('Select Folder')).toBeInTheDocument()
    expect(screen.getByText('Add Files')).toBeInTheDocument()
  })

  it('fetches initial queue on mount', async () => {
    await act(async () => render(<PDFUploadZone />))
    expect(mockGetQueue).toHaveBeenCalledOnce()
  })

  it('subscribes to queue updates', async () => {
    await act(async () => render(<PDFUploadZone />))
    expect(mockOnQueueUpdated).toHaveBeenCalledTimes(1)
  })

  it('subscribes to ingest progress', async () => {
    await act(async () => render(<PDFUploadZone />))
    expect(mockOnIngestProgress).toHaveBeenCalledTimes(1)
  })

  it('shows queue count when queue has items', async () => {
    mockGetQueue.mockResolvedValue([
      { id: '1', name: 'doc1.pdf', path: '/doc1.pdf', status: 'pending' }
    ])
    await act(async () => render(<PDFUploadZone />))
    expect(screen.getByText(/1 queued/)).toBeInTheDocument()
  })

  it('shows Indexing indicator when processing', async () => {
    mockGetQueue.mockResolvedValue([
      { id: '1', name: 'doc1.pdf', path: '/doc1.pdf', status: 'processing' }
    ])
    await act(async () => render(<PDFUploadZone />))
    expect(screen.getByText(/Indexing/)).toBeInTheDocument()
  })

  it('calls selectFolder on folder button click', async () => {
    mockSelectFolder.mockResolvedValue(['/folder/doc.pdf'])
    await expand()
    const btn = screen.getByRole('button', { name: 'Select Folder' })
    await act(async () => { fireEvent.click(btn) })
    expect(mockSelectFolder).toHaveBeenCalledOnce()
    expect(mockResolvePaths).toHaveBeenCalledWith(['/folder/doc.pdf'])
    expect(mockQueueFiles).toHaveBeenCalledOnce()
  })

  it('calls cancelQueue when Cancel clicked', async () => {
    mockGetQueue.mockResolvedValue([
      { id: '1', name: 'doc.pdf', path: '/doc.pdf', status: 'processing' }
    ])
    await expand()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Cancel'))
    expect(mockCancelQueue).toHaveBeenCalledOnce()
  })

  it('calls clearQueue when Clear Done clicked', async () => {
    mockGetQueue.mockResolvedValue([
      { id: '1', name: 'doc.pdf', path: '/doc.pdf', status: 'completed' }
    ])
    await expand()
    expect(screen.getByText('Clear Done')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Clear Done'))
    expect(mockClearQueue).toHaveBeenCalledOnce()
  })
})
