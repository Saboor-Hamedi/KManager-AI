import React, { useState, useRef, useEffect } from 'react'
import { UploadCloud, File, CheckCircle2, AlertCircle, Loader2, Database, RefreshCw } from 'lucide-react'

const SettingDataPanel = () => {
  const [isDragging, setIsDragging] = useState(false)
  const [dbStats, setDbStats] = useState(null)
  const [loadingStats, setLoadingStats] = useState(false)
  const [ingestState, setIngestState] = useState({
    status: 'idle', // 'idle' | 'uploading' | 'success' | 'error'
    progress: 0,
    message: '',
    fileName: ''
  })
  
  const fileInputRef = useRef(null)

  const loadStats = async () => {
    setLoadingStats(true)
    try {
      const res = await window.api.db.stats()
      if (res && res.success) {
        setDbStats(res.stats)
      }
    } catch (e) {
      console.error('Failed to load stats:', e)
    } finally {
      setLoadingStats(false)
    }
  }

  useEffect(() => {
    loadStats()
    const cleanup = window.api.db.onIngestProgress((update) => {
      setIngestState(prev => ({
        ...prev,
        progress: update.progress,
        message: update.message,
        status: update.status === 'complete' ? 'success' : 'uploading'
      }))
    })
    return cleanup
  }, [])

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = async (e) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    
    try {
      const paths = files.map(f => window.api.getPathForFile(f)).filter(Boolean)
      if (paths.length === 0) return
      
      const resolvedFiles = await window.api.system.resolvePaths(paths)
      if (resolvedFiles.length > 0) {
        await processFiles(resolvedFiles)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files)
    const paths = files.map(f => window.api.getPathForFile(f)).filter(Boolean)
    if (paths.length > 0) {
      const resolvedFiles = await window.api.system.resolvePaths(paths)
      await processFiles(resolvedFiles)
    }
    e.target.value = null
  }

  const processFiles = async (filePaths) => {
    let successCount = 0
    let lastError = null

    for (let i = 0; i < filePaths.length; i++) {
      const filePath = filePaths[i]
      const fileName = filePath.split(/[\\/]/).pop()

      setIngestState({
        status: 'uploading',
        progress: 0,
        message: `Processing file ${i + 1} of ${filePaths.length}...`,
        fileName: fileName
      })

      try {
        const result = await window.api.db.ingestFile(filePath)
        if (!result.success) {
          lastError = result.message
        } else {
          successCount++
        }
      } catch (err) {
        console.error(err)
        lastError = err.message
      }
    }

    if (successCount === filePaths.length) {
      setIngestState({
        status: 'success',
        progress: 100,
        message: `Successfully ingested ${successCount} files.`,
        fileName: 'Bulk Ingestion Complete'
      })
    } else if (successCount > 0) {
      setIngestState({
        status: 'success',
        progress: 100,
        message: `Ingested ${successCount} files, but encountered errors. Last error: ${lastError}`,
        fileName: 'Bulk Ingestion Partial Success'
      })
    } else {
      setIngestState({
        status: 'error',
        progress: 0,
        message: lastError || 'Failed to ingest any files.',
        fileName: 'Bulk Ingestion Failed'
      })
    }
    loadStats()
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h3 className="text-lg font-black tracking-tight text-[var(--text-main)] mb-1">Data Ingestion</h3>
        <p className="text-sm font-bold text-[var(--text-muted)]">Upload PDFs, documents, or raw text to your Knowledge Hub. Files are automatically chunked and embedded via local AI.</p>
      </div>

      {/* Upload Area */}
      <div 
        className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-200 cursor-pointer ${
          isDragging 
            ? 'border-[var(--text-accent)] bg-[var(--text-accent)]/10 scale-[1.02]' 
            : 'border-[var(--border-dim)] hover:border-[var(--text-muted)] bg-[var(--bg-app)]'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <UploadCloud className={`mx-auto mb-4 transition-colors ${isDragging ? 'text-[var(--text-accent)]' : 'text-[var(--text-muted)]'}`} size={48} strokeWidth={1.5} />
        <h4 className="text-base font-bold text-[var(--text-main)] mb-2">Drag and drop files or folders here</h4>
        <p className="text-sm text-[var(--text-muted)] mb-4">or click to browse your computer</p>

        <p className="text-xs font-bold text-[var(--text-faint)] mt-6 tracking-widest uppercase">Supported: .pdf, .txt, .md, .json, .csv, .doc, .docx, .xlsx</p>
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept=".pdf,.txt,.md,.json,.csv,.doc,.docx,.xlsx"
          multiple
          onChange={handleFileSelect}
        />
      </div>

      {/* Status Area */}
      {ingestState.status !== 'idle' && (
        <div className={`p-5 rounded-2xl border transition-all ${
          ingestState.status === 'error' ? 'border-red-500/30 bg-red-500/10' :
          ingestState.status === 'success' ? 'border-emerald-500/30 bg-emerald-500/10' :
          'border-[var(--border-dim)] bg-[var(--bg-app)]'
        }`}>
          <div className="flex items-start gap-4">
            <div className="mt-1">
              {ingestState.status === 'uploading' && <Loader2 className="animate-spin text-[var(--text-accent)]" size={20} />}
              {ingestState.status === 'success' && <CheckCircle2 className="text-emerald-500" size={20} />}
              {ingestState.status === 'error' && <AlertCircle className="text-red-500" size={20} />}
            </div>
            <div className="flex-1 min-w-0">
              <h5 className="text-sm font-bold text-[var(--text-main)] truncate">
                {ingestState.fileName}
              </h5>
              <p className={`text-xs mt-1 ${
                ingestState.status === 'error' ? 'text-red-400' : 'text-[var(--text-muted)]'
              }`}>
                {ingestState.message}
              </p>
              
              {ingestState.status === 'uploading' && (
                <div className="mt-3 h-2 w-full bg-[var(--bg-panel)] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[var(--text-accent)] transition-all duration-300 ease-out"
                    style={{ width: `${ingestState.progress}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SettingDataPanel
