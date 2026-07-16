import '@testing-library/jest-dom'
import React from 'react'

globalThis.React = React

// Mock scrollIntoView for jsdom
Element.prototype.scrollIntoView = vi.fn()
Element.prototype.scrollTo = vi.fn()

// Mock window.api for components that use the IPC bridge
globalThis.window.api = {
  db: {
    status: () => Promise.resolve({ connected: false }),
    stats: () => Promise.resolve({ success: true, stats: { total_docs: 0, total_chunks: 0, by_type: {} } }),
    search: () => Promise.resolve({ success: true, rows: [] }),
    lexicalSearch: () => Promise.resolve([]),
    getAnalytics: () => Promise.resolve({ success: true, metrics: {} }),
    getQueue: () => Promise.resolve([]),
    onIngestProgress: () => () => {},
    onQueueUpdated: () => () => {},
    submitFeedback: () => Promise.resolve({ success: true }),
    query: () => Promise.resolve({ rows: [] }),
    feedback: () => Promise.resolve({ success: true })
  },
  config: {
    get: (key, def) => Promise.resolve(def),
    set: () => Promise.resolve(true)
  },
  system: {
    fileExists: () => Promise.resolve(true),
    openFile: () => Promise.resolve({ success: true }),
    resolvePaths: () => Promise.resolve([]),
    selectFolder: () => Promise.resolve([]),
    registerEscape: () => Promise.resolve(),
    unregisterEscape: () => Promise.resolve()
  },
  windowControls: {
    minimize: () => {},
    maximize: () => {},
    close: () => {}
  },
  update: {
    check: () => Promise.resolve(),
    download: () => Promise.resolve(),
    install: () => Promise.resolve(),
    onUpdateAvailable: () => () => {},
    onUpdateDownloaded: () => () => {},
    onUpdateProgress: () => () => {}
  },
  getPathForFile: () => ''
}

// Mock electron process versions
globalThis.window.electron = {
  process: {
    versions: {
      electron: '30.0.0',
      chrome: '120.0.0',
      node: '20.0.0'
    }
  }
}
