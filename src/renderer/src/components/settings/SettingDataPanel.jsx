import React, { useState, useRef, useEffect } from 'react'
import { UploadCloud, File, CheckCircle2, AlertCircle, Loader2, X, Clock } from 'lucide-react'

const SettingDataPanel = () => {
  const [isDragging, setIsDragging] = useState(false)
  const [dbStats, setDbStats] = useState(null)
  const [loadingStats, setLoadingStats] = useState(true)
  const [ingestState, setIngestState] = useState({
    status: 'idle',
    progress: 0,
    message: '',
    fileName: ''
  })
  // Only pending/processing files shown — done ones get removed automatically
  const [queue, setQueue] = useState([])
  const [totalTime, setTotalTime] = useState(null)
  const [statsVisible, setStatsVisible] = useState(true)
  const fileInputRef = useRef(null)
  const isProcessingRef = useRef(false)

  const loadStats = async () => {
    setLoadingStats(true)
    try {
      const res = await window.api.db.stats()
      if (res?.success) setDbStats(res.stats)
    } catch (e) { console.error('Failed to load stats:', e) }
    finally { setLoadingStats(false) }
  }

  useEffect(() => {
    loadStats()
    const handleSync = () => loadStats()
    window.addEventListener('db-stats-updated', handleSync)

    const cleanup = window.api.db.onIngestProgress((update) => {
      if (update.status === 'complete') {
        loadStats()
        window.dispatchEvent(new Event('db-stats-updated'))
      }
      setIngestState(prev => ({
        ...prev,
        progress: update.progress,
        message: update.message,
        status: update.status === 'complete' ? 'success' : 'uploading'
      }))
    })

    return () => {
      window.removeEventListener('db-stats-updated', handleSync)
      if (cleanup) cleanup()
    }
  }, [])

  const getFilePaths = async (files) => {
    const paths = []
    for (const f of files) {
      try {
        const p = window.api.getPathForFile(f)
        if (p && typeof p === 'string') paths.push(p)
      } catch (_) {}
    }
    if (paths.length === 0) return []
    try { return await window.api.system.resolvePaths(paths) }
    catch (_) { return paths }
  }

  const processFiles = async (filePaths) => {
    if (isProcessingRef.current) return
    isProcessingRef.current = true

    setTotalTime(null)
    setStatsVisible(true)

    // Populate queue with pending items
    const queueItems = filePaths.map(p => ({
      id: `${p}-${Date.now()}-${Math.random()}`,
      path: p,
      name: p.split(/[\\/]/).pop(),
      status: 'pending',
      timing: null
    }))
    setQueue(queueItems)

    const globalStart = Date.now()
    let successCount = 0
    let lastError = null

    for (let i = 0; i < filePaths.length; i++) {
      const filePath = filePaths[i]
      const fileName = filePath.split(/[\\/]/).pop()
      const queueId  = queueItems[i].id

      // Mark as processing
      setQueue(prev => prev.map(q => q.id === queueId ? { ...q, status: 'processing' } : q))

      setIngestState({
        status: 'uploading',
        progress: 0,
        message: `Processing file ${i + 1} of ${filePaths.length}…`,
        fileName
      })

      await new Promise(r => setTimeout(r, 50))

      const fileStart = Date.now()
      try {
        const result = await window.api.db.ingestFile(filePath)
        const ms = Date.now() - fileStart
        const timing = result?.timing?.total || (ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`)

        if (result?.success) {
          successCount++
          // Remove from queue immediately once done
          setQueue(prev => prev.filter(q => q.id !== queueId))
        } else {
          lastError = result?.message || 'Failed'
          // Keep failed files in queue so user can see them, but mark error
          setQueue(prev => prev.map(q => q.id === queueId ? { ...q, status: 'error', timing } : q))
        }
      } catch (err) {
        lastError = err.message
        const ms = Date.now() - fileStart
        const timing = ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`
        setQueue(prev => prev.map(q => q.id === queueId ? { ...q, status: 'error', timing } : q))
      }
    }

    const totalMs = Date.now() - globalStart
    const totalTimeFmt = totalMs < 1000 ? `${totalMs}ms` : `${(totalMs / 1000).toFixed(1)}s`
    setTotalTime(totalTimeFmt)

    if (successCount === filePaths.length) {
      setIngestState({ status: 'success', progress: 100, message: `Successfully ingested ${successCount} file${successCount !== 1 ? 's' : ''} in ${totalTimeFmt}.`, fileName: 'Ingestion Complete' })
    } else if (successCount > 0) {
      setIngestState({ status: 'success', progress: 100, message: `${successCount} ingested, ${filePaths.length - successCount} failed. Total: ${totalTimeFmt}. Last error: ${lastError}`, fileName: 'Partial Success' })
    } else {
      setIngestState({ status: 'error', progress: 0, message: lastError || 'Failed to ingest any files.', fileName: 'Ingestion Failed' })
    }

    loadStats()
    isProcessingRef.current = false
  }

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true) }
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false) }

  const handleDrop = async (e) => {
    e.preventDefault()
    setIsDragging(false)
    const resolved = await getFilePaths(Array.from(e.dataTransfer.files))
    if (resolved.length > 0) processFiles(resolved)
  }

  const handleFileSelect = async (e) => {
    const resolved = await getFilePaths(Array.from(e.target.files))
    if (resolved.length > 0) processFiles(resolved)
    e.target.value = null
  }

  const removeFromQueue = (id) => setQueue(prev => prev.filter(q => q.id !== id))

  const pendingOrErrorQueue = queue // only pending/processing/error remain

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h3 className="text-base font-black tracking-tight text-[var(--text-main)] mb-0.5">Data Ingestion</h3>
        <p className="text-xs text-[var(--text-muted)]">Upload PDFs, documents, or raw text to your Knowledge Hub. Files are automatically chunked and embedded via local AI.</p>
      </div>

      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-xl p-5 text-center transition-all duration-200 cursor-pointer ${
          isDragging
            ? 'border-[var(--text-accent)] bg-[var(--text-accent)]/10 scale-[1.01]'
            : 'border-[var(--border-dim)] hover:border-[var(--text-muted)] bg-[var(--bg-app)]'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <UploadCloud className={`mx-auto mb-2 transition-colors ${isDragging ? 'text-[var(--text-accent)]' : 'text-[var(--text-muted)]'}`} size={32} strokeWidth={1.5} />
        <h4 className="text-sm font-bold text-[var(--text-main)] mb-1">Drag and drop files or folders here</h4>
        <p className="text-xs text-[var(--text-muted)]">or click to browse your computer</p>
        <p className="text-[10px] font-bold text-[var(--text-faint)] mt-3 tracking-widest uppercase">Supported: .pdf .txt .md .json .csv</p>
        <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,.txt,.md,.json,.csv" multiple onChange={handleFileSelect} />
      </div>

      {/* Progress / Status Card */}
      {ingestState.status !== 'idle' && (
        <div className={`p-5 rounded-2xl border transition-all ${
          ingestState.status === 'error'   ? 'border-red-500/30 bg-red-500/10' :
          ingestState.status === 'success' ? 'border-emerald-500/30 bg-emerald-500/10' :
          'border-[var(--border-dim)] bg-[var(--bg-app)]'
        }`}>
          <div className="flex items-start gap-4">
            <div className="mt-1">
              {ingestState.status === 'uploading' && <Loader2 className="animate-spin text-[var(--text-accent)]" size={20} />}
              {ingestState.status === 'success'   && <CheckCircle2 className="text-emerald-500" size={20} />}
              {ingestState.status === 'error'     && <AlertCircle className="text-red-500" size={20} />}
            </div>
            <div className="flex-1 min-w-0">
              <h5 className="text-sm font-bold text-[var(--text-main)] truncate">{ingestState.fileName}</h5>
              <p className={`text-xs mt-1 ${ingestState.status === 'error' ? 'text-red-400' : 'text-[var(--text-muted)]'}`}>
                {ingestState.message}
              </p>
              {ingestState.status === 'uploading' && (
                <div className="mt-3 h-2 w-full bg-[var(--bg-panel)] rounded-full overflow-hidden">
                  <div className="h-full bg-[var(--text-accent)] transition-all duration-300 ease-out" style={{ width: `${ingestState.progress}%` }} />
                </div>
              )}
              {/* Total time badge */}
              {totalTime && ingestState.status === 'success' && (
                <div className="mt-2 flex items-center gap-1.5 text-[10px] text-[var(--text-faint)] font-mono">
                  <Clock size={10} />
                  Total time: <span className="font-bold text-emerald-400">{totalTime}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Queue — only pending/processing/error files, done ones are auto-removed */}
      {statsVisible && pendingOrErrorQueue.length > 0 && (
        <div className="border border-[var(--border-dim)] rounded-xl bg-[var(--bg-app)] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border-dim)] bg-[var(--bg-panel)]">
            <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
              {pendingOrErrorQueue.filter(q => q.status === 'pending' || q.status === 'processing').length} remaining
              {pendingOrErrorQueue.some(q => q.status === 'error') && ` · ${pendingOrErrorQueue.filter(q => q.status === 'error').length} failed`}
            </span>
            <button onClick={() => setStatsVisible(false)} className="p-1 rounded hover:bg-[var(--bg-active)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors">
              <X size={13} />
            </button>
          </div>

          <div className="overflow-y-auto custom-scrollbar" style={{ minHeight: '120px', maxHeight: '240px' }}>
            {pendingOrErrorQueue.map((item) => (
              <div key={item.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-[var(--border-dim)]/40 last:border-0 hover:bg-[var(--bg-panel)]/50 transition-colors group">
                <div className="shrink-0 w-4 flex justify-center">
                  {item.status === 'processing' && <Loader2 size={12} className="animate-spin text-[var(--text-accent)]" />}
                  {item.status === 'error'      && <AlertCircle size={12} className="text-red-400" />}
                  {item.status === 'pending'    && <File size={12} className="text-[var(--text-faint)]" />}
                </div>
                <p className="flex-1 text-xs text-[var(--text-main)] truncate font-medium">{item.name}</p>
                {item.timing && (
                  <span className="shrink-0 flex items-center gap-1 text-[10px] font-mono text-[var(--text-faint)]">
                    <Clock size={9} />{item.timing}
                  </span>
                )}
                {item.status !== 'processing' && (
                  <button onClick={() => removeFromQueue(item.id)} className="shrink-0 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-[var(--bg-active)] text-[var(--text-muted)] hover:text-red-400 transition-all">
                    <X size={11} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DB Stats — plain inline text */}
      <div className="flex items-center gap-2 px-1 text-xs text-[var(--text-muted)]">
        {loadingStats ? (
          <span className="flex items-center gap-1.5"><Loader2 size={11} className="animate-spin" /> Loading stats…</span>
        ) : dbStats ? (
          <>
            <span className="font-bold text-[var(--text-main)]">{dbStats.total_docs ?? dbStats.totalDocuments ?? 0}</span> documents
            <span className="text-[var(--border-dim)]">·</span>
            <span className="font-bold text-[var(--text-main)]">{dbStats.total_chunks ?? dbStats.totalChunks ?? 0}</span> chunks
            {(dbStats.db_size || dbStats.dbSize) && (
              <>
                <span className="text-[var(--border-dim)]">·</span>
                <span className="font-bold text-[var(--text-main)]">{dbStats.db_size ?? dbStats.dbSize}</span> DB size
              </>
            )}
          </>
        ) : (
          <span className="text-[var(--text-faint)]">Connect to a database to see stats</span>
        )}
      </div>
    </div>
  )
}

export default SettingDataPanel
