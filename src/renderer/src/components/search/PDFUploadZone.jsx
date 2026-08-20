import React, { useState, useEffect, useRef, useMemo } from 'react'
import { UploadCloud, FolderPlus, FilePlus, Loader2, CheckCircle2, AlertCircle, X, ChevronDown, ChevronUp, Database, RefreshCw, Trash2, Clock, Check } from 'lucide-react'
import { useKeyboardShortcuts } from '../../../../utils/useKeyboardShortcuts'
import ConfirmModal from '../layout/ConfirmModal'

const VirtualScrollList = ({ items, renderItem, rowHeight = 34, containerHeight = 160 }) => {
  const [scrollTop, setScrollTop] = useState(0)
  const totalHeight = items.length * rowHeight
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - 2)
  const endIndex = Math.min(items.length, Math.ceil((scrollTop + containerHeight) / rowHeight) + 2)
  const visibleItems = items.slice(startIndex, endIndex)
  const offsetY = startIndex * rowHeight

  return (
    <div 
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
      className="max-h-[160px] overflow-y-auto custom-scrollbar relative pr-1"
      style={{ height: Math.min(containerHeight, Math.max(rowHeight, totalHeight)) }}
    >
      <div style={{ height: totalHeight, width: '100%', position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)`, position: 'absolute', top: 0, left: 0, right: 0 }} className="space-y-1">
          {visibleItems.map((item, idx) => renderItem(item, startIndex + idx))}
        </div>
      </div>
    </div>
  )
}

const formatEta = (totalSeconds) => {
  if (totalSeconds < 60) return `${totalSeconds}s`;
  if (totalSeconds < 3600) {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}m ${s}s`;
  }
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  return `${h}h ${m}m`;
}

/**
 * PDFUploadZone Component
 * Dedicated multi-format drag-and-drop & directory upload zone for indexing PDFs, Word docs, Markdown notes,
 * and code files directly into the vector database (`PostgreSQL / pgvector`).
 */
