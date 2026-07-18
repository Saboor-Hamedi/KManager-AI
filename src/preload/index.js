import { contextBridge, webUtils, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  getPathForFile: (file) => webUtils.getPathForFile(file),
  db: {
    testConnection: (config) => ipcRenderer.invoke('db:test-connection', config),
    connect: (config) => ipcRenderer.invoke('db:connect', config),
    disconnect: () => ipcRenderer.invoke('db:disconnect'),
    query: (text, params) => ipcRenderer.invoke('db:query', text, params),
    status: () => ipcRenderer.invoke('db:status'),
    stats: () => ipcRenderer.invoke('db:stats'),
    search: (queryText, limit) => ipcRenderer.invoke('db:search', queryText, limit),
    lexicalSearch: (query, limit) => ipcRenderer.invoke('db:lexical-search', { query, limit }),
    getAnalytics: () => ipcRenderer.invoke('db:get-analytics'),
    ingestFile: (filePath) => ipcRenderer.invoke('db:ingest-file', filePath),
    queueFiles: (filePaths) => ipcRenderer.invoke('db:queue-files', filePaths),
    getQueue: () => ipcRenderer.invoke('db:get-queue'),
    cancelQueue: () => ipcRenderer.invoke('db:cancel-queue'),
    clearQueue: () => ipcRenderer.invoke('db:clear-queue'),
    reembedAll: () => ipcRenderer.invoke('db:reembed-all'),
    truncateAll: () => ipcRenderer.invoke('db:truncate-all'),
    updateChunk: (chunkId, newContent) => ipcRenderer.invoke('db:update-chunk', { chunkId, newContent }),
    onIngestProgress: (callback) => {
      const listener = (event, progress) => callback(progress)
      ipcRenderer.on('db:ingest-progress', listener)
      return () => ipcRenderer.removeListener('db:ingest-progress', listener)
    },
    onQueueUpdated: (callback) => {
      const listener = (event, queue) => callback(queue)
      ipcRenderer.on('db:queue-updated', listener)
      return () => ipcRenderer.removeListener('db:queue-updated', listener)
    },
    submitFeedback: (queryText, score, chunkId, documentId) => ipcRenderer.invoke('db:submit-feedback', queryText, score, chunkId, documentId)
  },
  config: {
    get: (key, defaultValue) => ipcRenderer.invoke('config:get', key, defaultValue),
    set: (key, value) => ipcRenderer.invoke('config:set', key, value)
  },
  app: {
    version: () => ipcRenderer.invoke('app:version'),
    checkLatestVersion: () => ipcRenderer.invoke('update:check-latest')
  },
  system: {
    openFile: (filePath) => ipcRenderer.invoke('system:open-file', filePath),
    fileExists: (filePath) => ipcRenderer.invoke('system:file-exists', filePath),
    resolvePaths: (paths) => ipcRenderer.invoke('system:resolve-paths', paths),
    selectFolder: () => ipcRenderer.invoke('system:select-folder'),
    registerEscape: () => ipcRenderer.invoke('system:register-escape'),
    unregisterEscape: () => ipcRenderer.invoke('system:unregister-escape'),
    readBrainDocs: () => ipcRenderer.invoke('system:read-brain-docs'),
    readFileContent: (filePath) => ipcRenderer.invoke('system:read-file-content', filePath)
  },
  windowControls: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close')
  },
  update: {
    check: () => ipcRenderer.invoke('update:check'),
    download: () => ipcRenderer.invoke('update:download'),
    install: () => ipcRenderer.invoke('update:install'),
    onUpdateAvailable: (callback) => {
      const listener = (event, info) => callback(info)
      ipcRenderer.on('update-available', listener)
      return () => ipcRenderer.removeListener('update-available', listener)
    },
    onUpdateNotAvailable: (callback) => {
      const listener = (event, info) => callback(info)
      ipcRenderer.on('update-not-available', listener)
      return () => ipcRenderer.removeListener('update-not-available', listener)
    },
    onUpdateDownloaded: (callback) => {
      const listener = (event, info) => callback(info)
      ipcRenderer.on('update-downloaded', listener)
      return () => ipcRenderer.removeListener('update-downloaded', listener)
    },
    onUpdateProgress: (callback) => {
      const listener = (event, progress) => callback(progress)
      ipcRenderer.on('update-progress', listener)
      return () => ipcRenderer.removeListener('update-progress', listener)
    },
    onUpdateError: (callback) => {
      const listener = (event, errMsg) => callback(errMsg)
      ipcRenderer.on('update-error', listener)
      return () => ipcRenderer.removeListener('update-error', listener)
    }
  }
}

// Disable context menu globally
if (typeof window !== 'undefined') {
  window.addEventListener('contextmenu', (e) => e.preventDefault())

  // Catch ESC events from the main process (e.g. from PDF webviews)
  ipcRenderer.on('global-escape', () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }))
  })
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = electronAPI
  window.api = api
}
