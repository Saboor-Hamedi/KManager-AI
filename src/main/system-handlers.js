import { ipcMain, app, shell } from 'electron'
import fs from 'fs'
import path from 'path'
import log from 'electron-log'
import pdfIngestionService from './services/pdfIngestion.js'

export function setupSystemHandlers() {
  // Config Manager
  const configPath = path.join(app.getPath('userData'), 'config.json')
  
  let configData = {}
  try {
    if (fs.existsSync(configPath)) {
      configData = JSON.parse(fs.readFileSync(configPath, 'utf8'))
    }
  } catch (err) {
    console.error('Failed to load config:', err)
  }

  const saveConfig = () => {
    try {
      fs.writeFileSync(configPath, JSON.stringify(configData, null, 2))
    } catch (err) {
      console.error('Failed to save config:', err)
    }
  }

  ipcMain.handle('config:get', (_event, key, defaultValue) => {
    return configData[key] !== undefined ? configData[key] : defaultValue
  })

  ipcMain.handle('config:set', (_event, key, value) => {
    configData[key] = value
    saveConfig()
    return true
  })

  ipcMain.handle('system:toggle-autolaunch', (_event, enable) => {
    app.setLoginItemSettings({
      openAtLogin: enable,
      path: app.getPath('exe')
    })
    configData['autoLaunch'] = enable
    saveConfig()
    return true
  })

  ipcMain.handle('system:get-autolaunch', () => {
    return app.getLoginItemSettings().openAtLogin
  })

  ipcMain.handle('system:file-exists', async (_event, filePath) => {
    try {
      return Boolean(filePath && fs.existsSync(filePath))
    } catch (err) {
      return false
    }
  })

  ipcMain.handle('system:open-file', async (_event, filePath) => {
    try {
      if (fs.existsSync(filePath)) {
        await shell.openPath(filePath)
        return { success: true }
      }
      return { success: false, message: 'File does not exist' }
    } catch (err) {
      return { success: false, message: err.message }
    }
  })

  ipcMain.handle('system:resolve-paths', async (_event, paths) => {
    const validExts = [
      '.pdf', '.txt', '.md', '.json', '.csv',
      '.html', '.xml', '.log', '.doc', '.docx', '.xlsx',
      '.py', '.js', '.jsx', '.ts', '.tsx', '.sql', '.sh', '.yml', '.yaml'
    ]
    const results = []
    
    async function scan(currentPath) {
      if (results.length >= 5000) return // Hard cap to prevent runaway memory
      try {
        const stat = await fs.promises.stat(currentPath)
        if (stat.isDirectory()) {
          const entries = await fs.promises.readdir(currentPath, { withFileTypes: true })
          for (const entry of entries) {
            if (results.length >= 5000) return
            await scan(path.join(currentPath, entry.name))
          }
        } else {
          const ext = path.extname(currentPath).toLowerCase()
          if (validExts.includes(ext)) {
            results.push(currentPath)
          }
        }
      } catch (err) {
        console.error('Error resolving path:', currentPath, err)
      }
    }

    for (const p of paths) {
      await scan(p)
    }
    return results
  })

  ipcMain.handle('system:select-folder', async () => {
    const { dialog } = require('electron')
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'multiSelections']
    })
    if (result.canceled) return []
    return result.filePaths
  })

  ipcMain.handle('system:read-brain-docs', async () => {
    try {
      const brainPath = path.join(app.getAppPath(), 'brain')
      if (!fs.existsSync(brainPath)) {
        return { GENERAL: [{ title: 'No Documentation', path: '', type: 'md' }] }
      }

      const categories = {}
      const entries = fs.readdirSync(brainPath, { withFileTypes: true })

      // Always include root-level .md files as GENERAL category
      const generalDocs = entries
        .filter(e => e.isFile() && e.name.endsWith('.md'))
        .map(f => {
          const title = f.name.replace(/\.md$/, '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
          return { title, path: path.join(brainPath, f.name), type: 'md' }
        })
      if (generalDocs.length > 0) {
        categories['GENERAL'] = generalDocs
      }

      // Process subdirectory categories
      for (const entry of entries) {
        if (!entry.isDirectory()) continue
        const categoryDir = path.join(brainPath, entry.name)
        const docs = fs.readdirSync(categoryDir).filter(f => f.endsWith('.md')).map(f => {
          const title = f.replace(/\.md$/, '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
          return { title, path: path.join(categoryDir, f), type: 'md' }
        })
        if (docs.length > 0) {
          categories[entry.name.toUpperCase()] = docs
        }
      }

      return categories
    } catch (err) {
      console.error('Failed to read brain docs:', err)
      return { GENERAL: [{ title: 'Error loading docs', path: '', type: 'md' }] }
    }
  })

  ipcMain.handle('system:read-file-content', async (_event, filePath) => {
    try {
      if (!filePath || !fs.existsSync(filePath)) return null
      // Use the advanced ingestion service to parse PDFs, Excel, Word, and text files natively
      const content = await pdfIngestionService.extractText(filePath)
      return content
    } catch (err) {
      console.error('Failed to read file:', err)
      return null
    }
  })

  ipcMain.handle('system:read-file-binary', async (_event, filePath) => {
    try {
      if (!filePath || !fs.existsSync(filePath)) return null
      const buffer = await fs.promises.readFile(filePath)
      return buffer
    } catch (error) {
      log.error(`Failed to read binary file ${filePath}:`, error)
      return null
    }
  })

  ipcMain.handle('system:save-file-content', async (_event, filePath, content) => {
    try {
      if (!filePath) throw new Error('File path required')
      await fs.promises.writeFile(filePath, content, 'utf8')
      return { success: true }
    } catch (error) {
      log.error(`Failed to save file content ${filePath}:`, error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('system:show-in-folder', async (_event, filePath) => {
    try {
      if (!filePath || !fs.existsSync(filePath)) return null
      shell.showItemInFolder(filePath)
      return { success: true }
    } catch (error) {
      log.error(`Failed to show file in folder ${filePath}:`, error)
      return { success: false, error: error.message }
    }
  })
}
