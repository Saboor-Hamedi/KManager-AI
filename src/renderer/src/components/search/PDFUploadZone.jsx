import React, { useState, useEffect, useRef } from 'react'
import { UploadCloud, FolderPlus, FilePlus, Loader2, CheckCircle2, AlertCircle, X, ChevronDown, ChevronUp, Database, RefreshCw, Trash2 } from 'lucide-react'

/**
 * PDFUploadZone Component
 * Dedicated multi-format drag-and-drop & directory upload zone for indexing PDFs, Word docs, Markdown notes,
 * and code files directly into the vector database (`sqlite-vss`).
 */
const PDFUploadZone = ({ onIngestComplete }) => {
  const [isDragging, setIsDragging] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [queue, setQueue] = useState([])
  const [progress, setProgress] = useState({ status: 'idle', progress: 0, message: '' })
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (!window.api?.db) return

    // Fetch initial queue
    window.api.db.getQueue().then(q => {
      if (q && Array.isArray(q)) setQueue(q)
    }).catch(() => {})

    // Listen to live queue updates
    const removeQueueListener = window.api.db.onQueueUpdated((updatedQueue) => {
      if (Array.isArray(updatedQueue)) {
        setQueue(updatedQueue)
        const hasPendingOrActive = updatedQueue.some(item => item.status === 'pending' || item.status === 'processing')
        if (hasPendingOrActive) {
          setIsExpanded(true)
        }
      }
    })

    // Listen to live file extraction/chunking/embedding progress
    const removeProgressListener = window.api.db.onIngestProgress((update) => {
      setProgress(update || { status: 'idle', progress: 0, message: '' })
      if (update?.status === 'complete' && onIngestComplete) {
        onIngestComplete()
      }
    })

    return () => {
      if (removeQueueListener) removeQueueListener()
      if (removeProgressListener) removeProgressListener()
    }
  }, [onIngestComplete])

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
        setIsExpanded(true)
        await window.api.db.queueFiles(resolved)
      }
    } catch (err) {
      console.error('Failed to resolve paths for indexing:', err)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
    if (!isExpanded) setIsExpanded(true)
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

  const pendingCount = queue.filter(q => q.status === 'pending').length
  const processingItem = queue.find(q => q.status === 'processing')
  const completedCount = queue.filter(q => q.status === 'completed' || q.status === 'success' || (q.status !== 'pending' && q.status !== 'processing' && q.status !== 'error')).length
  const errorCount = queue.filter(q => q.status === 'error').length
  const isBusy = processingItem || progress.status === 'extracting' || progress.status === 'chunking' || progress.status === 'embedding'

  return (
    <div className="w-full relative z-30 transition-all duration-200 border-b border-white/[0.04] bg-[var(--bg-panel)]/40">
      {/* Flat Top Ingestion Bar */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full h-9 flex items-center justify-between px-4 border-0 text-[11px] font-medium text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer select-none transition-all shadow-none"
      >
        <div className="flex items-center space-x-2 overflow-hidden">
          <Database size={13} className="text-[var(--text-accent)] shrink-0" />
          <span className="font-semibold tracking-tight truncate">Ingest Docs</span>
          
          {isBusy && (
            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-[4px] bg-[var(--text-accent)]/15 text-[var(--text-accent)] font-bold text-[10px] animate-pulse shrink-0 border-0">
              <Loader2 size={10} className="animate-spin" />
              <span>Indexing...</span>
            </span>
          )}

          {!isBusy && queue.length > 0 && (
            <span className="inline-flex items-center space-x-1.5 text-[10px] shrink-0">
              <span>{pendingCount} queued</span>
              <span>•</span>
              <span className="text-emerald-500 font-bold">{completedCount} done</span>
              {errorCount > 0 && (
                <>
                  <span>•</span>
                  <span className="text-red-500 font-bold">{errorCount} errors</span>
                </>
              )}
            </span>
          )}
        </div>

        <div className="flex items-center space-x-1.5 shrink-0 ml-2">
          <button 
            onClick={(e) => {
              e.stopPropagation()
              handleSelectFolder()
            }}
            className="px-2 py-1 rounded-[4px] bg-white/[0.04] hover:bg-white/[0.08] text-[var(--text-main)] font-medium text-[11px] flex items-center space-x-1 transition-all border-0"
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
            className="px-2 py-1 rounded-[4px] bg-white/[0.04] hover:bg-white/[0.08] text-[var(--text-main)] font-medium text-[11px] flex items-center space-x-1 transition-all border-0"
            title="Upload specific files"
          >
            <FilePlus size={12} />
            <span>Add Files</span>
          </button>

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

      {/* Expanded Drop Zone & Queue Drawer - Absolute Overlay completely borderless */}
      {isExpanded && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 z-50 w-full max-w-lg mt-1 p-3 rounded-[5px] bg-[var(--bg-card)] border-0 shadow-2xl space-y-2.5 animate-in fade-in duration-150">
          {/* Compact Drag & Drop Area - border-0 */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-0 rounded-[5px] p-3.5 text-center transition-all duration-150 cursor-pointer flex flex-col items-center justify-center min-h-[80px] ${
              isDragging
                ? 'bg-[var(--text-accent)]/15 scale-[1.01]'
                : 'bg-[var(--bg-app)]/80 hover:bg-[var(--bg-active)]'
            }`}
          >
            {isBusy ? (
              <div className="space-y-1.5 w-full max-w-sm px-3 py-1">
                <div className="flex items-center justify-center space-x-2 text-[var(--text-accent)] font-bold text-xs">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="truncate">{progress.message || `Processing ${processingItem?.name}...`}</span>
                </div>
                <div className="w-full bg-[var(--bg-card)] rounded-[5px] h-1.5 overflow-hidden border-0">
                  <div 
                    className="bg-[var(--text-accent)] h-full transition-all duration-300 rounded-[5px]"
                    style={{ width: `${progress.progress || 10}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <UploadCloud size={22} className={`mb-1 transition-colors ${isDragging ? 'text-[var(--text-accent)]' : 'text-[var(--text-muted)]'}`} />
                <span className="text-xs font-semibold text-[var(--text-main)]">Drag & drop files or folders here</span>
                <span className="text-[10px] text-[var(--text-muted)] mt-0.5">Supports PDF, Word docs, Markdown, Code • Local embedding</span>
              </div>
            )}
          </div>

          {/* Queue List if active items exist */}
          {queue.length > 0 && (
            <div className="space-y-1 max-h-[140px] overflow-y-auto pr-1">
              <div className="flex items-center justify-between text-[10px] font-bold text-[var(--text-muted)] pb-1 border-0">
                <span>Ingestion Queue ({queue.length})</span>
                <div className="flex items-center space-x-2">
                  {isBusy && (
                    <button 
                      onClick={() => window.api.db.cancelQueue()}
                      className="text-red-400 hover:text-red-300 font-semibold transition-colors border-0"
                    >
                      Cancel
                    </button>
                  )}
                  <button 
                    onClick={() => window.api.db.clearQueue()}
                    className="text-[var(--text-muted)] hover:text-[var(--text-main)] flex items-center space-x-1 transition-colors border-0"
                    title="Clear inactive/error items from queue"
                  >
                    <Trash2 size={11} />
                    <span>Clear Done</span>
                  </button>
                </div>
              </div>

              {queue.slice(0, 6).map((item) => (
                <div 
                  key={item.id || item.path}
                  className="flex items-center justify-between text-[11px] px-2 py-1 rounded-[5px] bg-[var(--bg-app)]/80 border-0"
                >
                  <div className="flex items-center space-x-1.5 overflow-hidden">
                    {item.status === 'processing' && <Loader2 size={12} className="text-[var(--text-accent)] animate-spin shrink-0" />}
                    {item.status === 'pending' && <RefreshCw size={12} className="text-[var(--text-muted)] shrink-0" />}
                    {(item.status === 'completed' || item.status === 'success' || (item.status !== 'pending' && item.status !== 'processing' && item.status !== 'error')) && (
                      <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                    )}
                    {item.status === 'error' && <AlertCircle size={12} className="text-red-500 shrink-0" />}
                    <span className="font-medium text-[var(--text-main)] truncate" title={item.path}>{item.name}</span>
                  </div>

                  <span className="text-[10px] font-mono text-[var(--text-muted)] shrink-0 ml-2">
                    {item.status === 'processing' ? `${progress.progress || 0}%` : item.timing || item.status}
                  </span>
                </div>
              ))}
              {queue.length > 6 && (
                <div className="text-center text-[10px] font-bold text-[var(--text-muted)] pt-0.5">
                  +{queue.length - 6} more files queued...
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default PDFUploadZone
