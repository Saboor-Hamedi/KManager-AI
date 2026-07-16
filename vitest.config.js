import { defineConfig } from 'vitest/config'
import { resolve } from 'path'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.js'],
    include: ['test/unit/**/*.test.{js,jsx}'],
    exclude: ['node_modules', 'dist', 'out'],
    css: {
      modules: { classNameStrategy: 'non-scoped' },
      include: []
    },
    testTimeout: 15000,
    hookTimeout: 15000,
    server: {
      deps: {
        inline: ['@xenova/transformers']
      }
    }
  },
  resolve: {
    alias: {
      '@renderer': resolve('src/renderer/src'),
      '@main': resolve('src/main')
    }
  }
})
