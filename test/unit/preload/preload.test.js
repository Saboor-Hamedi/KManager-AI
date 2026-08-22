import { describe, it, expect, vi, beforeEach } from 'vitest'

const invokeMock = vi.fn()
const sendMock = vi.fn()
const onMock = vi.fn()
const removeListenerMock = vi.fn()
const exposeInMainWorldMock = vi.fn()
const getPathForFileMock = vi.fn()

vi.mock('electron', () => ({
  contextBridge: { exposeInMainWorld: (...a) => exposeInMainWorldMock(...a) },
  webUtils: { getPathForFile: (f) => getPathForFileMock(f) },
  ipcRenderer: {
    invoke: (...a) => invokeMock(...a),
    send: (...a) => sendMock(...a),
    on: (...a) => onMock(...a),
    removeListener: (...a) => removeListenerMock(...a)
  }
}))

vi.mock('@electron-toolkit/preload', () => ({
  electronAPI: { mockElectronAPI: true }
}))

// Simulate context isolation enabled before the preload module evaluates
global.process.contextIsolated = true
let capturedApi = null
exposeInMainWorldMock.mockImplementation((name, api) => {
  if (name === 'api') capturedApi = api
})
await import('../../../src/preload/index')

beforeEach(() => {
  invokeMock.mockClear()
  sendMock.mockClear()
  onMock.mockClear()
  removeListenerMock.mockClear()
  getPathForFileMock.mockClear()
})

describe('preload api', () => {
  it('exposes electron and api into main world', () => {
    expect(exposeInMainWorldMock).toHaveBeenCalledWith('electron', { mockElectronAPI: true })
    expect(exposeInMainWorldMock).toHaveBeenCalledWith('api', expect.any(Object))
    expect(capturedApi).not.toBeNull()
  })

  it('db.query invokes db:query with text and params', async () => {
    await capturedApi.db.query('SELECT 1', [5])
    expect(invokeMock).toHaveBeenCalledWith('db:query', 'SELECT 1', [5])
  })

  it('db.stats invokes db:stats', () => {
    capturedApi.db.stats()
    expect(invokeMock).toHaveBeenCalledWith('db:stats')
  })

  it('config.set invokes config:set', () => {
    capturedApi.config.set('KEY', 'value')
    expect(invokeMock).toHaveBeenCalledWith('config:set', 'KEY', 'value')
  })

  it('system.openFile invokes system:open-file', () => {
    capturedApi.system.openFile('/tmp/a.txt')
    expect(invokeMock).toHaveBeenCalledWith('system:open-file', '/tmp/a.txt')
  })

  it('windowControls.close sends window:close', () => {
    capturedApi.windowControls.close()
    expect(sendMock).toHaveBeenCalledWith('window:close')
  })

  it('db.onIngestProgress registers a listener and returns an unsubscribe fn', () => {
    const cb = vi.fn()
    const unsubscribe = capturedApi.db.onIngestProgress(cb)
    expect(onMock).toHaveBeenCalledWith('db:ingest-progress', expect.any(Function))
    const listener = onMock.mock.calls.find(([ch]) => ch === 'db:ingest-progress')[1]
    listener(null, { progress: 42 })
    expect(cb).toHaveBeenCalledWith({ progress: 42 })
    unsubscribe()
    expect(removeListenerMock).toHaveBeenCalledWith('db:ingest-progress', listener)
  })

  it('getPathForFile delegates to webUtils.getPathForFile', () => {
    const file = { name: 'x' }
    capturedApi.getPathForFile(file)
    expect(getPathForFileMock).toHaveBeenCalledWith(file)
  })
})
