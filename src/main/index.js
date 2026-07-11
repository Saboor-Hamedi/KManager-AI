import { app, shell, BrowserWindow, Menu, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { Database } from './db/database.js'

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    title: 'Dashboard',
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

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
  electronApp.setAppUserModelId('com.electron')
  Menu.setApplicationMenu(null)
  app.on('browser-window-created', (_, window) => {
    window.autoHideMenuBar = true
    window.setMenuBarVisibility(false)
    optimizer.watchWindowShortcuts(window)
  })

  // Config Manager
  const fs = require('fs')
  const path = require('path')
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

  ipcMain.handle('db:status', async () => {
    return { connected: db ? db.isConnected() : false }
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
