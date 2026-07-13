import React, { useState, useRef, useEffect } from 'react'
import { UploadCloud, File, CheckCircle2, AlertCircle, Loader2, X, Clock, StopCircle } from 'lucide-react'
import ConfirmModal from '../layout/ConfirmModal'

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
  const [queue, setQueue] = useState([])
  const [statsVisible, setStatsVisible] = useState(true)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const fileInputRef = useRef(null)

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

    // Initial fetch of the active queue from the main process
    window.api.db.getQueue().then(q => {
      if (q && q.length > 0) {
        setQueue(q)
        setStatsVisible(true)
      }
    })

    const cleanupQueue = window.api.db.onQueueUpdated((updatedQueue) => {
      setQueue(updatedQueue)
      if (updatedQueue.length > 0) setStatsVisible(true)
    })

    const cleanupProgress = window.api.db.onIngestProgress((update) => {
      if (update.status === 'complete' || update.status === 'idle') {
        loadStats()
        window.dispatchEvent(new Event('db-stats-updated'))
      }
      setIngestState(prev => ({
        ...prev,
        progress: update.progress || 0,
        message: update.message || '',
        fileName: update.fileName || prev.fileName,
        status: update.status === 'complete' ? 'success' : update.status === 'error' ? 'error' : update.status === 'idle' ? 'success' : 'uploading'
      }))
    })

    return () => {
      window.removeEventListener('db-stats-updated', handleSync)
      if (cleanupProgress) cleanupProgress()
      if (cleanupQueue) cleanupQueue()
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

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true) }
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false) }

  const handleDrop = async (e) => {
    e.preventDefault()
    setIsDragging(false)
    const resolved = await getFilePaths(Array.from(e.dataTransfer.files))
    if (resolved.length > 0) {
      setStatsVisible(true)
      window.api.db.queueFiles(resolved)
    }
  }

  const handleFileSelect = async (e) => {
    const resolved = await getFilePaths(Array.from(e.target.files))
    if (resolved.length > 0) {
      setStatsVisible(true)
      window.api.db.queueFiles(resolved)
    }
    e.target.value = null
  }

  const handleCancelQueue = () => {
    window.api.db.cancelQueue()
    setShowCancelModal(false)
  }

  const handleClearQueue = () => {
    window.api.db.clearQueue()
    setStatsVisible(false)
  }

  const pendingOrErrorQueue = queue

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
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
              <h5 className="text-sm font-bold text-[var(--text-main)] truncate">{ingestState.fileName || (ingestState.status === 'success' ? 'Processing Complete' : 'Processing...')}</h5>
              <p className={`text-xs mt-1 ${ingestState.status === 'error' ? 'text-red-400' : 'text-[var(--text-muted)]'}`}>
                {ingestState.message}
              </p>
              {ingestState.status === 'uploading' && (
                <div className="mt-3 h-2 w-full bg-[var(--bg-panel)] rounded-full overflow-hidden">
                  <div className="h-full bg-[var(--text-accent)] transition-all duration-300 ease-out" style={{ width: `${ingestState.progress}%` }} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Queue */}
      {statsVisible && pendingOrErrorQueue.length > 0 && (
        <div className="border border-[var(--border-dim)] rounded-xl bg-[var(--bg-app)] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border-dim)] bg-[var(--bg-panel)]">
            <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
              {pendingOrErrorQueue.filter(q => q.status === 'pending' || q.status === 'processing').length} remaining
              {pendingOrErrorQueue.some(q => q.status === 'error') && ` · ${pendingOrErrorQueue.filter(q => q.status === 'error').length} failed`}
            </span>
            <div className="flex items-center gap-2">
              {pendingOrErrorQueue.some(q => q.status === 'processing' || q.status === 'pending') && (
                <button onClick={() => setShowCancelModal(true)} className="flex items-center gap-1.5 px-2 py-1 rounded bg-red-500/10 text-red-500 hover:bg-red-500/20 text-[10px] font-bold tracking-widest uppercase transition-colors">
                  <StopCircle size={11} /> Cancel
                </button>
              )}
              <button onClick={handleClearQueue} className="p-1 rounded hover:bg-[var(--bg-active)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors" title="Clear/Hide Queue">
                <X size={13} />
              </button>
            </div>
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
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DB Stats */}
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

      <ConfirmModal
        isOpen={showCancelModal}
        title="Cancel Processing?"
        message="Are you sure you want to cancel the current queue? Any files already embedded will remain in the database."
        confirmText="Yes, Cancel"
        isDestructive={true}
        onConfirm={handleCancelQueue}
        onCancel={() => setShowCancelModal(false)}
      />
    </div>
  )
}

export default SettingDataPanel
