import { ipcMain, app } from 'electron'
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
      safeSendToWindow('db:queue-updated', ingestionQueue)
      
      try {
        const fileStart = Date.now()
        let lastProgressTime = 0
        const result = await ingestionService.ingestFile(item.path, db, (progressUpdate) => {
          const now = Date.now()
          // Only send update if complete/error, or if 150ms has passed since last update
          if (progressUpdate.status === 'complete' || progressUpdate.status === 'error' || now - lastProgressTime > 150) {
            lastProgressTime = now
            safeSendToWindow('db:ingest-progress', { ...progressUpdate, fileName: item.name })
          }
        }, () => cancelIngestionFlag || !getMainWindow() || getMainWindow().isDestroyed())
        
        const ms = Date.now() - fileStart
        item.timing = ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`
        
        if (result?.success) {
          item.status = 'completed'
        } else {
          item.status = 'error'
          item.timing = result?.message || 'Failed'
          safeSendToWindow('db:ingest-progress', { status: 'error', message: result?.message || 'Failed', fileName: item.name })
        }
      } catch (err) {
        item.status = 'error'
        item.timing = err.message || 'Failed'
        safeSendToWindow('db:ingest-progress', { status: 'error', message: err.message || 'Failed', fileName: item.name })
      }
      
      safeSendToWindow('db:queue-updated', ingestionQueue)
      await new Promise(r => setTimeout(r, 50)) // Prevent blocking
    }
    
    isIngesting = false
    safeSendToWindow('db:ingest-progress', { status: 'idle' })
    if (cancelIngestionFlag) {
      safeSendToWindow('db:ingest-progress', { status: 'idle' })
    }
  }

  ipcMain.handle('db:queue-files', async (event, filePaths) => {
    // Clear out previously finished items so the UI queue starts fresh for the new batch
    ingestionQueue = ingestionQueue.filter(q => q.status === 'pending' || q.status === 'processing')
    
    const newItems = filePaths.map(p => ({
      id: `${p}-${Date.now()}-${Math.random()}`,
      path: p,
      name: p.split(/[\\/]/).pop(),
      status: 'pending',
      timing: null
    }))
    ingestionQueue.push(...newItems)
    safeSendToWindow('db:queue-updated', ingestionQueue)
    
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
    safeSendToWindow('db:queue-updated', ingestionQueue)
    return { success: true }
  })

  ipcMain.handle('db:clear-queue', () => {
    // Keep pending/processing, drop errors
    ingestionQueue = ingestionQueue.filter(q => q.status === 'processing' || q.status === 'pending')
    safeSendToWindow('db:queue-updated', ingestionQueue)
    return { success: true }
  })

  ipcMain.handle('db:ingest-text', async (event, { title, text }) => {
    if (!db || !db.isConnected()) return { success: false, message: 'Database not connected' }
    try {
      const res = await ingestionService.ingestText(title, text, db)
      safeSendToWindow('db:stats-updated') // If applicable, notify frontend
      return res
    } catch (err) {
      console.error('db:ingest-text error:', err)
      return { success: false, message: err.message }
    }
  })

  ipcMain.handle('db:ingest-ai-response', async (_event, text, title) => {
    return await ingestionService.ingestAIResponse(text, title)
  })

  ipcMain.handle('db:update-ai-response', async (_event, vaultPath, content) => {
    try {
      const docRes = await db.query('SELECT id FROM documents WHERE vault_path = $1', [vaultPath])
      if (docRes.rows.length === 0) return { success: false, error: 'Document not found' }
      
      await db.transaction(async (client) => {
        await client.query('UPDATE documents SET content = $1, updated_at = NOW() WHERE vault_path = $2', [content, vaultPath])
        await ingestionService.chunkAndEmbedDocument(client, docRes.rows[0].id, content)
      })
      return { success: true }
    } catch (err) {
      log.error('Failed to update AI response:', err)
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('db:update-document-title', async (_event, vaultPath, newTitle) => {
    try {
      if (vaultPath.startsWith('ai-response-')) {
        await db.query('UPDATE documents SET file_name = $1, updated_at = NOW() WHERE vault_path = $2', [newTitle, vaultPath])
        return { success: true, newVaultPath: vaultPath }
      } else {
        const dir = path.dirname(vaultPath)
        const ext = path.extname(vaultPath)
        
        // Prevent double extension if user typed it
        let cleanTitle = newTitle
        if (ext && cleanTitle.toLowerCase().endsWith(ext.toLowerCase())) {
          cleanTitle = cleanTitle.slice(0, -ext.length)
        }
        
        const newFileName = cleanTitle + ext
        const newVaultPath = path.join(dir, newFileName)
        
        if (vaultPath !== newVaultPath) {
          if (fs.existsSync(newVaultPath)) {
            return { success: false, error: 'A file with that name already exists in the folder.' }
          }
          await fs.promises.rename(vaultPath, newVaultPath)
          await db.query('UPDATE documents SET file_name = $1, vault_path = $2, updated_at = NOW() WHERE vault_path = $3', [newFileName, newVaultPath, vaultPath])
        } else {
          await db.query('UPDATE documents SET file_name = $1, updated_at = NOW() WHERE vault_path = $2', [newFileName, vaultPath])
        }
        
        return { success: true, newVaultPath: newVaultPath }
      }
    } catch (err) {
      log.error('Failed to update document title:', err)
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('db:test-connection', async (_event, config) => {
    const testDb = new Database(config)
    return await testDb.testConnection(config)
  })

  ipcMain.handle('db:connect', async (_event, config) => {
    // Gracefully close the old pool before creating a new one
    if (db) {
      try { await db.disconnect() } catch {}
    }
    db = new Database(config)
    const result = await db.connect()
    if (result.success) {
      // Auto-initialize schema idempotently on connect
      ;(async () => {
        try {
          // Pre-warm embedding model in the background (Suggestion #13)
          embeddingService.init().catch(console.error)

          const isProd = app.isPackaged
          let finalPath = isProd 
            ? path.join(process.resourcesPath, 'schema.sql')
            : path.join(app.getAppPath(), 'schema.sql')
          
          if (fs.existsSync(finalPath)) {
            const sql = fs.readFileSync(finalPath, 'utf8')
            await db.query(sql)
          }

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
          // Add HNSW index for lightning fast vector searches
          await db.query('CREATE INDEX IF NOT EXISTS idx_chunks_embedding_hnsw ON embedding_documents USING hnsw (embedding vector_cosine_ops)')

          // search_chunks function is now strictly maintained in schema.sql (Suggestion #2)
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
      const clampedLimit = Math.max(1, Math.min(limit, 100))
      const result = await performHybridSearch(db, queryText, clampedLimit)
      const { rows, isFallback, queryRefined, refinedQuery, lowInfoQuery } = result
      const latency = Date.now() - start
      const topSim = rows.length > 0 ? rows[0].similarity || 0 : 0
      
      // Log the search asynchronously
      db.query(
        'INSERT INTO search_logs (query_text, latency_ms, result_count, top_similarity, is_fallback) VALUES ($1, $2, $3, $4, $5)',
        [queryText, latency, rows.length, topSim, isFallback]
      ).catch(e => console.error('Failed to log search:', e))

      return { success: true, rows, isFallback, queryRefined, refinedQuery, lowInfoQuery }
    } catch (err) {
      console.error('db:search error:', err)
      return { success: false, message: err.message }
    }
  })
  ipcMain.handle('db:lexical-search', async (_event, { query, limit = 5 }) => {
    try {
      if (!query || query.trim() === '') return []
      
      const result = await db.query(`
        SELECT 
          dc.id, 
          dc.content, 
          d.file_name,
          d.vault_path
        FROM embedding_documents dc
        JOIN documents d ON dc.document_id = d.id
        WHERE word_similarity($1, dc.content) > 0.3
        ORDER BY word_similarity($1, dc.content) DESC
        LIMIT $2
      `, [query, limit])
      
      return result.rows
    } catch (err) {
      console.error('db:lexical-search error:', err)
      return []
    }
  })

  ipcMain.handle('db:get-analytics', async () => {
    if (!db || !db.isConnected()) return { success: false }
    try {
      // Get real database averages safely
      const latencyRes = await db.query('SELECT AVG(latency_ms) as avg_lat, AVG(top_similarity) as avg_sim, COUNT(*) as total FROM search_logs').catch(() => ({ rows: [] }))
      const feedbackRes = await db.query(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN score = 1 THEN 1 ELSE 0 END) as positive
        FROM search_feedback
      `).catch(() => ({ rows: [] }))

      let totalDocs = 0
      let totalChunks = 0
      try {
        const statsRes = await db.query('SELECT * FROM get_document_stats()')
        totalDocs = statsRes.rows[0]?.total_docs || 0
        totalChunks = statsRes.rows[0]?.total_chunks || 0
      } catch {
        const docRes = await db.query('SELECT COUNT(*)::bigint AS cnt FROM documents').catch(() => ({ rows: [{ cnt: 0 }] }))
        const chunkRes = await db.query('SELECT COUNT(*)::bigint AS cnt FROM embedding_documents').catch(() => ({ rows: [{ cnt: 0 }] }))
        totalDocs = Number(docRes.rows[0].cnt)
        totalChunks = Number(chunkRes.rows[0].cnt)
      }
      
      // Fetch up to 1,000 complete query logs ordered by timestamp ascending for real time-series
      const searchLogs = await db.query(`
        SELECT id, query_text, latency_ms, top_similarity, result_count, is_fallback, created_at 
        FROM search_logs 
        ORDER BY created_at ASC 
        LIMIT 1000
      `).catch(() => ({ rows: [] }))

      // Aggregated chart data
      const searchesOverTimeRes = await db.query(`
        SELECT TO_CHAR(created_at, 'Mon DD') as date, COUNT(*)::int as count
        FROM search_logs
        WHERE created_at >= CURRENT_DATE - INTERVAL '6 days'
        GROUP BY TO_CHAR(created_at, 'Mon DD'), DATE(created_at)
        ORDER BY DATE(created_at) ASC
      `).catch(() => ({ rows: [] }))

      const docTypesRes = await db.query(`
        SELECT COALESCE(file_type, 'other') as type, COUNT(*)::int as count
        FROM documents
        GROUP BY file_type
        ORDER BY count DESC
      `).catch(() => ({ rows: [] }))

      const similarityBucketsRes = await db.query(`
        SELECT 
          CASE 
            WHEN top_similarity >= 85 THEN 'Very High (>85%)'
            WHEN top_similarity >= 70 THEN 'High (70-85%)'
            WHEN top_similarity >= 50 THEN 'Moderate (50-70%)'
            ELSE 'Low (<50%)'
          END as category,
          COUNT(*)::int as count
        FROM search_logs
        GROUP BY category
      `).catch(() => ({ rows: [] }))

      const routingBucketsRes = await db.query(`
        SELECT 
          CASE WHEN is_fallback THEN 'Keyword Fallback' ELSE 'Smart Hybrid' END as category,
          COUNT(*)::int as count
        FROM search_logs
        GROUP BY category
      `).catch(() => ({ rows: [] }))

      const feedbackBucketsRes = await db.query(`
        SELECT 
          CASE WHEN score = 1 THEN 'Positive' WHEN score = -1 THEN 'Negative' ELSE 'Neutral' END as category,
          COUNT(*)::int as count
        FROM search_feedback
        GROUP BY category
      `).catch(() => ({ rows: [] }))

      const successBucketsRes = await db.query(`
        SELECT 
          CASE WHEN result_count > 0 THEN 'Results Found' ELSE 'Zero Results' END as category,
          COUNT(*)::int as count
        FROM search_logs
        GROUP BY category
      `).catch(() => ({ rows: [] }))

      // Fetch recent activity items (searches, feedback, doc ingestions) for real activity feed
      const recentSearches = await db.query(`
        SELECT id, query_text as title, latency_ms, top_similarity, created_at, 'search' as type 
        FROM search_logs 
        ORDER BY created_at DESC 
        LIMIT 25
      `).catch(() => ({ rows: [] }))
      const recentFeedback = await db.query(`
        SELECT id, query_text as title, score, created_at, 'feedback' as type 
        FROM search_feedback 
        ORDER BY created_at DESC 
        LIMIT 25
      `).catch(() => ({ rows: [] }))
      const recentDocs = await db.query(`
        SELECT id, file_name as title, file_type, created_at, 'ingest' as type 
        FROM documents 
        ORDER BY created_at DESC 
        LIMIT 15
      `).catch(() => ({ rows: [] }))

      // Combine and sort by timestamp descending
      const combinedActivity = [
        ...recentSearches.rows.map(r => ({ ...r, eventType: 'search' })),
        ...recentFeedback.rows.map(r => ({ ...r, eventType: 'feedback' })),
        ...recentDocs.rows.map(r => ({ ...r, eventType: 'ingest' }))
      ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 30)

      return {
        success: true,
        metrics: {
          avgLatency: latencyRes.rows[0]?.avg_lat ? Math.round(Number(latencyRes.rows[0].avg_lat)) : 0,
          avgCosine: latencyRes.rows[0]?.avg_sim ? Number(latencyRes.rows[0].avg_sim) : 0,
          totalSearches: latencyRes.rows[0]?.total ? Number(latencyRes.rows[0].total) : 0,
          totalFeedback: feedbackRes.rows[0]?.total ? Number(feedbackRes.rows[0].total) : 0,
          positiveFeedback: feedbackRes.rows[0]?.positive ? Number(feedbackRes.rows[0].positive) : 0,
          totalDocs: totalDocs,
          totalChunks: totalChunks,
          recentQueries: searchLogs.rows,
          searchesOverTime: searchesOverTimeRes.rows,
          docTypes: docTypesRes.rows,
          similarityBuckets: similarityBucketsRes.rows,
          routingBuckets: routingBucketsRes.rows,
          feedbackBuckets: feedbackBucketsRes.rows,
          successBuckets: successBucketsRes.rows,
          activityFeed: combinedActivity
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
        safeSenderSend(event.sender, 'db:ingest-progress', progressUpdate)
      }, () => !getMainWindow() || getMainWindow().isDestroyed() || event?.sender?.isDestroyed())
      return result
    } catch (err) {
      console.error('db:ingest-file error:', err)
      return { success: false, message: err.message }
    }
  })

  ipcMain.handle('db:update-chunk', async (_event, { chunkId, newContent }) => {
    if (!db || !db.isConnected()) {
      return { success: false, error: 'Database not connected' }
    }
    try {
      if (!chunkId || newContent === undefined) {
        return { success: false, error: 'Missing chunk ID or content' }
      }
      const chunkRes = await db.query(
        'SELECT document_id, chunk_index, section FROM embedding_documents WHERE id = $1',
        [chunkId]
      )
      if (chunkRes.rows.length === 0) {
        return { success: false, error: 'Chunk not found in database' }
      }
      const { document_id, section } = chunkRes.rows[0]

      const sanitized = ingestionService.sanitizeText(newContent) || newContent
      const semanticChunks = ingestionService.chunkText(sanitized)
      if (!semanticChunks || semanticChunks.length === 0) {
        return { success: false, error: 'Text resulted in zero semantic chunks after sanitization' }
      }

      const batchVectors = await embeddingService.embedQuery(semanticChunks)

      return await db.transaction(async (client) => {
        const firstContent = semanticChunks[0]
        const firstVector = '[' + batchVectors[0].join(',') + ']'
        const firstTokens = firstContent.split(/\s+/).length
        const firstSectionMatch = firstContent.match(/^##\s+(.+?)\n\n/)
        const firstSection = firstSectionMatch ? firstSectionMatch[1].trim() : section

        await client.query(
          `UPDATE embedding_documents 
           SET content = $1, embedding = $2::vector, token_count = $3, section = $4 
           WHERE id = $5`,
          [firstContent, firstVector, firstTokens, firstSection, chunkId]
        )

        if (semanticChunks.length > 1) {
          const maxRes = await client.query(
            'SELECT COALESCE(MAX(chunk_index), 0) as max_idx FROM embedding_documents WHERE document_id = $1',
            [document_id]
          )
          let nextIndex = (maxRes.rows[0].max_idx || 0) + 1

          for (let j = 1; j < semanticChunks.length; j++) {
            const content = semanticChunks[j]
            const vectorStr = '[' + batchVectors[j].join(',') + ']'
            const tokenCount = content.split(/\s+/).length
            const sectionMatch = content.match(/^##\s+(.+?)\n\n/)
            const sec = sectionMatch ? sectionMatch[1].trim() : section

            await client.query(
              `INSERT INTO embedding_documents (document_id, chunk_index, content, embedding, token_count, section)
               VALUES ($1, $2, $3, $4::vector, $5, $6)`,
              [document_id, nextIndex++, content, vectorStr, tokenCount, sec]
            )
          }
        }

        await client.query('UPDATE documents SET updated_at = NOW() WHERE id = $1', [document_id])
        return { success: true, chunksUpdated: semanticChunks.length }
      })
    } catch (err) {
      console.error('db:update-chunk error:', err)
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('db:reembed-all', async (event) => {
    if (!db || !db.isConnected()) {
      return { success: false, message: 'Database not connected' }
    }
    try {
      let lastSent = 0
      return await ingestionService.reembedAll(db, (progressUpdate) => {
        const now = Date.now()
        if (progressUpdate.status === 'complete' || progressUpdate.status === 'error' || now - lastSent > 40) {
          lastSent = now
          safeSenderSend(event.sender, 'db:ingest-progress', { ...progressUpdate, type: 'reembed' })
        }
      }, () => !getMainWindow() || getMainWindow().isDestroyed() || event?.sender?.isDestroyed())
    } catch (err) {
      if (err.message === 'Cancelled by user' || err.message.includes('destroyed')) {
        return { success: false, message: 'Cancelled due to window close' }
      }
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
      const stats = res.rows[0] || {}
      const sizes = await fileSizeService.getStorageSize(db)
      stats.raw_file_bytes = sizes.raw_file_bytes
      stats.total_db_bytes = sizes.total_db_bytes
      stats.by_type_details = sizes.by_type_details
      return { success: true, stats }
    } catch (err) {
      try {
        const docRes = await db.query('SELECT COUNT(*)::bigint AS cnt FROM documents')
        const chunkRes = await db.query('SELECT COUNT(*)::bigint AS cnt FROM embedding_documents')
        const typeRes = await db.query('SELECT file_type, COUNT(*)::bigint AS cnt FROM documents GROUP BY file_type')
        const byType = {}
        typeRes.rows.forEach(r => { byType[r.file_type] = Number(r.cnt) })
        const sizes = await fileSizeService.getStorageSize(db)

        return {
          success: true,
          stats: {
            total_docs: Number(docRes.rows[0].cnt),
            total_chunks: Number(chunkRes.rows[0].cnt),
            by_type: byType,
            by_type_details: sizes.by_type_details,
            raw_file_bytes: sizes.raw_file_bytes,
            total_db_bytes: sizes.total_db_bytes
          }
        }
      } catch (fallbackErr) {
        return { success: false, message: fallbackErr.message }
      }
    }
  })

}
