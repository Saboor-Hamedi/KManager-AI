import '@testing-library/jest-dom'
import React from 'react'

globalThis.React = React

// Mock scrollIntoView for jsdom
Element.prototype.scrollIntoView = vi.fn()
Element.prototype.scrollTo = vi.fn()

// Mock ResizeObserver for jsdom (used by Wrapper, virtual lists, etc.)
class MockResizeObserver {
  constructor(callback) {
    this.callback = callback
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = globalThis.ResizeObserver || MockResizeObserver

// Mock matchMedia for components that rely on media queries
if (!globalThis.matchMedia) {
  globalThis.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }))
}

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined)
  }
})

// Polyfill browser APIs required by pdfjs-dist / canvas usage in jsdom
class MockDOMMatrix {
  constructor(init) {
    if (Array.isArray(init)) this.m = init.slice()
    else this.m = [1, 0, 0, 1, 0, 0]
  }
  multiplySelf() { return this }
  preMultiplySelf() { return this }
  translateSelf() { return this }
  scaleSelf() { return this }
  invertSelf() { return this }
  static fromMatrix() { return new MockDOMMatrix() }
  static fromFloat32Array() { return new MockDOMMatrix() }
  static fromFloat64Array() { return new MockDOMMatrix() }
  get a() { return this.m[0] }
  get b() { return this.m[1] }
  get c() { return this.m[2] }
  get d() { return this.m[3] }
  get e() { return this.m[4] }
  get f() { return this.m[5] }
}
if (!globalThis.DOMMatrix) globalThis.DOMMatrix = MockDOMMatrix
if (!globalThis.DOMMatrixReadOnly) globalThis.DOMMatrixReadOnly = MockDOMMatrix
if (!globalThis.Path2D) globalThis.Path2D = class Path2D {}
if (!globalThis.OffscreenCanvas) globalThis.OffscreenCanvas = class OffscreenCanvas { getContext() { return null } }
if (!globalThis.ImageData) globalThis.ImageData = class ImageData {
  constructor(w, h) { this.width = w; this.height = h; this.data = new Uint8ClampedArray(w * h * 4) }
}
if (!globalThis.CanvasRenderingContext2D) globalThis.CanvasRenderingContext2D = class {}
if (!globalThis.HTMLCanvasElement?.prototype?.getContext) {
  globalThis.HTMLCanvasElement.prototype.getContext = () => ({
    fillRect: vi.fn(), scale: vi.fn(), setTransform: vi.fn(), transform: vi.fn(), resetTransform: vi.fn(),
    translate: vi.fn(), clearRect: vi.fn(), drawImage: vi.fn(), beginPath: vi.fn(), closePath: vi.fn(),
    fill: vi.fn(), stroke: vi.fn(), rect: vi.fn(), arc: vi.fn(), fillText: vi.fn(), strokeText: vi.fn(),
    measureText: () => ({ width: 0 }), save: vi.fn(), restore: vi.fn(), createLinearGradient: () => ({ addColorStop: vi.fn() })
  })
}

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
  app: {
    version: () => Promise.resolve('1.0.0'),
    checkLatestVersion: () => Promise.resolve(null)
  },
  system: {
    fileExists: () => Promise.resolve(true),
    openFile: () => Promise.resolve({ success: true }),
    resolvePaths: () => Promise.resolve([]),
    selectFolder: () => Promise.resolve([]),
    registerEscape: () => Promise.resolve(),
    unregisterEscape: () => Promise.resolve(),
    getAutoLaunch: () => Promise.resolve(false),
    toggleAutoLaunch: () => Promise.resolve({ success: true })
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
    onUpdateNotAvailable: () => () => {},
    onUpdateDownloaded: () => () => {},
    onUpdateProgress: () => () => {},
    onUpdateError: () => () => {}
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
