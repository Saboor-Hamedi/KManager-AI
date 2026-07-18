import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import React from 'react'
import GlobalTitleBar from '../../../../src/renderer/src/components/GlobalTitleBar'

const mockCheck = vi.fn()
const mockDownload = vi.fn()
const mockInstall = vi.fn()
const mockCheckLatest = vi.fn()
const mockVersion = vi.fn()

let subscribeAvailable = null

beforeEach(() => {
  mockCheck.mockReset()
  mockDownload.mockReset()
  mockInstall.mockReset()
  mockCheckLatest.mockReset()
  mockVersion.mockReset()
  subscribeAvailable = null

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
      onUpdateAvailable: (cb) => { subscribeAvailable = cb; return () => { subscribeAvailable = null } },
      onUpdateProgress: () => () => {},
      onUpdateDownloaded: () => () => {}
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

  it('shows Update button when update-available event fires', async () => {
    await act(async () => render(<GlobalTitleBar />))
    act(() => { subscribeAvailable?.({ version: '1.0.6' }) })
    expect(screen.getByRole('button', { name: 'Update Available' })).toBeInTheDocument()
  })

  it('hides Update button when versions match', async () => {
    mockCheckLatest.mockResolvedValue('1.0.5')
    await act(async () => render(<GlobalTitleBar />))
    expect(screen.queryByRole('button', { name: 'Update Available' })).not.toBeInTheDocument()
  })

  it('calls checkLatestVersion on mount', async () => {
    await act(async () => render(<GlobalTitleBar />))
    expect(mockCheckLatest).toHaveBeenCalledOnce()
  })

  it('shows dropdown when Update clicked', async () => {
    mockDownload.mockResolvedValue(undefined)
    await act(async () => render(<GlobalTitleBar />))
    act(() => { subscribeAvailable?.({ version: '1.0.6' }) })
    act(() => { screen.getByRole('button', { name: 'Update Available' }).click() })
    expect(screen.getByLabelText(/Downloading/)).toBeInTheDocument()
  })
})
