import { app, shell, BrowserWindow, Menu, ipcMain, protocol, net, Tray, nativeImage } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { setupAutoUpdater } from './update.js'
import { setupDbHandlers } from './db/db-handlers.js'
import { setupSystemHandlers } from './system-handlers.js'
import { setupPdfServer } from './pdf-server.js'

let mainWindow = null
let appIsQuitting = false
let tray = null

function safeSendToWindow(channel, ...args) {
  try {
    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents && !mainWindow.webContents.isDestroyed()) {
      mainWindow.webContents.send(channel, ...args)
    }
  } catch (err) {
    // Ignore destroyed object errors when app closes
  }
}

function safeSenderSend(sender, channel, ...args) {
  try {
    if (sender && !sender.isDestroyed()) {
      sender.send(channel, ...args)
    } else {
      safeSendToWindow(channel, ...args)
    }
  } catch (err) {
    safeSendToWindow(channel, ...args)
  }
  try {
    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents && !mainWindow.webContents.isDestroyed() && mainWindow.webContents !== sender) {
      mainWindow.webContents.send(channel, ...args)
    }
  } catch (err) {
    // Ignore destroyed window errors
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 600,
    show: false,
    frame: false,
    titleBarStyle: 'hidden',
    title: 'Knowledge Management Studio — KManager AI',
    autoHideMenuBar: true,
    icon: icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      plugins: true,
      webSecurity: false,
      webviewTag: true
    }
  })

  // ── Global Escape Catcher ──
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

  mainWindow.on('blur', () => globalShortcut.unregister('Escape'))
  
  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.on('close', (e) => {
    if (!appIsQuitting) {
      e.preventDefault()
      mainWindow.hide()
    }
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
  tray = new Tray(icon)
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show KManager', click: () => { if (mainWindow) mainWindow.show() } },
    { type: 'separator' },
    { label: 'Quit', click: () => { appIsQuitting = true; app.quit() } }
  ])
  tray.setToolTip('KManager AI')
  tray.setContextMenu(contextMenu)
  tray.on('click', () => { if (mainWindow) mainWindow.show() })

  const { globalShortcut } = require('electron')
  globalShortcut.register('CommandOrControl+K', () => {
    if (mainWindow) {
      mainWindow.show()
      mainWindow.focus()
      mainWindow.webContents.send('open-spotlite')
    }
  })

  setupPdfServer()

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
    if (win === mainWindow && !appIsQuitting) {
      win.hide()
    } else if (win) {
      win.close()
    }
  })

  electronApp.setAppUserModelId('com.electron')
  Menu.setApplicationMenu(null)
  app.on('browser-window-created', (_, window) => {
    window.autoHideMenuBar = true
    window.setMenuBarVisibility(false)
    optimizer.watchWindowShortcuts(window)

    window.webContents.on('before-input-event', (event, input) => {
      if (input.control && input.shift && input.key.toLowerCase() === 'i') {
        window.webContents.toggleDevTools()
        event.preventDefault()
      }
      if (input.key === 'F12') {
        window.webContents.toggleDevTools()
        event.preventDefault()
      }
      if (input.control && input.key.toLowerCase() === 'r') {
        window.reload()
        event.preventDefault()
      }
    })
  })

  setupSystemHandlers()
  setupDbHandlers(() => mainWindow, safeSendToWindow)

  createWindow()
  setupAutoUpdater(() => mainWindow)

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('before-quit', () => {
  appIsQuitting = true
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
