import os

with open('src/main/index.js', 'r', encoding='utf-8') as fs:
    lines = fs.readlines()

start_config = -1
end_config = -1
start_sys = -1
end_sys = -1

for i, line in enumerate(lines):
    if '// Config Manager' in line and start_config == -1:
        start_config = i
    if 'setupDbHandlers(' in line and end_config == -1:
        end_config = i
    if 'ipcMain.handle(\'system:file-exists\'' in line and start_sys == -1:
        start_sys = i
    if 'createWindow()' in line and i > start_sys and end_sys == -1:
        end_sys = i

if start_config != -1 and end_config != -1 and start_sys != -1 and end_sys != -1:
    config_lines = lines[start_config:end_config]
    sys_lines = lines[start_sys:end_sys]
    
    with open('src/main/system-handlers.js', 'w', encoding='utf-8') as f:
        f.write('''import { ipcMain, app, shell } from 'electron'
import fs from 'fs'
import path from 'path'
import log from 'electron-log'
import pdfIngestionService from './services/pdfIngestion.js'

export function setupSystemHandlers() {
''')
        # write config lines
        for line in config_lines:
            # indent by 2 spaces for formatting inside function
            f.write('  ' + line)
            
        # write sys lines
        for line in sys_lines:
            f.write('  ' + line)
            
        f.write('}\n')

    # Remove these blocks from index.js
    # Ensure we delete from bottom up to avoid index shifting
    new_lines = lines[:start_sys] + ['\n'] + lines[end_sys:]
    new_lines = new_lines[:start_config] + ['  setupSystemHandlers()\n\n'] + new_lines[end_config:]
    
    with open('src/main/index.js', 'w', encoding='utf-8') as f:
        for line in new_lines:
            f.write(line)
            
    print('System extraction complete!')
else:
    print('Could not find bounds!', start_config, end_config, start_sys, end_sys)
