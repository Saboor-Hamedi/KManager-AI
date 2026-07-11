import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {},
  preload: {},
  renderer: {
    server: {
      port: 3000
    },
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        // Force all packages to use the same React instance.
        // This prevents "Invalid hook call" errors when heavy deps
        // like mermaid bundle their own copy of React.
        'react': resolve('node_modules/react'),
        'react-dom': resolve('node_modules/react-dom')
      },
      dedupe: ['react', 'react-dom']
    },
    plugins: [react()]
  }
})
