import { app, shell, BrowserWindow, Menu, ipcMain, protocol, net } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { Database } from './db/database.js'
import embeddingService from './db/embeddings.js'
import ingestionService from './db/ingestion.js'
import fs from 'fs'
import path from 'path'
import http from 'http'
import { performHybridSearch } from './db/Hybrid.js'

// PDF Server
let pdfPort = 0
const pdfServer = http.createServer((req, res) => {
  try {
    const filePath = decodeURIComponent(req.url.slice(1).split('#')[0])
    if (fs.existsSync(filePath)) {
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Access-Control-Allow-Origin', '*')
      fs.createReadStream(filePath).pipe(res)
    } else {
      res.statusCode = 404
      res.end('Not Found')
    }
  } catch (err) {
    res.statusCode = 500
    res.end('Error')
  }
})
pdfServer.listen(0, '127.0.0.1', () => {
  pdfPort = pdfServer.address().port
})

let mainWindow = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 700,
    show: false,
    frame: false,
    titleBarStyle: 'hidden',
    title: 'Knowledge Management Studio — KManager AI',
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      plugins: true,
      webSecurity: false,
      webviewTag: true
    }
  })

  // ── Global Escape Catcher ──
  // Webviews (like the PDF viewer plugin) completely swallow keyboard events.
  // We use globalShortcut registered temporarily by the renderer to catch ESC.
  const { globalShortcut } = require('electron')
  
  ipcMain.handle('system:register-escape', () => {
    globalShortcut.register('Escape', () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('global-escape')
      }
    })
  })

  ipcMain.handle('system:unregister-escape', () => {
    globalShortcut.unregister('Escape')
  })

  // Unregister when window loses focus so we don't break ESC in other apps
  mainWindow.on('blur', () => globalShortcut.unregister('Escape'))
  
  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  ipcMain.handle('get-pdf-port', () => {
    return pdfPort
  })

  ipcMain.on('window:minimize', () => {
    const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0]
    if (win) win.minimize()
  })

  ipcMain.on('window:maximize', () => {
    const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0]
    if (win) {
      if (win.isMaximized()) {
        win.unmaximize()
        win.setSize(800, 700)
      } else {
        win.maximize()
      }
    }
  })

  ipcMain.on('window:close', () => {
    const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0]
    if (win) win.close()
  })

  electronApp.setAppUserModelId('com.electron')
  Menu.setApplicationMenu(null)
  app.on('browser-window-created', (_, window) => {
    window.autoHideMenuBar = true
    window.setMenuBarVisibility(false)
    optimizer.watchWindowShortcuts(window)
  })

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

  let db = null

  ipcMain.handle('db:test-connection', async (_event, config) => {
    const testDb = new Database(config)
    return await testDb.testConnection(config)
  })

  ipcMain.handle('db:connect', async (_event, config) => {
    db = new Database(config)
    return await db.connect()
  })

  ipcMain.handle('db:disconnect', async () => {
    if (db) {
      await db.disconnect()
      db = null
    }
    return { success: true }
  })

  ipcMain.handle('db:query', async (_event, text, params) => {
    if (!db) return { success: false, message: 'Not connected' }
    try {
      const res = await db.query(text, params)
      return { success: true, rows: res.rows, rowCount: res.rowCount }
    } catch (err) {
      return { success: false, message: err.message }
    }
  })

  ipcMain.handle('db:init-schema', async () => {
    if (!db) return { success: false, message: 'Not connected' }
    try {
      const isProd = app.isPackaged
      let finalPath = isProd 
        ? path.join(process.resourcesPath, 'schema.sql')
        : path.join(app.getAppPath(), 'schema.sql')
        
      if (!fs.existsSync(finalPath)) {
        return { success: false, message: 'schema.sql not found at ' + finalPath }
      }
      
      const sql = fs.readFileSync(finalPath, 'utf8')
      await db.query(sql)
      return { success: true, message: 'Schema successfully initialized!' }
    } catch (err) {
      return { success: false, message: 'Schema Error: ' + err.message }
    }
  })

  ipcMain.handle('db:search', async (_event, queryText, limit = 10) => {
    try {
      const rows = await performHybridSearch(db, queryText, limit)
      return { success: true, rows }
    } catch (err) {
      console.error('db:search error:', err)
      return { success: false, message: err.message }
    }
  })

  ipcMain.handle('db:ingest-file', async (event, filePath) => {
    if (!db || !db.isConnected()) {
      return { success: false, message: 'Database not connected' }
    }
    try {
      const result = await ingestionService.ingestFile(filePath, db, (progressUpdate) => {
        event.sender.send('db:ingest-progress', progressUpdate)
      })
      return result
    } catch (err) {
      console.error('db:ingest-file error:', err)
      return { success: false, message: err.message }
    }
  })

  ipcMain.handle('db:reembed-all', async (event) => {
    if (!db || !db.isConnected()) {
      return { success: false, message: 'Database not connected' }
    }
    try {
      return await ingestionService.reembedAll(db, (progressUpdate) => {
        event.sender.send('db:ingest-progress', progressUpdate)
      })
    } catch (err) {
      console.error('db:reembed-all error:', err)
      return { success: false, message: err.message }
    }
  })

  ipcMain.handle('db:truncate-all', async () => {
    if (!db || !db.isConnected()) {
      return { success: false, message: 'Database not connected' }
    }
    try {
      return await ingestionService.truncateAll(db)
    } catch (err) {
      console.error('db:truncate-all error:', err)
      return { success: false, message: err.message }
    }
  })

  ipcMain.handle('db:submit-feedback', async (_event, queryText, score) => {
    if (!db || !db.isConnected()) return { success: false }
    try {
      await db.query(
        'INSERT INTO search_feedback (query_text, score) VALUES ($1, $2)',
        [queryText, score]
      )
      return { success: true }
    } catch (err) {
      console.error('db:submit-feedback error:', err)
      return { success: false, message: err.message }
    }
  })

  ipcMain.handle('db:status', async () => {
    return { connected: db ? db.isConnected() : false }
  })

  ipcMain.handle('db:stats', async () => {
    if (!db || !db.isConnected()) {
      return { success: false, message: 'Database not connected' }
    }
    try {
      const res = await db.query('SELECT * FROM get_document_stats()')
      return { success: true, stats: res.rows[0] }
    } catch (err) {
      try {
        const docRes = await db.query('SELECT COUNT(*)::bigint AS cnt FROM documents')
        const chunkRes = await db.query('SELECT COUNT(*)::bigint AS cnt FROM embedding_documents')
        const typeRes = await db.query('SELECT file_type, COUNT(*)::bigint AS cnt FROM documents GROUP BY file_type')
        const byType = {}
        typeRes.rows.forEach(r => { byType[r.file_type] = Number(r.cnt) })
        return {
          success: true,
          stats: {
            total_docs: Number(docRes.rows[0].cnt),
            total_chunks: Number(chunkRes.rows[0].cnt),
            by_type: byType
          }
        }
      } catch (fallbackErr) {
        return { success: false, message: fallbackErr.message }
      }
    }
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
    const validExts = ['.pdf', '.txt', '.md', '.json', '.csv', '.doc', '.docx', '.xlsx']
    const results = []
    
    async function scan(currentPath) {
      try {
        const stat = await fs.promises.stat(currentPath)
        if (stat.isDirectory()) {
          const entries = await fs.promises.readdir(currentPath, { withFileTypes: true })
          for (const entry of entries) {
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

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// --- Auto Updater ---
import { autoUpdater } from 'electron-updater'
import log from 'electron-log'

log.transports.file.level = 'info'
autoUpdater.logger = log
autoUpdater.autoDownload = false // We want the user to click download manually in the UI

app.on('ready', () => {
  autoUpdater.checkForUpdatesAndNotify()
})

autoUpdater.on('update-available', (info) => {
  log.info('Update available.')
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('update-available', info)
})

autoUpdater.on('update-downloaded', (info) => {
  log.info('Update downloaded')
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('update-downloaded', info)
})

autoUpdater.on('download-progress', (progressObj) => {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('update-progress', progressObj)
})

ipcMain.handle('update:check', () => {
  autoUpdater.checkForUpdates()
})

ipcMain.handle('update:download', () => {
  autoUpdater.downloadUpdate()
})

ipcMain.handle('update:install', () => {
  autoUpdater.quitAndInstall()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
