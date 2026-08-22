import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { saveSetting, getSetting } from '../../../../src/renderer/src/lib/settings'

describe('settings lib', () => {
  beforeEach(() => {
    window.api = {
      config: {
        set: vi.fn().mockResolvedValue(true),
        get: vi.fn().mockResolvedValue('stored-value')
      }
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('saveSetting calls config.set and returns true', async () => {
    const result = await saveSetting('MY_KEY', 'value')
    expect(window.api.config.set).toHaveBeenCalledWith('MY_KEY', 'value')
    expect(result).toBe(true)
  })

  it('saveSetting returns false on error', async () => {
    window.api.config.set = vi.fn().mockRejectedValue(new Error('boom'))
    const result = await saveSetting('MY_KEY', 'value')
    expect(result).toBe(false)
  })

  it('getSetting returns stored value', async () => {
    const result = await getSetting('MY_KEY', 'default')
    expect(window.api.config.get).toHaveBeenCalledWith('MY_KEY', 'default')
    expect(result).toBe('stored-value')
  })

  it('getSetting returns default on error', async () => {
    window.api.config.get = vi.fn().mockRejectedValue(new Error('boom'))
    const result = await getSetting('MY_KEY', 'fallback')
    expect(result).toBe('fallback')
  })
})
