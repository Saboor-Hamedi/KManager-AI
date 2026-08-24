import os

with open('src/main/index.js', 'r', encoding='utf-8') as fs:
    lines = fs.readlines()

start_idx = -1
end_idx = -1

for i, line in enumerate(lines):
    if 'let db = null' in line and start_idx == -1:
        start_idx = i
    if 'ipcMain.handle(\'system:file-exists\'' in line:
        end_idx = i
        break

if start_idx != -1 and end_idx != -1:
    extracted_lines = lines[start_idx:end_idx]
    
    with open('src/main/db/db-handlers.js', 'w', encoding='utf-8') as f:
        f.write('''import { ipcMain, app } from 'electron'
import fs from 'fs'
import path from 'path'
import { Database } from './database.js'
import embeddingService from './embeddings.js'
import ingestionService from './ingestion.js'
import { performHybridSearch } from './Hybrid.js'
import fileSizeService from './fileSize.js'
import log from 'electron-log'

export function setupDbHandlers(getMainWindow, safeSendToWindow) {
  function safeSenderSend(sender, channel, ...args) {
    if (sender && !sender.isDestroyed()) {
      sender.send(channel, ...args)
    }
  }

''')
        for line in extracted_lines:
            f.write(line)
        f.write('}\n')

    new_lines = lines[:start_idx] + ['  setupDbHandlers(() => mainWindow, safeSendToWindow)\n\n'] + lines[end_idx:]
    
    with open('src/main/index.js', 'w', encoding='utf-8') as f:
        for line in new_lines:
            f.write(line)
            
    print('Extraction complete!')
else:
    print('Could not find bounds!', start_idx, end_idx)
