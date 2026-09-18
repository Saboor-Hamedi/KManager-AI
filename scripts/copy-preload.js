import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const mjs = path.join(rootDir, 'out', 'preload', 'index.mjs')
const js = path.join(rootDir, 'out', 'preload', 'index.js')

if (fs.existsSync(mjs)) {
  fs.copyFileSync(mjs, js)
}
