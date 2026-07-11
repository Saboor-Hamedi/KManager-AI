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
    ingestFile: (filePath) => ipcRenderer.invoke('db:ingest-file', filePath),
    reembedAll: () => ipcRenderer.invoke('db:reembed-all'),
    truncateAll: () => ipcRenderer.invoke('db:truncate-all'),
    onIngestProgress: (callback) => {
      const listener = (event, progress) => callback(progress)
      ipcRenderer.on('db:ingest-progress', listener)
      return () => ipcRenderer.removeListener('db:ingest-progress', listener)
    },
    submitFeedback: (queryText, score, chunkId, documentId) => ipcRenderer.invoke('db:submit-feedback', queryText, score, chunkId, documentId)
  },
  config: {
    get: (key, defaultValue) => ipcRenderer.invoke('config:get', key, defaultValue),
    set: (key, value) => ipcRenderer.invoke('config:set', key, value)
  },
  system: {
    openFile: (filePath) => ipcRenderer.invoke('system:open-file', filePath),
    fileExists: (filePath) => ipcRenderer.invoke('system:file-exists', filePath),
    resolvePaths: (paths) => ipcRenderer.invoke('system:resolve-paths', paths),
    selectFolder: () => ipcRenderer.invoke('system:select-folder')
  }
}

// Disable context menu globally
if (typeof window !== 'undefined') {
  window.addEventListener('contextmenu', (e) => e.preventDefault())
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
