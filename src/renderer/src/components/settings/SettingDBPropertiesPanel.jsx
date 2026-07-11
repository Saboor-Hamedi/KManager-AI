import React, { useState, useEffect } from 'react'
import { Database, RefreshCw, Layers, FileText, HardDrive, CheckCircle2, AlertCircle, Trash2, Cpu, AlertTriangle } from 'lucide-react'

const SettingDBPropertiesPanel = () => {
  const [dbStats, setDbStats] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [actionState, setActionState] = useState(null) // { type: 'reembed' | 'truncate', status: 'progress' | 'success' | 'error', progress: 0, message: '' }
  const [confirmTruncate, setConfirmTruncate] = useState(false)

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

  const handleReembedAll = async () => {
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
  }

  const handleTruncateAll = async () => {
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
        setConfirmTruncate(false)
        loadStats()
        window.dispatchEvent(new Event('db-stats-updated'))
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
  }

  const totalDocs = dbStats?.total_docs || 0
  const totalChunks = dbStats?.total_chunks || 0
  const avgChunks = totalDocs > 0 ? (totalChunks / totalDocs).toFixed(1) : '0'

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-black tracking-tight text-[var(--text-main)] mb-1">DB Properties & Storage</h3>
          <p className="text-sm font-bold text-[var(--text-muted)]">Live statistics, format distributions, and maintenance tools for your Knowledge Hub.</p>
        </div>
        <button
          onClick={loadStats}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-active)] hover:bg-[#2c2c2c] text-xs font-bold text-[var(--text-main)] border border-[var(--border-subtle)] transition-colors shadow-sm"
          title="Refresh statistics"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin text-[#a855f7]' : 'text-[#a855f7]'} />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3 text-red-300 text-xs font-semibold">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Action Progress / Notification Banner */}
      {actionState && (
        <div className={`p-4 rounded-xl border flex flex-col gap-2 ${
          actionState.status === 'error'
            ? 'bg-red-500/10 border-red-500/30 text-red-300'
            : actionState.status === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            : 'bg-[#a855f7]/10 border-[#a855f7]/30 text-gray-200'
        }`}>
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="flex items-center gap-2">
              {actionState.status === 'progress' && <RefreshCw size={14} className="animate-spin text-[#a855f7]" />}
              {actionState.status === 'success' && <CheckCircle2 size={14} className="text-emerald-400" />}
              {actionState.status === 'error' && <AlertCircle size={14} className="text-red-400" />}
              <span>{actionState.message}</span>
            </span>
            <button
              onClick={() => setActionState(null)}
              className="text-gray-400 hover:text-gray-200 text-xs font-normal"
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#181818] border border-[#2a2a2a] rounded-xl p-4 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total Documents</span>
            <FileText size={16} className="text-[#a855f7]" />
          </div>
          <div className="text-3xl font-black text-gray-100 tracking-tight">
            {totalDocs.toLocaleString()}
          </div>
          <div className="text-[11px] font-medium text-gray-400 mt-1">Archived in PostgreSQL</div>
        </div>

        <div className="bg-[#181818] border border-[#2a2a2a] rounded-xl p-4 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Vector Chunks</span>
            <Layers size={16} className="text-[#a855f7]" />
          </div>
          <div className="text-3xl font-black text-[#a855f7] tracking-tight">
            {totalChunks.toLocaleString()}
          </div>
          <div className="text-[11px] font-medium text-gray-400 mt-1">Indexed via pgvector</div>
        </div>

        <div className="bg-[#181818] border border-[#2a2a2a] rounded-xl p-4 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Avg Chunks / Doc</span>
            <HardDrive size={16} className="text-[#a855f7]" />
          </div>
          <div className="text-3xl font-black text-gray-100 tracking-tight">
            {avgChunks}
          </div>
          <div className="text-[11px] font-medium text-gray-400 mt-1">Semantic density ratio</div>
        </div>
      </div>

      {/* Format Distribution Table / Cards */}
      <div className="bg-[#181818] border border-[#2a2a2a] rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Database size={16} className="text-[#a855f7]" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-200">Ingested File Formats</h4>
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
                      className="bg-[#131313] border border-[#242424] hover:border-[#333] rounded-lg p-3 space-y-2 transition-colors"
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
      <div className="bg-[#181818] border border-[#2a2a2a] rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-[#2a2a2a] pb-3">
          <Cpu size={16} className="text-[#a855f7]" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-200">Database Maintenance & Operations</h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Re-embed Operation */}
          <div className="bg-[#131313] border border-[#252525] rounded-xl p-4 flex flex-col justify-between">
            <div className="space-y-1.5 mb-4">
              <span className="text-xs font-bold text-gray-200 flex items-center gap-2">
                <Cpu size={14} className="text-purple-400" />
                Re-embed Knowledge Base
              </span>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Re-chunks all archived document content and regenerates semantic embeddings without needing to re-upload files from disk.
              </p>
            </div>
            <button
              onClick={handleReembedAll}
              disabled={actionState?.status === 'progress' || totalDocs === 0}
              className="w-full px-3 py-2 rounded-lg bg-[#a855f7] hover:bg-[#9333ea] disabled:opacity-40 disabled:hover:bg-[#a855f7] text-white text-xs font-bold transition-colors shadow-md"
            >
              {actionState?.type === 'reembed' && actionState?.status === 'progress' ? 'Re-embedding...' : 'Re-embed All Documents'}
            </button>
          </div>

          {/* Truncate All Data Operation */}
          <div className="bg-[#131313] border border-[#252525] rounded-xl p-4 flex flex-col justify-between">
            <div className="space-y-1.5 mb-4">
              <span className="text-xs font-bold text-red-400 flex items-center gap-2">
                <Trash2 size={14} />
                Truncate Knowledge Base
              </span>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Lightweight instant truncation (<code className="text-red-300">TRUNCATE TABLE</code>) clears all documents, chunks, and feedback in O(1) time.
              </p>
            </div>

            {!confirmTruncate ? (
              <button
                onClick={() => setConfirmTruncate(true)}
                disabled={actionState?.status === 'progress' || totalDocs === 0}
                className="w-full px-3 py-2 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/40 text-red-300 disabled:opacity-40 text-xs font-bold transition-colors"
              >
                Truncate All Tables
              </button>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-red-300">
                  <AlertTriangle size={13} />
                  <span>Are you sure? This cannot be undone.</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleTruncateAll}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors"
                  >
                    Confirm Truncate
                  </button>
                  <button
                    onClick={() => setConfirmTruncate(false)}
                    className="px-3 py-1.5 rounded-lg bg-[#252525] hover:bg-[#2f2f2f] text-gray-300 text-xs font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Storage Architecture Overview */}
      <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-4">
        <div className="flex items-center gap-2 text-xs font-bold text-gray-300 mb-2">
          <CheckCircle2 size={15} className="text-emerald-400" />
          <span>Permanent Archive Protection Enabled</span>
        </div>
        <p className="text-xs text-gray-400 leading-relaxed">
          Every ingested file is fully archived in the <code className="text-[#a855f7]">documents.content</code> table. Even if local files are deleted or moved on your disk, your search queries and document previews operate directly from PostgreSQL.
        </p>
      </div>
    </div>
  )
}

export default SettingDBPropertiesPanel
