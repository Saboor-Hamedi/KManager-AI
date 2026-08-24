import { autoUpdater } from 'electron-updater'
import log from 'electron-log'
import { ipcMain, app } from 'electron'

log.transports.file.level = 'info'
autoUpdater.logger = log
autoUpdater.autoDownload = false        // User clicks Download in the UI
autoUpdater.autoInstallOnAppQuit = false // User clicks Restart in the UI

export function setupAutoUpdater(getMainWindow) {
  autoUpdater.on('update-available', (info) => {
    log.info('Update available:', info.version)
    const win = getMainWindow()
    if (win && !win.isDestroyed()) {
      win.webContents.send('update-available', info)
    }
  })

  autoUpdater.on('update-not-available', (info) => {
    log.info('No update available.')
    const win = getMainWindow()
    if (win && !win.isDestroyed()) {
      win.webContents.send('update-not-available', info)
    }
  })

  autoUpdater.on('download-progress', (progressObj) => {
    log.info(`Download progress: ${Math.round(progressObj.percent)}%`)
    const win = getMainWindow()
    if (win && !win.isDestroyed()) {
      win.webContents.send('update-progress', progressObj)
    }
  })

  autoUpdater.on('update-downloaded', (info) => {
    log.info('Update downloaded:', info.version)
    const win = getMainWindow()
    if (win && !win.isDestroyed()) {
      win.webContents.send('update-downloaded', info)
    }
  })

  autoUpdater.on('error', (err) => {
    if (err.message.includes('Please check update first')) {
      log.warn('AutoUpdater warning:', err.message)
    } else {
      log.error('AutoUpdater error:', err.message)
    }
    const win = getMainWindow()
    if (win && !win.isDestroyed()) {
      win.webContents.send('update-error', err.message)
    }
  })

  // Initial check on startup (small delay so the window is ready)
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((err) => log.warn('Update check failed:', err.message))
  }, 3000)

  // Periodic re-check every 30 minutes
  setInterval(() => {
    autoUpdater.checkForUpdates().catch((err) => log.warn('Periodic update check failed:', err.message))
  }, 30 * 60 * 1000)

  // Register IPC handlers only once
  ipcMain.handle('update:check', () => {
    return autoUpdater.checkForUpdates().catch((err) => {
      log.warn('Manual update check failed:', err.message)
      const win = getMainWindow()
      if (win && !win.isDestroyed()) {
        win.webContents.send('update-error', err.message)
      }
    })
  })

  ipcMain.handle('update:download', () => {
    return autoUpdater.downloadUpdate().catch((err) => {
      if (err.message.includes('Please check update first')) {
        log.warn('Download bypassed (no update available to download).')
      } else {
        log.error('Download failed:', err.message)
      }
    })
  })

  ipcMain.handle('update:install', () => {
    autoUpdater.quitAndInstall(true, true)
  })

  ipcMain.handle('update:check-latest', async () => {
    try {
      const res = await fetch('https://github.com/Saboor-Hamedi/KManager-AI/releases/latest/download/latest.yml')
      if (!res.ok) return null
      const text = await res.text()
      const match = text.match(/^version:\s*(\S+)/m)
      return match ? match[1] : null
    } catch {
      return null
    }
  })

  ipcMain.handle('app:version', () => {
    return app.getVersion()
  })
}
