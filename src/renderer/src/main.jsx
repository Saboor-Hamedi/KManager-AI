import './assets/main.css'
import './components/theme/theme.css'

// Safe browser fallback when running on localhost outside Electron
if (typeof window !== 'undefined' && !window.api) {
  window.api = {
    getPathForFile: (f) => f.name || '',
    db: {
      testConnection: async () => ({ success: false, error: 'Database requires running in the desktop Electron app.' }),
      connect: async () => ({ success: false, error: 'Database requires running in the desktop Electron app.' }),
      disconnect: async () => {},
      query: async () => ({ rows: [] }),
      status: async () => ({ connected: false }),
      stats: async () => ({ totalDocuments: 0, totalChunks: 0 }),
      search: async () => [],
      lexicalSearch: async () => [],
      getAnalytics: async () => ({ totalDocuments: 0, totalChunks: 0, fileTypes: [] }),
      ingestFile: async () => {},
      ingestAIResponse: async () => {},
      updateAIResponse: async () => {},
      updateDocumentTitle: async () => {},
      queueFiles: async () => {},
      getQueue: async () => [],
      cancelQueue: async () => {},
      clearQueue: async () => {},
      reembedAll: async () => {},
      truncateAll: async () => {},
      updateChunk: async () => {},
      onIngestProgress: () => () => {},
      onQueueUpdated: () => () => {},
      submitFeedback: async () => {}
    },
    config: {
      get: async (k, def) => localStorage.getItem(`cfg_${k}`) ?? def,
      set: async (k, v) => localStorage.setItem(`cfg_${k}`, String(v))
    },
    app: {
      version: async () => '1.0.12 (Browser)',
      checkLatestVersion: async () => null
    },
    server: {
      getPort: async () => 3000
    },
    system: {
      openFile: async () => {},
      fileExists: async () => false,
      resolvePaths: async (p) => p,
      selectFolder: async () => null,
      registerEscape: async () => {},
      unregisterEscape: async () => {},
      readBrainDocs: async () => ({ success: true, docs: [] }),
      readFileContent: async () => '',
      readFileBinary: async () => new Uint8Array(),
      saveFileContent: async () => {},
      showInFolder: async () => {},
      toggleAutoLaunch: async () => {},
      getAutoLaunch: async () => false
    },
    windowControls: {
      minimize: () => {},
      maximize: () => {},
      close: () => {}
    },
    update: {
      check: async () => {},
      download: async () => {},
      install: async () => {},
      onUpdateAvailable: () => () => {},
      onUpdateNotAvailable: () => () => {},
      onUpdateDownloaded: () => () => {},
      onUpdateProgress: () => () => {},
      onUpdateError: () => () => {}
    }
  }
}

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)
