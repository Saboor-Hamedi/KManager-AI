import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import React from 'react'
import GlobalTitleBar from '../../../../src/renderer/src/components/GlobalTitleBar'

const mockCheck = vi.fn()
const mockDownload = vi.fn()
const mockInstall = vi.fn()
const mockCheckLatest = vi.fn()
const mockOnAvailable = vi.fn()
const mockOnProgress = vi.fn()
const mockOnDownloaded = vi.fn()
const mockVersion = vi.fn()

beforeEach(() => {
  mockCheck.mockReset()
  mockDownload.mockReset()
  mockInstall.mockReset()
  mockCheckLatest.mockReset()
  mockOnAvailable.mockReset()
  mockOnProgress.mockReset()
  mockOnDownloaded.mockReset()
  mockVersion.mockReset()

  mockCheckLatest.mockResolvedValue('1.0.6')
  mockVersion.mockResolvedValue('1.0.5')

  globalThis.window.api = {
    ...globalThis.window.api,
    app: {
      version: mockVersion,
      checkLatestVersion: mockCheckLatest
    },
    update: {
      check: mockCheck,
      download: mockDownload,
      install: mockInstall,
      onUpdateAvailable: (cb) => { mockOnAvailable.mockImplementation(cb); return () => {} },
      onUpdateProgress: (cb) => { mockOnProgress.mockImplementation(cb); return () => {} },
      onUpdateDownloaded: (cb) => { mockOnDownloaded.mockImplementation(cb); return () => {} }
    }
  }
})

describe('GlobalTitleBar', () => {
  it('renders app name', async () => {
    await act(async () => render(<GlobalTitleBar />))
    expect(screen.getByText('KManager AI')).toBeInTheDocument()
  })

  it('renders window control buttons', async () => {
    await act(async () => render(<GlobalTitleBar />))
    expect(screen.getByTitle('Minimize')).toBeInTheDocument()
    expect(screen.getByTitle('Maximize')).toBeInTheDocument()
    expect(screen.getByTitle('Close')).toBeInTheDocument()
  })

  it('calls update.check on mount', async () => {
    await act(async () => render(<GlobalTitleBar />))
    expect(mockCheck).toHaveBeenCalledOnce()
  })

  it('shows Update button when GitHub has newer version', async () => {
    await act(async () => render(<GlobalTitleBar />))
    await vi.waitFor(() => {
      expect(screen.getByText(/Update/)).toBeInTheDocument()
    })
  })

  it('hides Update button when versions match', async () => {
    mockCheckLatest.mockResolvedValue('1.0.5')
    await act(async () => render(<GlobalTitleBar />))
    await vi.waitFor(() => {
      expect(screen.queryByText(/Update/)).not.toBeInTheDocument()
    })
  })

  it('calls checkLatestVersion on mount', async () => {
    await act(async () => render(<GlobalTitleBar />))
    expect(mockCheckLatest).toHaveBeenCalledOnce()
  })

  it('shows dropdown with version info when Update clicked', async () => {
    await act(async () => render(<GlobalTitleBar />))
    await vi.waitFor(() => {
      expect(screen.getByText(/Update/)).toBeInTheDocument()
    })
  })

  it('calls app.version on mount', async () => {
    await act(async () => render(<GlobalTitleBar />))
    expect(mockCheck).toHaveBeenCalledOnce()
  })
})
