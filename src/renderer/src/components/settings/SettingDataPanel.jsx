import React, { useState, useRef, useEffect } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
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
  const queueParentRef = useRef(null)

  const rowVirtualizer = useVirtualizer({
    count: queue.length,
    getScrollElement: () => queueParentRef.current,
    estimateSize: () => 45,
    overscan: 5,
  })

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
    setShowCancelModal(false)
    // Defer the heavy IPC call so React has time to unmount the modal and play the animation
    setTimeout(() => {
      window.api.db.cancelQueue()
    }, 50)
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

      {/* Upload Area / Progress Indicator Merged */}
      <div
        className={`relative border-2 border-dashed rounded-xl p-5 text-center transition-all duration-200 cursor-pointer overflow-hidden flex flex-col justify-center items-center min-h-[140px] ${
          isDragging
            ? 'border-[var(--text-accent)] bg-[var(--text-accent)]/10 scale-[1.01]'
            : 'border-[var(--border-dim)] hover:border-[var(--text-muted)] bg-[var(--bg-app)]'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        {ingestState.status === 'idle' || ingestState.status === 'success' ? (
          <div className="flex flex-col items-center justify-center relative z-10 w-full animate-in fade-in zoom-in duration-300">
            <UploadCloud className={`mx-auto mb-2 transition-colors ${isDragging ? 'text-[var(--text-accent)]' : 'text-[var(--text-muted)]'}`} size={32} strokeWidth={1.5} />
            <h4 className="text-sm font-bold text-[var(--text-main)] mb-1">Drag and drop files or folders here</h4>
            <p className="text-xs text-[var(--text-muted)]">or click to browse your computer</p>
            <p className="text-[10px] font-bold text-[var(--text-faint)] mt-3 tracking-widest uppercase">Supported: .pdf .txt .md .json .csv</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center relative z-10 w-full animate-in fade-in zoom-in duration-300">
            {ingestState.status === 'uploading' && <Loader2 className="animate-spin text-[var(--text-accent)] mb-3" size={32} />}
            {ingestState.status === 'error' && <AlertCircle className="text-red-500 mb-3" size={32} />}
            <h4 className="text-sm font-bold text-[var(--text-main)] mb-1 w-full max-w-[80%] truncate px-4">{ingestState.fileName || 'Processing...'}</h4>
            <p className={`text-xs ${ingestState.status === 'error' ? 'text-red-400' : 'text-[var(--text-muted)]'}`}>
              {ingestState.status === 'error' ? ingestState.message : 'Processing... Drop more files to add to queue'}
            </p>
          </div>
        )}

        {/* Integrated Progress Bar anchored to the bottom */}
        {ingestState.status === 'uploading' && (
          <div className="absolute bottom-0 left-0 h-1 bg-[var(--text-accent)] transition-all duration-300 ease-out z-0" style={{ width: `${ingestState.progress}%` }} />
        )}
        
        <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,.txt,.md,.json,.csv" multiple onChange={handleFileSelect} />
      </div>

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

          <div ref={queueParentRef} className="overflow-y-auto custom-scrollbar" style={{ minHeight: '120px', maxHeight: '240px' }}>
            <div
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const item = pendingOrErrorQueue[virtualRow.index]
                return (
                  <div
                    key={item.id}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                    className="flex items-center gap-3 px-4 py-2 border-b border-[var(--border-dim)]/40 hover:bg-[var(--bg-panel)]/50 transition-colors group"
                  >
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
                )
              })}
            </div>
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
        isDestructive={true}
        onConfirm={handleCancelQueue}
        onCancel={() => setShowCancelModal(false)}
      />
    </div>
  )
}

export default SettingDataPanel