const PDFUploadZone = ({ onIngestComplete }) => {
  const [isDragging, setIsDragging] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [queue, setQueue] = useState([])
  const [indexedDocs, setIndexedDocs] = useState([])
  const [totalDbCount, setTotalDbCount] = useState(0)
  const [progress, setProgress] = useState({ status: 'idle', progress: 0, message: '' })
  const fileInputRef = useRef(null)
  const userClosedRef = useRef(false)
  const lastProgressRef = useRef(0)
  const lastStatusRef = useRef('idle')
  const startTimeRef = useRef(null)
  const startProgressRef = useRef(0)
  const etaRef = useRef(null)
  const [eta, setEta] = useState(null)

  useEffect(() => {
    if (!window.api?.db) return

    const fetchIndexedDocs = async () => {
      if (!window.api?.db?.query) return
      try {
        if (window.api.db.stats) {
          const statsRes = await window.api.db.stats()
          if (statsRes && statsRes.success && statsRes.stats?.total_docs) {
            setTotalDbCount(statsRes.stats.total_docs)
          }
        }
        const res = await window.api.db.query(
          `SELECT id, file_name, file_type, created_at, 
                  (SELECT COUNT(*)::int FROM embedding_documents WHERE document_id = documents.id) AS chunk_count 
           FROM documents ORDER BY id DESC LIMIT 300`
        )
        if (res && Array.isArray(res.rows)) {
          setIndexedDocs(res.rows)
        } else if (Array.isArray(res)) {
          setIndexedDocs(res)
        }
      } catch (_) {}
    }

    fetchIndexedDocs()

    // Fetch initial queue
    window.api.db.getQueue().then(q => {
      if (q && Array.isArray(q)) setQueue(q)
    }).catch(() => {})

    // Listen to live queue updates
    const removeQueueListener = window.api.db.onQueueUpdated((updatedQueue) => {
      if (Array.isArray(updatedQueue)) {
        setQueue(updatedQueue)
        const hasPendingOrActive = updatedQueue.some(item => item.status === 'pending' || item.status === 'processing')
        if (hasPendingOrActive && !userClosedRef.current) {
          setIsExpanded(true)
        } else if (!hasPendingOrActive) {
          userClosedRef.current = false
          fetchIndexedDocs()
        }
      }
    })

    // Listen to live file extraction/chunking/embedding progress (throttled to keep UI smooth with 1000+ files)
    const removeProgressListener = window.api.db.onIngestProgress((update) => {
      const now = Date.now()
      const newStatus = update?.status || 'idle'
      if (newStatus !== lastStatusRef.current || newStatus === 'complete' || newStatus === 'error' || now - lastProgressRef.current > 40) {
        lastProgressRef.current = now
        lastStatusRef.current = newStatus
        
        if ((newStatus === 'embedding' || newStatus === 'extracting') && update.progress > 0 && update.progress < 100) {
          if (!startTimeRef.current) {
            startTimeRef.current = Date.now()
            startProgressRef.current = update.progress
          }
          const elapsed = Date.now() - startTimeRef.current
          const progressDelta = update.progress - startProgressRef.current
          
          if (progressDelta > 0) {
            const timePerPercent = elapsed / progressDelta
            const remainingPercent = 100 - update.progress
            const remainingMs = timePerPercent * remainingPercent
            etaRef.current = Math.max(0, Math.round(remainingMs / 1000))
          }
        } else if (newStatus === 'idle' || newStatus === 'complete' || newStatus === 'error') {
          startTimeRef.current = null
          startProgressRef.current = 0
          etaRef.current = null
        }
        setEta(etaRef.current)
        setProgress(update || { status: 'idle', progress: 0, message: '' })
      }
      if (update?.status === 'complete') {
        fetchIndexedDocs()
        if (onIngestComplete) onIngestComplete()
      }
    })

    const handleStatsSync = () => fetchIndexedDocs()
    window.addEventListener('db-stats-updated', handleStatsSync)

    return () => {
      window.removeEventListener('db-stats-updated', handleStatsSync)
      if (removeQueueListener) removeQueueListener()
      if (removeProgressListener) removeProgressListener()
    }
  }, [onIngestComplete])

  const [confirmQueue, setConfirmQueue] = useState(null)

  const proceedQueue = async () => {
    if (!confirmQueue) return
    userClosedRef.current = false
    setIsExpanded(true)
    await window.api.db.queueFiles(confirmQueue)
    setConfirmQueue(null)
  }

  const resolveAndQueueFiles = async (pathsOrFiles) => {
    const paths = []
    for (const item of pathsOrFiles) {
      if (typeof item === 'string') {
        paths.push(item)
      } else if (item && typeof item === 'object') {
        try {
          const p = window.api.getPathForFile(item)
          if (p && typeof p === 'string') paths.push(p)
        } catch (_) {}
      }
    }
    if (paths.length === 0) return

    try {
      const resolved = await window.api.system.resolvePaths(paths)
      if (resolved && resolved.length > 0) {
        if (resolved.length > 500) {
          setConfirmQueue(resolved)
        } else {
          userClosedRef.current = false
          setIsExpanded(true)
          await window.api.db.queueFiles(resolved)
        }
      }
    } catch (err) {
      console.error('Failed to resolve paths for indexing:', err)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
    if (!isExpanded && !userClosedRef.current) setIsExpanded(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files || [])
    if (files.length > 0) {
      await resolveAndQueueFiles(files)
    }
  }

  const handleSelectFiles = async (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      await resolveAndQueueFiles(files)
    }
    e.target.value = null
  }

  const handleSelectFolder = async () => {
    try {
      const folderPaths = await window.api.system.selectFolder()
      if (folderPaths && folderPaths.length > 0) {
        await resolveAndQueueFiles(folderPaths)
      }
    } catch (err) {
      console.error('Folder selection failed:', err)
    }
  }

  useKeyboardShortcuts({
    onEscape: () => {
      if (isExpanded) {
        setIsExpanded(false)
        userClosedRef.current = true
        return true // Handled
      }
      return false
    }
  })

  useEffect(() => {
    if (!isExpanded) return
    const handleClickOutside = (e) => {
      if (!e.target.closest('#pdf-upload-zone-container')) {
        setIsExpanded(false)
        userClosedRef.current = true
      }
    }
    window.addEventListener('mousedown', handleClickOutside)
    return () => window.removeEventListener('mousedown', handleClickOutside)
  }, [isExpanded])

  const stats = useMemo(() => {
    const isReembed = progress.type === 'reembed' || (progress.message && progress.message.includes('Re-embedding'))
    const isReembedActive = isReembed && progress.status !== 'complete' && progress.status !== 'idle'

    let totalFiles, completedCount, remainCount, errorCount, overallPercent, isBusy, processingItem

    if (isReembedActive) {
      const parsed = progress.message ? progress.message.match(/\((\d+)\/(\d+)\)/) : null
      const docIdx = progress.docIndex !== undefined ? progress.docIndex : (parsed ? Math.max(0, parseInt(parsed[1]) - 1) : 0)
      const totDocs = progress.totalDocs !== undefined ? progress.totalDocs : (parsed ? parseInt(parsed[2]) : Math.max(1, indexedDocs.length))

      completedCount = docIdx
      totalFiles = totDocs
      remainCount = Math.max(0, totDocs - completedCount)
      errorCount = 0
      overallPercent = typeof progress.progress === 'number' ? progress.progress : Math.round((completedCount / Math.max(1, totalFiles)) * 100)
      isBusy = true
      processingItem = { name: progress.docName || 'Re-embedding document...' }
    } else {
      const activeQueue = queue.filter(q => q.status === 'processing' || q.status === 'pending')
      const completedQueue = queue.filter(q => q.status === 'completed' || q.status === 'success' || (q.status !== 'pending' && q.status !== 'processing' && q.status !== 'error'))
      processingItem = activeQueue.find(q => q.status === 'processing')
      const processingCount = processingItem ? 1 : 0
      const pendingCount = activeQueue.filter(q => q.status === 'pending').length
      remainCount = pendingCount + processingCount
      errorCount = queue.filter(q => q.status === 'error').length

      completedCount = completedQueue.length
      totalFiles = completedCount + remainCount
      isBusy = processingItem || progress.status === 'extracting' || progress.status === 'chunking' || progress.status === 'embedding'

      overallPercent = totalFiles > 0 
        ? Math.min(100, Math.round(((completedCount + (processingCount * ((progress.progress || 0) / 100))) / totalFiles) * 100))
        : 0
    }

    return { isReembedActive, totalFiles, completedCount, remainCount, errorCount, overallPercent, isBusy, processingItem }
  }, [queue, progress, indexedDocs, totalDbCount])

  const { isReembedActive, totalFiles, completedCount, remainCount, errorCount, overallPercent, isBusy, processingItem } = stats

  return (
    <>
      <ConfirmModal
        isOpen={confirmQueue !== null}
        title="Large Folder Scan"
        message={`You are about to add ${confirmQueue?.length} files to your library. Scanning and embedding this many files may take a significant amount of time. Do you want to proceed?`}
        confirmLabel="Proceed"
        onConfirm={proceedQueue}
        onCancel={() => setConfirmQueue(null)}
      />
      <div id="pdf-upload-zone-container" className="w-full h-full relative z-30 transition-all duration-200">
      {/* Flat Top Ingestion Bar - Always shows exact counts whether idle or busy */}
      <div 
        onClick={() => {
          const next = !isExpanded
          setIsExpanded(next)
          userClosedRef.current = !next
        }}
        className="w-full h-full flex items-center justify-between px-2 border-0 text-[12px] font-medium text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer select-none transition-all shadow-none"
      >
        <div className="flex items-center space-x-2.5 overflow-hidden">
          <Database size={13} className="text-[var(--text-accent)] shrink-0" />
          <div className="font-semibold tracking-tight truncate flex items-center">
            <span>My Library</span>
            {totalDbCount > 0 && (
              <span className="text-[var(--text-muted)] font-normal ml-1">({totalDbCount} indexed)</span>
            )}
          </div>
          
          {isBusy && (
            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-[4px] bg-[var(--text-accent)]/15 text-[var(--text-accent)] font-bold text-[12px] animate-pulse shrink-0 border-0">
              <Loader2 size={10} className="animate-spin" />
              <span>{isReembedActive ? `Re-reading (${overallPercent}%)` : `Adding (${overallPercent}%)`}</span>
            </span>
          )}

          {!isBusy && totalFiles > 0 && (
            <span className="inline-flex items-center space-x-1 text-[12px] shrink-0 font-semibold bg-white/[0.04] px-2 py-0.5 rounded-[4px] text-[var(--text-main)]">
              <span>{totalFiles} {totalFiles === 1 ? 'file' : 'files'} in queue</span>
            </span>
          )}
        </div>

        <div className="flex items-center space-x-1.5 shrink-0 ml-2">


          <div className="text-[var(--text-muted)] pl-0.5">
            {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </div>
        </div>
      </div>

      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleSelectFiles} 
        multiple 
        className="hidden" 
        accept=".pdf,.txt,.md,.json,.csv,.doc,.docx,.xlsx,.py,.js,.jsx,.ts,.tsx,.sql,.sh,.yml,.yaml"
      />

      {/* Expanded Drop Zone & Queue Drawer - Structured Header/Body/Footer Layout */}
      {isExpanded && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 z-50 w-full max-w-[700px] mt-1.5 rounded-[6px] bg-[var(--bg-card)] border border-white/[0.05] shadow-2xl overflow-hidden animate-in fade-in duration-75">
          
          {/* 1. HEADER: Progress Overview & File Statistics */}
          <div className="p-3.5 bg-[var(--bg-app)]/90 border-b border-white/[0.05] space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Database size={14} className="text-[var(--text-accent)]" />
                <h4 className="font-bold text-xs text-[var(--text-main)] tracking-tight">
                  {isReembedActive ? 'Re-reading Library Documents...' : isBusy ? 'Adding Files to Library...' : totalFiles > 0 ? 'Library Update Status' : 'My Library Dropzone'}
                </h4>
              </div>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={(e) => {
                    e.stopPropagation()
                    handleSelectFolder()
                  }}
                  className="px-2 py-1 rounded-[4px] bg-white/[0.04] hover:bg-white/[0.08] text-[var(--text-main)] font-medium text-[12px] flex items-center space-x-1 transition-all border-0"
                  title="Index all PDFs/docs in a local directory"
                >
                  <FolderPlus size={12} className="text-[var(--text-accent)]" />
                  <span>Select Folder</span>
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation()
                    fileInputRef.current?.click()
                  }}
                  className="px-2 py-1 rounded-[4px] bg-white/[0.04] hover:bg-white/[0.08] text-[var(--text-main)] font-medium text-[12px] flex items-center space-x-1 transition-all border-0"
                  title="Upload specific files"
                >
                  <FilePlus size={12} />
                  <span>Add Files</span>
                </button>
              </div>
            </div>

            {/* Exact Statistics Row */}
            <div className="grid grid-cols-5 gap-2 text-center py-2 px-2 rounded-[5px] bg-[var(--bg-panel)]/60">
              <div className="flex flex-col">
                <span className="text-[12px] uppercase font-bold tracking-wider text-[var(--text-muted)]">Inserted / Done</span>
                <span className="text-sm font-extrabold text-emerald-400">{completedCount}</span>
              </div>
              <div className="flex flex-col border-x border-white/[0.05]">
                <span className="text-[12px] uppercase font-bold tracking-wider text-[var(--text-muted)]">Remain</span>
                <span className="text-sm font-extrabold text-[var(--text-accent)]">{remainCount}</span>
              </div>
              <div className="flex flex-col border-r border-white/[0.05]">
                <span className="text-[12px] uppercase font-bold tracking-wider text-[var(--text-muted)]">Progress</span>
                <span className="text-sm font-extrabold text-[var(--text-accent)]">
                  {stats.isReembedActive && stats.totalFiles > 0 ? `${stats.completedCount}/${stats.totalFiles}` : '--'}
                </span>
              </div>
              <div className="flex flex-col border-r border-white/[0.05]">
                <span className="text-[12px] uppercase font-bold tracking-wider text-[var(--text-muted)]">Time Left</span>
                <span className="text-sm font-extrabold text-[var(--text-muted)]">
                  {eta !== null && eta > 0 ? formatEta(eta) : '--'}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[12px] uppercase font-bold tracking-wider text-[var(--text-muted)]">Errors</span>
                <span className={`text-sm font-extrabold ${errorCount > 0 ? 'text-red-400' : 'text-[var(--text-muted)]'}`}>{errorCount}</span>
              </div>
            </div>

            {/* Active Progress Bar & Current File Status */}
            {(isBusy || progress.status !== 'idle') && (
              <div className="space-y-1.5 pt-0.5">
                <div className="flex items-center justify-between text-[12px]">
                  <span className="font-semibold text-[var(--text-main)] truncate max-w-[600px]">
                    {progress.message ? progress.message.replace(/\s*\(\d+\/\d+\)/, '') : (processingItem ? `Processing: ${processingItem.name}` : 'Preparing files...')}
                  </span>
                  <span className="font-mono text-[var(--text-accent)] font-bold text-xs">{overallPercent}%</span>
                </div>
                <div className="w-full bg-white/[0.06] rounded-full h-2 overflow-hidden border-0 shadow-inner">
                  <div 
                    className="bg-[var(--text-accent)] h-full transition-all duration-75 rounded-full shadow-[0_0_10px_var(--text-accent)]"
                    style={{ width: `${overallPercent || progress.progress || 5}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* 2. BODY: Drag & Drop Zone + Scrollable Queue List */}
          <div className="p-3.5 space-y-3">
            {/* Compact Drag & Drop Box */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border border-dashed rounded-[5px] p-3 text-center transition-all duration-100 cursor-pointer flex flex-col items-center justify-center h-[74px] ${
                isDragging
                  ? 'bg-[var(--text-accent)]/10 border-[var(--text-accent)] scale-[1.01]'
                  : 'bg-[var(--bg-app)]/40 border-white/[0.1] hover:bg-[var(--bg-active)]'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <UploadCloud size={18} className={`transition-colors ${isDragging ? 'text-[var(--text-accent)]' : 'text-[var(--text-muted)]'}`} />
                <span className="text-xs font-semibold text-[var(--text-main)]">Drag & drop files or folders here to index</span>
              </div>
              <span className="text-[12px] text-[var(--text-muted)] mt-1">Supports PDF, Word (.docx), Excel, CSV, Markdown, and Code</span>
            </div>

            {/* Scrollable Queue List */}
            {queue.length > 0 ? (
              <div className="space-y-2">
                {/* Active/Recent Queue Section */}
                {queue.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[12px] font-bold text-[var(--text-muted)] px-1 uppercase tracking-wider">
                      <span>Active File Queue ({queue.length})</span>
                      <span>Status / Progress</span>
                    </div>
                    <VirtualScrollList
                      items={queue}
                      rowHeight={34}
                      containerHeight={150}
                      renderItem={(item) => {
                        const isItemProcessing = item.status === 'processing'
                        const isItemDone = item.status === 'completed' || item.status === 'success' || (item.status !== 'pending' && item.status !== 'processing' && item.status !== 'error')
                        const isItemError = item.status === 'error'

                        return (
                          <div 
                            key={`q-${item.id || item.path || item.name}`}
                            className={`flex items-center justify-between text-[12px] px-2.5 py-2 rounded-[5px] border-0 transition-colors ${
                              isItemProcessing ? 'bg-[var(--text-accent)]/10 font-semibold' : 'bg-[var(--bg-app)]/80 hover:bg-[var(--bg-app)]'
                            }`}
                          >
                            <div className="flex items-center space-x-2 overflow-hidden">
                              {isItemProcessing && <Loader2 size={13} className="text-[var(--text-accent)] animate-spin shrink-0" />}
                              {item.status === 'pending' && <Clock size={13} className="text-[var(--text-muted)] shrink-0" />}
                              {isItemDone && <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />}
                              {isItemError && <AlertCircle size={13} className="text-red-400 shrink-0" />}
                              
                              <span className="font-medium text-[var(--text-main)] truncate max-w-[310px]" title={item.path || item.name}>
                                {item.name || item.path?.split(/[\\/]/).pop()}
                              </span>
                            </div>

                            <div className="flex items-center space-x-2 shrink-0 ml-2">
                              <span className={`text-[12px] font-mono px-1.5 py-0.5 rounded-[3px] truncate max-w-[200px] ${
                                isItemProcessing ? 'bg-[var(--text-accent)]/20 text-[var(--text-accent)] font-bold' :
                                isItemDone ? 'text-emerald-400 font-semibold' :
                                isItemError ? 'text-red-400 font-semibold' : 'text-[var(--text-muted)]'
                              }`} title={item.timing || item.status}>
                                {isItemProcessing ? `${progress.progress || 0}% (${progress.status === 'embedding' ? 'reading' : progress.status || 'adding'})` : item.timing || item.status.toUpperCase()}
                              </span>
                            </div>
                          </div>
                        )
                      }}
                    />
                  </div>
                )}


              </div>
            ) : (
              <div className="py-6 text-center text-[var(--text-muted)] text-xs font-medium bg-[var(--bg-app)]/30 rounded-[5px]">
                Queue and database are currently empty. Add files or folders above to begin indexing.
              </div>
            )}
          </div>

          {/* 3. FOOTER: Action Bar & Summary */}
          <div className="px-3.5 py-2.5 bg-[var(--bg-app)]/90 border-t border-white/[0.05] flex items-center justify-between text-xs">
            <div className="text-[12px] text-[var(--text-muted)] flex items-center space-x-1.5">
              <span>Vector DB:</span>
              <span className="font-mono text-[var(--text-main)]">PostgreSQL (pgvector)</span>
            </div>

            <div className="flex items-center space-x-2">
              {isBusy && (
                <button 
                  onClick={() => window.api.db.cancelQueue()}
                  className="px-2.5 py-1 rounded-[4px] bg-red-500/15 text-red-400 hover:bg-red-500/25 font-semibold text-[12px] transition-all border-0"
                >
                  Cancel Ingestion
                </button>
              )}
              {(completedCount > 0 || errorCount > 0) && (
                <button 
                  onClick={() => window.api.db.clearQueue()}
                  className="px-2.5 py-1 rounded-[4px] bg-white/[0.05] hover:bg-white/[0.1] text-[var(--text-main)] font-medium text-[12px] flex items-center space-x-1 transition-all border-0"
                  title="Clear finished/failed files from the view"
                >
                  <Trash2 size={12} />
                  <span>Clear Completed</span>
                </button>
              )}
              <button 
                onClick={() => setIsExpanded(false)}
                className="px-3 py-1 rounded-[4px] bg-[var(--text-accent)]/15 text-[var(--text-accent)] hover:bg-[var(--text-accent)]/25 font-bold text-[12px] transition-all border-0"
              >
                Close
              </button>
            </div>
          </div>

        </div>
      )}
    </div>
    </>
  )
}

export default PDFUploadZone
