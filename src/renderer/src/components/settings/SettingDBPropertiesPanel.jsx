import React, { useState, useEffect } from 'react'
import { Database, RefreshCw, Layers, FileText, HardDrive, CheckCircle2, AlertCircle, Trash2, Cpu, AlertTriangle } from 'lucide-react'
import ConfirmModal from '../layout/ConfirmModal'

const SettingDBPropertiesPanel = () => {
  const [dbStats, setDbStats] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [actionState, setActionState] = useState(null) // { type: 'reembed' | 'truncate', status: 'progress' | 'success' | 'error', progress: 0, message: '' }
  const [confirmTruncate, setConfirmTruncate] = useState(false)
  const [confirmReembed, setConfirmReembed] = useState(false)

  const loadStats = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await window.api.db.stats()
      if (res && res.success) {
        setDbStats(res.stats)
      } else {
        setError(res?.message || 'Failed to retrieve database properties')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStats()

    const handleSync = () => loadStats()
    window.addEventListener('db-stats-updated', handleSync)

    const unsubscribe = window.api.db.onIngestProgress((update) => {
      if (update.status === 'complete') {
        loadStats()
        window.dispatchEvent(new Event('db-stats-updated'))
      }
      setActionState(prev => {
        if (prev?.status === 'progress' || update.status === 'embedding') {
          return {
            type: 'reembed',
            status: update.status === 'complete' ? 'success' : 'progress',
            progress: update.progress || 50,
            message: update.message || 'Processing vector chunks...'
          }
        }
        return prev
      })
    })
    return () => {
      window.removeEventListener('db-stats-updated', handleSync)
      if (unsubscribe) unsubscribe()
    }
  }, [])

  const handleReembedAll = () => {
    setConfirmReembed(false)
    setTimeout(async () => {
      setActionState({ type: 'reembed', status: 'progress', progress: 5, message: 'Starting knowledge base re-embedding...' })
      try {
        const res = await window.api.db.reembedAll()
        if (res && res.success) {
          setActionState({
            type: 'reembed',
            status: 'success',
            progress: 100,
            message: `Successfully re-embedded ${res.documentsProcessed || 0} documents (${res.chunksProcessed || 0} vector chunks).`
          })
          loadStats()
          window.dispatchEvent(new Event('db-stats-updated'))
          setTimeout(() => setActionState(null), 4000) // Auto-reset after 4s
        } else {
          setActionState({
            type: 'reembed',
            status: 'error',
            progress: 0,
            message: res?.message || 'Re-embedding failed.'
          })
        }
      } catch (err) {
        setActionState({
          type: 'reembed',
          status: 'error',
          progress: 0,
          message: err.message
        })
      }
    }, 50)
  }

  const handleTruncateAll = () => {
    setConfirmTruncate(false)
    setTimeout(async () => {
      setActionState({ type: 'truncate', status: 'progress', progress: 50, message: 'Truncating database tables...' })
      try {
        const res = await window.api.db.truncateAll()
        if (res && res.success) {
          setActionState({
            type: 'truncate',
            status: 'success',
            progress: 100,
            message: 'All tables truncated and vector indexes cleared instantly.'
          })
          if (window.api.db.clearQueue) window.api.db.clearQueue()
          loadStats()
          window.dispatchEvent(new Event('db-stats-updated'))
          setTimeout(() => setActionState(null), 4000) // Auto-reset after 4s
        } else {
          setActionState({
            type: 'truncate',
            status: 'error',
            progress: 0,
            message: res?.message || 'Failed to truncate database.'
          })
        }
      } catch (err) {
        setActionState({
          type: 'truncate',
          status: 'error',
          progress: 0,
          message: err.message
        })
      }
    }, 50)
  }

  const totalDocs = dbStats?.total_docs || 0
  const totalChunks = dbStats?.total_chunks || 0
  const avgChunks = totalDocs > 0 ? (totalChunks / totalDocs).toFixed(1) : '0'

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[13px] font-black tracking-tight text-[var(--text-main)] mb-0.5">DB Properties & Storage</h3>
          <p className="text-[11px] font-bold text-[var(--text-muted)]">Live statistics, format distributions, and maintenance tools for your Knowledge Hub.</p>
        </div>
        <button
          onClick={loadStats}
          disabled={loading}
          className="flex items-center justify-center w-7 h-7 rounded-md bg-[var(--bg-active)] hover:bg-[#2c2c2c] text-[var(--text-main)] border border-[var(--border-subtle)] transition-colors shadow-sm"
          title="Refresh statistics"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin text-[#a855f7]' : 'text-[#a855f7]'} />
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-md bg-red-500/10 border border-red-500/30 flex items-center gap-2 text-red-300 text-[11px] font-semibold">
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}

      {/* Action Progress / Notification Banner */}
      {actionState && (
        <div className={`p-3 rounded-md border flex flex-col gap-2 ${
          actionState.status === 'error'
            ? 'bg-red-500/10 border-red-500/30 text-red-300'
            : actionState.status === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            : 'bg-[#a855f7]/10 border-[#a855f7]/30 text-gray-200'
        }`}>
          <div className="flex items-center justify-between text-[11px] font-bold">
            <span className="flex items-center gap-2">
              {actionState.status === 'progress' && <RefreshCw size={12} className="animate-spin text-[#a855f7]" />}
              {actionState.status === 'success' && <CheckCircle2 size={12} className="text-emerald-400" />}
              {actionState.status === 'error' && <AlertCircle size={12} className="text-red-400" />}
              <span>{actionState.message}</span>
            </span>
            <button
              onClick={() => setActionState(null)}
              className="text-gray-400 hover:text-gray-200 text-[10px] font-normal"
            >
              Dismiss
            </button>
          </div>
          {actionState.status === 'progress' && (
            <div className="w-full h-1.5 bg-[#222] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-[#a855f7] rounded-full transition-all duration-300"
                style={{ width: `${Math.max(actionState.progress, 5)}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-[#181818] border border-[#2a2a2a] rounded-md p-3 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Documents</span>
            <FileText size={14} className="text-[#a855f7]" />
          </div>
          <div className="text-2xl font-black text-gray-100 tracking-tight">
            {totalDocs.toLocaleString()}
          </div>
          <div className="text-[10px] font-medium text-gray-400 mt-1">Archived in PostgreSQL</div>
        </div>

        <div className="bg-[#181818] border border-[#2a2a2a] rounded-md p-3 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Vector Chunks</span>
            <Layers size={14} className="text-[#a855f7]" />
          </div>
          <div className="text-2xl font-black text-[#a855f7] tracking-tight">
            {totalChunks.toLocaleString()}
          </div>
          <div className="text-[10px] font-medium text-gray-400 mt-1">Indexed via pgvector</div>
        </div>

        <div className="bg-[#181818] border border-[#2a2a2a] rounded-md p-3 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Avg Chunks / Doc</span>
            <HardDrive size={14} className="text-[#a855f7]" />
          </div>
          <div className="text-2xl font-black text-gray-100 tracking-tight">
            {avgChunks}
          </div>
          <div className="text-[10px] font-medium text-gray-400 mt-1">Semantic density ratio</div>
        </div>
      </div>

      {/* Format Distribution Table / Cards */}
      <div className="bg-[#181818] border border-[#2a2a2a] rounded-md p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Database size={13} className="text-[#a855f7]" />
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-200">Ingested File Formats</h4>
          </div>
          <span className="text-[11px] font-semibold text-gray-400">
            {dbStats?.by_type ? Object.keys(dbStats.by_type).length : 0} format(s)
          </span>
        </div>

        {dbStats && dbStats.by_type && Object.keys(dbStats.by_type).length > 0 ? (
          <div className="max-h-[260px] overflow-y-auto custom-scrollbar pr-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(dbStats.by_type)
                .sort(([, a], [, b]) => Number(b) - Number(a))
                .map(([format, count]) => {
                  const num = Number(count)
                  const percentage = totalDocs > 0 ? Math.round((num / totalDocs) * 100) : 0
                  return (
                    <div
                      key={format}
                      className="bg-[#131313] border border-[#242424] hover:border-[#333] rounded-md p-2.5 space-y-2 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold uppercase px-2 py-0.5 rounded bg-[#202020] text-[#a855f7] border border-[#2d2d2d]">
                          {format}
                        </span>
                        <span className="font-mono text-xs text-gray-400 font-bold">{percentage}%</span>
                      </div>
                      <div className="text-xs text-gray-300 font-semibold">
                        {num.toLocaleString()} {num === 1 ? 'file' : 'files'}
                      </div>
                      <div className="w-full h-1.5 bg-[#202020] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-[#a855f7] rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(percentage, 4)}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-gray-500 font-medium">
            No files ingested yet. Go to Data Ingestion to upload files.
          </div>
        )}
      </div>

      {/* Database Maintenance & Operations */}
      <div className="bg-[#181818] border border-[#2a2a2a] rounded-md p-4 shadow-sm space-y-3">
        <div className="flex items-center gap-2 border-b border-[#2a2a2a] pb-3">
          <Cpu size={13} className="text-[#a855f7]" />
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-200">Database Maintenance & Operations</h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Re-embed Operation */}
          <div className="bg-[#131313] border border-[#252525] rounded-md p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-gray-200 flex items-center gap-2">
                <Cpu size={13} className="text-purple-400" />
                Re-embed DB
              </span>
              <button
                onClick={() => setConfirmReembed(true)}
                disabled={actionState?.status === 'progress' || totalDocs === 0}
                className="px-2 py-1 rounded bg-[#a855f7]/20 hover:bg-[#a855f7]/40 text-[#d8b4fe] disabled:opacity-40 text-[10px] font-bold transition-colors border border-[#a855f7]/30"
              >
                Re-embed
              </button>
            </div>
            <p className="text-[10px] text-gray-400 leading-relaxed">
              Re-chunks all archived document content and regenerates semantic embeddings without needing to re-upload files from disk.
            </p>
          </div>

          {/* Truncate All Data Operation */}
          <div className="bg-[#131313] border border-[#252525] rounded-md p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-red-400 flex items-center gap-2">
                <Trash2 size={13} />
                Truncate DB
              </span>
              <button
                onClick={() => setConfirmTruncate(true)}
                disabled={actionState?.status === 'progress' || totalDocs === 0}
                className="px-2 py-1 rounded bg-red-500/15 hover:bg-red-500/30 text-red-300 disabled:opacity-40 text-[10px] font-bold transition-colors border border-red-500/30"
              >
                Truncate
              </button>
            </div>
            <p className="text-[10px] text-gray-400 leading-relaxed">
              Lightweight instant truncation (<code className="text-red-300">TRUNCATE TABLE</code>) clears all documents, chunks, and feedback in O(1) time.
            </p>
          </div>
        </div>
      </div>

      {/* Storage Architecture Overview */}
      <div className="bg-[#141414] border border-[#2a2a2a] rounded-md p-3">
        <div className="flex items-center gap-2 text-[11px] font-bold text-gray-300 mb-1.5">
          <CheckCircle2 size={13} className="text-emerald-400" />
          <span>Permanent Archive Protection Enabled</span>
        </div>
        <p className="text-[10px] text-gray-400 leading-relaxed">
          Every ingested file is fully archived in the <code className="text-[#a855f7]">documents.content</code> table. Even if local files are deleted or moved on your disk, your search queries and document previews operate directly from PostgreSQL.
        </p>
      </div>

      <ConfirmModal
        isOpen={confirmTruncate}
        title="Truncate Database?"
        message="Are you sure you want to instantly delete all documents and vectors? This cannot be undone."
        confirmText="Truncate"
        isDestructive={true}
        onConfirm={handleTruncateAll}
        onCancel={() => setConfirmTruncate(false)}
      />

      <ConfirmModal
        isOpen={confirmReembed}
        title="Re-embed Database?"
        message="This will re-chunk and re-embed all archived documents. This may take a while depending on DB size."
        confirmText="Re-embed"
        isDestructive={false}
        onConfirm={handleReembedAll}
        onCancel={() => setConfirmReembed(false)}
      />
    </div>
  )
}

export default SettingDBPropertiesPanel
