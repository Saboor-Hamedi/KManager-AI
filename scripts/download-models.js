#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { pipeline } from 'stream/promises'
import { Readable } from 'stream'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const targetBaseDir = path.join(rootDir, 'assets', 'models')

const MODELS = [
  {
    repo: 'Xenova/paraphrase-multilingual-MiniLM-L12-v2',
    files: [
      'config.json',
      'tokenizer.json',
      'tokenizer_config.json',
      'onnx/model_quantized.onnx'
    ]
  },
  {
    repo: 'Xenova/ms-marco-MiniLM-L-6-v2',
    files: [
      'config.json',
      'tokenizer.json',
      'tokenizer_config.json',
      'onnx/model_quantized.onnx'
    ]
  }
]

async function downloadFile(url, destPath) {
  if (fs.existsSync(destPath) && fs.statSync(destPath).size > 50) {
    console.log(`  ✔ Already cached: ${path.relative(rootDir, destPath)}`)
    return
  }

  fs.mkdirSync(path.dirname(destPath), { recursive: true })
  const tempPath = `${destPath}.tmp-${Date.now()}`

  console.log(`  ⬇ Downloading ${url}...`)
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`)
  }

  await pipeline(Readable.fromWeb(response.body), fs.createWriteStream(tempPath))
  fs.renameSync(tempPath, destPath)
  console.log(`  ✔ Saved: ${path.relative(rootDir, destPath)}`)
}

async function main() {
  console.log('\n\x1b[36m══ Checking / Downloading Local AI Models ══\x1b[0m')

  for (const model of MODELS) {
    console.log(`\n\x1b[33mModel: ${model.repo}\x1b[0m`)
    for (const file of model.files) {
      const url = `https://huggingface.co/${model.repo}/resolve/main/${file}`
      const destPath = path.join(targetBaseDir, model.repo, file)
      await downloadFile(url, destPath)
    }
  }

  console.log('\n\x1b[32m✔ All required offline AI models are ready in assets/models!\x1b[0m\n')
}

main().catch((err) => {
  console.error('\x1b[31mError ensuring models:\x1b[0m', err)
  process.exit(1)
})
