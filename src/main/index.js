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
  let ingestionQueue = []
  let isIngesting = false
  let cancelIngestionFlag = false

  async function processQueue() {
    isIngesting = true
    cancelIngestionFlag = false
    
    while (ingestionQueue.length > 0) {
      if (cancelIngestionFlag) break
      
      const index = ingestionQueue.findIndex(q => q.status === 'pending')
      if (index === -1) break // Nothing left
      
      const item = ingestionQueue[index]
      item.status = 'processing'
      mainWindow?.webContents.send('db:queue-updated', ingestionQueue)
      
      try {
        const fileStart = Date.now()
        let lastProgressTime = 0
        const result = await ingestionService.ingestFile(item.path, db, (progressUpdate) => {
          const now = Date.now()
          // Only send update if complete/error, or if 150ms has passed since last update
          if (progressUpdate.status === 'complete' || progressUpdate.status === 'error' || now - lastProgressTime > 150) {
            lastProgressTime = now
            mainWindow?.webContents.send('db:ingest-progress', { ...progressUpdate, fileName: item.name })
          }
        }, () => cancelIngestionFlag)
        
        const ms = Date.now() - fileStart
        item.timing = ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`
        
        if (result?.success) {
          ingestionQueue.splice(index, 1) // Remove on success
        } else {
          item.status = 'error'
          item.timing = result?.message || 'Failed'
        }
      } catch (err) {
        item.status = 'error'
        item.timing = 'Failed'
      }
      
      mainWindow?.webContents.send('db:queue-updated', ingestionQueue)
      await new Promise(r => setTimeout(r, 50)) // Prevent blocking
    }
    
    isIngesting = false
    mainWindow?.webContents.send('db:ingest-progress', { status: 'idle' })
    if (cancelIngestionFlag) {
      mainWindow?.webContents.send('db:ingest-progress', { status: 'idle' })
    }
  }

  ipcMain.handle('db:queue-files', async (event, filePaths) => {
    const newItems = filePaths.map(p => ({
      id: `${p}-${Date.now()}-${Math.random()}`,
      path: p,
      name: p.split(/[\\/]/).pop(),
      status: 'pending',
      timing: null
    }))
    ingestionQueue.push(...newItems)
    mainWindow?.webContents.send('db:queue-updated', ingestionQueue)
    
    if (!isIngesting) {
      processQueue()
    }
    return { success: true }
  })

  ipcMain.handle('db:get-queue', () => {
    return ingestionQueue
  })

  ipcMain.handle('db:cancel-queue', () => {
    cancelIngestionFlag = true
    ingestionQueue = ingestionQueue.filter(q => q.status !== 'pending')
    mainWindow?.webContents.send('db:queue-updated', ingestionQueue)
    return { success: true }
  })

  ipcMain.handle('db:clear-queue', () => {
    // Keep pending/processing, drop errors
    ingestionQueue = ingestionQueue.filter(q => q.status === 'processing' || q.status === 'pending')
    mainWindow?.webContents.send('db:queue-updated', ingestionQueue)
    return { success: true }
  })

  ipcMain.handle('db:ingest-text', async (event, { title, text }) => {
    if (!db || !db.isConnected()) return { success: false, message: 'Database not connected' }
    try {
      const res = await ingestionService.ingestText(title, text, db)
      mainWindow?.webContents.send('db:stats-updated') // If applicable, notify frontend
      return res
    } catch (err) {
      console.error('db:ingest-text error:', err)
      return { success: false, message: err.message }
    }
  })

  ipcMain.handle('db:patch-search', async () => {
    if (!db || !db.isConnected()) return { success: false, message: 'Database not connected' }
    try {
      await db.query('CREATE EXTENSION IF NOT EXISTS pg_trgm')
      // Create a trigram index for faster fuzzy search
      await db.query(`CREATE INDEX IF NOT EXISTS idx_chunks_content_trgm ON embedding_documents USING GIN(content gin_trgm_ops)`)
      await db.query(`
        DROP FUNCTION IF EXISTS search_chunks(text, vector, integer);
        CREATE OR REPLACE FUNCTION search_chunks(
          query_text TEXT,
          query_embedding VECTOR(384),
          result_limit INT DEFAULT 10
        )
        RETURNS TABLE (
          id UUID, document_id UUID, chunk_index INT, content TEXT,
          vault_path TEXT, file_name TEXT, file_type TEXT, similarity FLOAT
        )
        LANGUAGE plpgsql AS $$
        BEGIN
          RETURN QUERY
          WITH semantic_search AS (
            SELECT dc.id, RANK() OVER (ORDER BY dc.embedding <=> query_embedding) AS semantic_rank
            FROM embedding_documents dc
            WHERE dc.embedding IS NOT NULL
            ORDER BY dc.embedding <=> query_embedding LIMIT 100
          ),
          keyword_search AS (
            SELECT dc.id, RANK() OVER (ORDER BY ts_rank_cd(dc.fts_vector, plainto_tsquery('simple', query_text)) DESC) AS keyword_rank
            FROM embedding_documents dc
            WHERE dc.fts_vector @@ plainto_tsquery('simple', query_text)
            ORDER BY ts_rank_cd(dc.fts_vector, plainto_tsquery('simple', query_text)) DESC LIMIT 100
          ),
          fuzzy_search AS (
            SELECT dc.id, RANK() OVER (ORDER BY similarity(dc.content, query_text) DESC) AS fuzzy_rank
            FROM embedding_documents dc
            WHERE similarity(dc.content, query_text) > 0.08
            ORDER BY similarity(dc.content, query_text) DESC LIMIT 100
          )
          SELECT dc.id, dc.document_id, dc.chunk_index, dc.content, d.vault_path, d.file_name, d.file_type,
            (COALESCE(1.0 / (60 + ss.semantic_rank), 0.0) +
             COALESCE(2.0 / (60 + ks.keyword_rank), 0.0) +
             COALESCE(1.5 / (60 + fs.fuzzy_rank), 0.0))::FLOAT AS similarity
          FROM embedding_documents dc
          JOIN documents d ON d.id = dc.document_id
          LEFT JOIN semantic_search ss ON ss.id = dc.id
          LEFT JOIN keyword_search ks ON ks.id = dc.id
          LEFT JOIN fuzzy_search fs ON fs.id = dc.id
          WHERE ss.id IS NOT NULL OR ks.id IS NOT NULL OR fs.id IS NOT NULL
          ORDER BY similarity DESC LIMIT result_limit;
        END;
        $$;
      `)
      return { success: true }
    } catch (err) {
      console.error('db:patch-search error:', err)
      return { success: false, message: err.message }
    }
  })

  ipcMain.handle('db:test-connection', async (_event, config) => {
    const testDb = new Database(config)
    return await testDb.testConnection(config)
  })

  ipcMain.handle('db:connect', async (_event, config) => {
    db = new Database(config)
    const result = await db.connect()
    if (result.success) {
      // Silently patch the DB for fuzzy/typo-tolerant search on every connect
      ;(async () => {
        try {
          await db.query(`
            CREATE TABLE IF NOT EXISTS search_logs (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              query_text TEXT NOT NULL,
              latency_ms INT NOT NULL,
              result_count INT NOT NULL,
              top_similarity FLOAT DEFAULT 0,
              is_fallback BOOLEAN DEFAULT FALSE,
              created_at TIMESTAMPTZ DEFAULT NOW()
            )
          `)
          
          // Ensure new columns exist for existing installations
          try {
            await db.query('ALTER TABLE search_logs ADD COLUMN IF NOT EXISTS top_similarity FLOAT DEFAULT 0')
          } catch (e) {
            // ignore if column exists
          }

          await db.query('CREATE EXTENSION IF NOT EXISTS pg_trgm')
          await db.query('CREATE EXTENSION IF NOT EXISTS fuzzystrmatch')
          await db.query('CREATE INDEX IF NOT EXISTS idx_chunks_content_trgm ON embedding_documents USING GIN(content gin_trgm_ops)')
          // Replace search_chunks with the full 3-leg hybrid: semantic + FTS + trigram fuzzy
          await db.query(`DROP FUNCTION IF EXISTS search_chunks(text, vector, integer)`)
          await db.query(`
            CREATE OR REPLACE FUNCTION search_chunks(
              query_text TEXT,
              query_embedding VECTOR(384),
              result_limit INT DEFAULT 10
            )
            RETURNS TABLE (
              id UUID, document_id UUID, chunk_index INT, content TEXT,
              vault_path TEXT, file_name TEXT, file_type TEXT, created_at TIMESTAMPTZ, similarity FLOAT
            )
            LANGUAGE plpgsql AS $func$
            BEGIN
              RETURN QUERY
              WITH semantic_search AS (
                SELECT dc.id,
                  RANK() OVER (ORDER BY dc.embedding <=> query_embedding) AS semantic_rank
                FROM embedding_documents dc
                WHERE dc.embedding IS NOT NULL
                ORDER BY dc.embedding <=> query_embedding LIMIT 100
              ),
              keyword_search AS (
                SELECT dc.id,
                  RANK() OVER (ORDER BY ts_rank_cd(dc.fts_vector, websearch_to_tsquery('simple', query_text)) DESC) AS keyword_rank
                FROM embedding_documents dc
                WHERE dc.fts_vector @@ websearch_to_tsquery('simple', query_text)
                ORDER BY ts_rank_cd(dc.fts_vector, websearch_to_tsquery('simple', query_text)) DESC LIMIT 100
              ),
              fuzzy_search AS (
                SELECT dc.id,
                  RANK() OVER (ORDER BY word_similarity(query_text, dc.content) DESC) AS fuzzy_rank
                FROM embedding_documents dc
                WHERE word_similarity(query_text, dc.content) > 0.12
                ORDER BY word_similarity(query_text, dc.content) DESC LIMIT 100
              )
              SELECT dc.id, dc.document_id, dc.chunk_index, dc.content,
                d.vault_path, d.file_name, d.file_type, d.created_at,
                (COALESCE(1.0 / (60 + ss.semantic_rank), 0.0) +
                 COALESCE(2.0 / (60 + ks.keyword_rank), 0.0) +
                 COALESCE(1.5 / (60 + fs.fuzzy_rank), 0.0))::FLOAT AS similarity
              FROM embedding_documents dc
              JOIN documents d ON d.id = dc.document_id
              LEFT JOIN semantic_search ss ON ss.id = dc.id
              LEFT JOIN keyword_search ks ON ks.id = dc.id
              LEFT JOIN fuzzy_search fs ON fs.id = dc.id
              WHERE ss.id IS NOT NULL OR ks.id IS NOT NULL OR fs.id IS NOT NULL
              ORDER BY similarity DESC LIMIT result_limit;
            END;
            $func$;
          `)
        } catch (_err) {
          // Non-fatal — works on standard postgres without superuser if extensions already installed
        }
      })()
    }
    return result
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
      const start = Date.now()
      const { rows, isFallback } = await performHybridSearch(db, queryText, limit)
      const latency = Date.now() - start
      const topSim = rows.length > 0 ? rows[0].similarity || 0 : 0
      
      // Log the search asynchronously
      db.query(
        'INSERT INTO search_logs (query_text, latency_ms, result_count, top_similarity, is_fallback) VALUES ($1, $2, $3, $4, $5)',
        [queryText, latency, rows.length, topSim, isFallback]
      ).catch(e => console.error('Failed to log search:', e))

      return { success: true, rows, isFallback }
    } catch (err) {
      console.error('db:search error:', err)
      return { success: false, message: err.message }
    }
  })

  ipcMain.handle('db:get-analytics', async () => {
    if (!db || !db.isConnected()) return { success: false }
    try {
      // Get real database metrics
      const latencyRes = await db.query('SELECT AVG(latency_ms) as avg_lat, AVG(top_similarity) as avg_sim, COUNT(*) as total FROM search_logs')
      const feedbackRes = await db.query(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN score = 1 THEN 1 ELSE 0 END) as positive
        FROM search_feedback
      `)
      const statsRes = await db.query('SELECT * FROM get_document_stats()')
      
      const searchLogs = await db.query('SELECT latency_ms as standard FROM search_logs ORDER BY created_at DESC LIMIT 50')

      return {
        success: true,
        metrics: {
          avgLatency: latencyRes.rows[0]?.avg_lat ? Math.round(Number(latencyRes.rows[0].avg_lat)) : 0,
          avgCosine: latencyRes.rows[0]?.avg_sim ? Number(latencyRes.rows[0].avg_sim) : 0,
          totalSearches: latencyRes.rows[0]?.total ? Number(latencyRes.rows[0].total) : 0,
          totalFeedback: feedbackRes.rows[0]?.total ? Number(feedbackRes.rows[0].total) : 0,
          positiveFeedback: feedbackRes.rows[0]?.positive ? Number(feedbackRes.rows[0].positive) : 0,
          totalDocs: statsRes.rows[0]?.total_docs || 0,
          totalChunks: statsRes.rows[0]?.total_chunks || 0,
          recentLatencies: searchLogs.rows.reverse()
        }
      }
    } catch (err) {
      console.error('db:get-analytics error:', err)
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
        event.sender.send('db:ingest-progress', { ...progressUpdate, type: 'reembed' })
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
