import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'
import React from 'react'
import SettingUpdate from '../../../../../src/renderer/src/components/settings/SettingUpdate'

const mockCheck = vi.fn(() => Promise.resolve())
const mockDownload = vi.fn(() => Promise.resolve())
const mockInstall = vi.fn()

beforeEach(() => {
  mockCheck.mockClear()
  mockDownload.mockClear()
  mockInstall.mockClear()

  globalThis.window.api = {
    ...globalThis.window.api,
    app: {
      version: () => Promise.resolve('1.0.5')
    },
    update: {
      check: mockCheck,
      download: mockDownload,
      install: mockInstall,
      onUpdateAvailable: () => () => {},
      onUpdateNotAvailable: () => () => {},
      onUpdateProgress: () => () => {},
      onUpdateDownloaded: () => () => {},
      onUpdateError: () => () => {}
    }
  }
})

describe('SettingUpdate', () => {
  it('renders heading and description', async () => {
    await act(async () => render(<SettingUpdate />))
    expect(screen.getByText('Application Update')).toBeInTheDocument()
    expect(screen.getByText('Check for Updates')).toBeInTheDocument()
  })

  it('shows current version from app.version', async () => {
    await act(async () => render(<SettingUpdate />))
    expect(screen.getByText(/v1\.0\.5/)).toBeInTheDocument()
  })

  it('shows fallback version when app.version fails', async () => {
    globalThis.window.api.app.version = () => Promise.reject(new Error('fail'))
    await act(async () => render(<SettingUpdate />))
    expect(screen.getByText(/v—/)).toBeInTheDocument()
  })

  it('calls update.check when Check for Updates clicked', async () => {
    await act(async () => render(<SettingUpdate />))
    fireEvent.click(screen.getByText('Check for Updates'))
    expect(mockCheck).toHaveBeenCalledOnce()
  })

  it('shows checking state', async () => {
    await act(async () => render(<SettingUpdate />))
    fireEvent.click(screen.getByText('Check for Updates'))
    expect(screen.getByText('Checking...')).toBeInTheDocument()
  })

  it('shows up to date state', async () => {
    globalThis.window.api.update.onUpdateNotAvailable = (cb) => {
      setTimeout(() => cb(), 10)
      return () => {}
    }
    await act(async () => render(<SettingUpdate />))
    await vi.waitFor(() => {
      expect(screen.getByText('KManager AI is up to date')).toBeInTheDocument()
    }, { timeout: 2000 })
  })

  it('shows available state', async () => {
    globalThis.window.api.update.onUpdateAvailable = (cb) => {
      setTimeout(() => cb({ version: '1.0.6' }), 10)
      return () => {}
    }
    await act(async () => render(<SettingUpdate />))
    await vi.waitFor(() => {
      expect(screen.getByText('Update v1.0.6 available')).toBeInTheDocument()
    }, { timeout: 2000 })
  })

  it('shows version range when both versions known', async () => {
    globalThis.window.api.update.onUpdateAvailable = (cb) => {
      setTimeout(() => cb({ version: '1.0.6' }), 10)
      return () => {}
    }
    await act(async () => render(<SettingUpdate />))
    await vi.waitFor(() => {
      expect(screen.getByText('v1.0.5 → v1.0.6')).toBeInTheDocument()
    }, { timeout: 2000 })
  })

  it('calls download when Download clicked', async () => {
    globalThis.window.api.update.onUpdateAvailable = (cb) => {
      setTimeout(() => cb({ version: '1.0.6' }), 10)
      return () => {}
    }
    await act(async () => render(<SettingUpdate />))
    await vi.waitFor(() => {
      expect(screen.getByText('Download')).toBeInTheDocument()
    }, { timeout: 2000 })
    fireEvent.click(screen.getByText('Download'))
    expect(mockDownload).toHaveBeenCalledOnce()
  })

  it('shows progress during download', async () => {
    globalThis.window.api.update.onUpdateProgress = (cb) => {
      setTimeout(() => cb({ percent: 45 }), 10)
      return () => {}
    }
    await act(async () => render(<SettingUpdate />))
    // Trigger download state via progress event
    await vi.waitFor(() => {
      expect(screen.getByText('45%')).toBeInTheDocument()
    })
  })

  it('shows restart when download completes', async () => {
    globalThis.window.api.update.onUpdateDownloaded = (cb) => {
      setTimeout(() => cb(), 10)
      return () => {}
    }
    await act(async () => render(<SettingUpdate />))
    await vi.waitFor(() => {
      expect(screen.getByText('Restart')).toBeInTheDocument()
    })
  })

  it('calls install when Restart clicked', async () => {
    globalThis.window.api.update.onUpdateDownloaded = (cb) => {
      setTimeout(() => cb(), 10)
      return () => {}
    }
    await act(async () => render(<SettingUpdate />))
    await vi.waitFor(() => {
      expect(screen.getByText('Restart')).toBeInTheDocument()
    }, { timeout: 2000 })
    fireEvent.click(screen.getByText('Restart'))
    expect(mockInstall).toHaveBeenCalledOnce()
  })

  it('shows error state', async () => {
    globalThis.window.api.update.onUpdateError = (cb) => {
      setTimeout(() => cb('Network error'), 10)
      return () => {}
    }
    await act(async () => render(<SettingUpdate />))
    await vi.waitFor(() => {
      expect(screen.getByText('Update check failed')).toBeInTheDocument()
    })
    expect(screen.getByText('Network error')).toBeInTheDocument()
  })

  it('shows Try again button on error', async () => {
    globalThis.window.api.update.onUpdateError = (cb) => {
      setTimeout(() => cb('err'), 10)
      return () => {}
    }
    await act(async () => render(<SettingUpdate />))
    await vi.waitFor(() => {
      expect(screen.getByText('Try again')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('Try again'))
    expect(mockCheck).toHaveBeenCalled()
  })
})
