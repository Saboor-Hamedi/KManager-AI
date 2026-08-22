import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import SettingDBPropertiesPanel from '../../../../../src/renderer/src/components/settings/SettingDBPropertiesPanel'

describe('SettingDBPropertiesPanel', () => {
  const statsMock = vi.fn()
  const reembedAllMock = vi.fn()
  const truncateAllMock = vi.fn()
  const clearQueueMock = vi.fn()

  beforeEach(() => {
    statsMock.mockResolvedValue({
      success: true,
      stats: { total_docs: 0, total_chunks: 0, total_db_bytes: 0, raw_file_bytes: 0, by_type: {} }
    })
    reembedAllMock.mockResolvedValue({ success: true, documentsProcessed: 5 })
    truncateAllMock.mockResolvedValue({ success: true })
    clearQueueMock.mockResolvedValue(true)
    window.api.db.stats = statsMock
    window.api.db.reembedAll = reembedAllMock
    window.api.db.truncateAll = truncateAllMock
    window.api.db.clearQueue = clearQueueMock
  })

  it('renders the panel title and metric card labels', async () => {
    await act(async () => {
      render(<SettingDBPropertiesPanel />)
    })
    expect(screen.getByText('DB Properties & Storage')).toBeInTheDocument()
    expect(await screen.findByText('Total Documents')).toBeInTheDocument()
    expect(screen.getByText('Vector Chunks')).toBeInTheDocument()
    expect(screen.getByText('DB Storage Size')).toBeInTheDocument()
    expect(screen.getByText('Avg Chunks / Doc')).toBeInTheDocument()
  })

  it('renders loaded stats values', async () => {
    statsMock.mockResolvedValue({
      success: true,
      stats: { total_docs: 42, total_chunks: 128, total_db_bytes: 2048, raw_file_bytes: 1024, by_type: {} }
    })
    await act(async () => {
      render(<SettingDBPropertiesPanel />)
    })
    expect(await screen.findByText('42')).toBeInTheDocument()
    expect(screen.getByText('128')).toBeInTheDocument()
    expect(screen.getByText('2 KB')).toBeInTheDocument()
  })

  it('shows empty state when no formats ingested', async () => {
    await act(async () => {
      render(<SettingDBPropertiesPanel />)
    })
    expect(await screen.findByText(/No files ingested yet/)).toBeInTheDocument()
  })

  it('renders the format distribution table', async () => {
    statsMock.mockResolvedValue({
      success: true,
      stats: { total_docs: 42, total_chunks: 128, total_db_bytes: 0, raw_file_bytes: 0, by_type: { md: 30, pdf: 12 } }
    })
    await act(async () => {
      render(<SettingDBPropertiesPanel />)
    })
    expect(await screen.findByText('Ingested File Formats')).toBeInTheDocument()
    expect(screen.getAllByText('.md').length).toBeGreaterThan(0)
    expect(screen.getAllByText('.pdf').length).toBeGreaterThan(0)
  })

  it('shows an error banner when stats loading fails', async () => {
    statsMock.mockResolvedValue({ success: false, message: 'DB is offline' })
    await act(async () => {
      render(<SettingDBPropertiesPanel />)
    })
    expect(await screen.findByText('DB is offline')).toBeInTheDocument()
  })

  it('runs re-embed flow after confirmation', async () => {
    await act(async () => {
      render(<SettingDBPropertiesPanel />)
    })
    await screen.findByText('Total Documents')
    fireEvent.click(screen.getByText('Re-embed'))
    expect(screen.getByText(/This will re-chunk and re-embed all archived documents/)).toBeInTheDocument()
    const confirmBtns = screen.getAllByText('Re-embed')
    fireEvent.click(confirmBtns[confirmBtns.length - 1])
    await waitFor(() => expect(reembedAllMock).toHaveBeenCalled())
    expect(await screen.findByText('Successfully re-scanned 5 documents.')).toBeInTheDocument()
  })

  it('runs truncate flow after confirmation', async () => {
    await act(async () => {
      render(<SettingDBPropertiesPanel />)
    })
    await screen.findByText('Total Documents')
    fireEvent.click(screen.getByText('Truncate'))
    expect(screen.getByText(/Are you sure you want to instantly delete all documents/)).toBeInTheDocument()
    const confirmBtns = screen.getAllByText('Truncate')
    fireEvent.click(confirmBtns[confirmBtns.length - 1])
    await waitFor(() => expect(truncateAllMock).toHaveBeenCalled())
    expect(await screen.findByText('All tables truncated and vector indexes cleared instantly.')).toBeInTheDocument()
    expect(clearQueueMock).toHaveBeenCalled()
  })

  it('refreshes stats when refresh button is clicked', async () => {
    await act(async () => {
      render(<SettingDBPropertiesPanel />)
    })
    await screen.findByText('Total Documents')
    const callsBefore = statsMock.mock.calls.length
    fireEvent.click(screen.getByTitle('Refresh statistics'))
    await waitFor(() => expect(statsMock.mock.calls.length).toBeGreaterThan(callsBefore))
  })
})
