import React, { useState, useEffect } from 'react'
import { Database, RefreshCw, Layers, FileText, HardDrive, CheckCircle2, AlertCircle, Trash2, Cpu, AlertTriangle, Code, Terminal, FileSpreadsheet } from 'lucide-react'
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

  const formatBytes = (bytes, decimals = 1) => {
    if (!bytes || bytes === 0) return '0 B'
    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
  }

  const totalDocs = dbStats?.total_docs || 0
  const totalChunks = dbStats?.total_chunks || 0
  const avgChunks = totalDocs > 0 ? (totalChunks / totalDocs).toFixed(1) : '0'
  const totalDbSize = formatBytes(dbStats?.total_db_bytes || 0)
  const rawFileSize = formatBytes(dbStats?.raw_file_bytes || 0)

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-[13px] font-black tracking-tight text-[var(--text-main)] mb-0.5">DB Properties & Storage</h3>
          <p className="text-[11px] font-bold text-[var(--text-muted)]">Live statistics, format distributions, and maintenance tools for your Knowledge Hub.</p>
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setConfirmReembed(true)}
            disabled={actionState?.status === 'progress'}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#a855f7]/15 hover:bg-[#a855f7]/30 text-[#d8b4fe] disabled:opacity-40 text-[11px] font-bold transition-colors border border-[#a855f7]/30 shadow-sm"
            title="Re-embed all documents with semantic chunking"
          >
            <Cpu size={13} className={actionState?.status === 'progress' && actionState?.type === 'reembed' ? 'animate-spin' : ''} />
            <span>Re-embed</span>
          </button>

          <button
            onClick={() => setConfirmTruncate(true)}
            disabled={actionState?.status === 'progress'}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-red-500/15 hover:bg-red-500/30 text-red-300 disabled:opacity-40 text-[11px] font-bold transition-colors border border-red-500/30 shadow-sm"
            title="Truncate all data tables instantly"
          >
            <Trash2 size={13} />
            <span>Truncate</span>
          </button>

          <button
            onClick={loadStats}
            disabled={loading}
            className="flex items-center justify-center w-7 h-7 rounded-md bg-[var(--bg-active)] hover:bg-[#2c2c2c] text-[var(--text-main)] border border-[var(--border-subtle)] transition-colors shadow-sm ml-1"
            title="Refresh statistics"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin text-[#a855f7]' : 'text-[#a855f7]'} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-md bg-red-500/10 border border-red-500/30 flex items-center gap-2 text-red-300 text-[11px] font-semibold">
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}

      {/* Action Progress / Notification Banner */}
      {/* Action Progress / Notification Banner */}
      {actionState && (
        <div className={`px-3.5 h-[56px] rounded-md border flex flex-col justify-center gap-1.5 transition-all duration-200 ${
          actionState.status === 'error'
            ? 'bg-red-500/10 border-red-500/30 text-red-300'
            : actionState.status === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            : 'bg-[#a855f7]/10 border-[#a855f7]/30 text-[var(--text-main)]'
        }`}>
          <div className="flex items-center justify-between text-[11px] font-bold">
            <span className="flex items-center gap-2">
              {actionState.status === 'progress' && <RefreshCw size={12} className="animate-spin text-[#a855f7] shrink-0" />}
              {actionState.status === 'success' && <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />}
              {actionState.status === 'error' && <AlertCircle size={12} className="text-red-400 shrink-0" />}
              <span className="truncate">{actionState.message}</span>
            </span>
            <button
              onClick={() => setActionState(null)}
              className="text-[var(--text-muted)] hover:text-[var(--text-main)] text-[10px] font-normal ml-2 shrink-0 border-0"
            >
              Dismiss
            </button>
          </div>
          <div className="w-full h-1.5 bg-[#222] rounded-full overflow-hidden">
            {actionState.status === 'progress' ? (
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-[#a855f7] rounded-full transition-all duration-300"
                style={{ width: `${Math.max(actionState.progress, 5)}%` }}
              />
            ) : actionState.status === 'success' ? (
              <div className="h-full bg-emerald-400 rounded-full w-full transition-all duration-300" />
            ) : (
              <div className="h-full bg-red-400 rounded-full w-full transition-all duration-300" />
            )}
          </div>
        </div>
      )}

      {/* Top Metrics Cards - 4 Column Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-[var(--bg-card)] border border-[var(--border-dim)] rounded-md p-3 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Total Documents</span>
            <FileText size={14} className="text-[#a855f7]" />
          </div>
          <div className="text-[16px] font-semibold text-[var(--text-main)] font-mono tracking-normal">
            {totalDocs.toLocaleString()}
          </div>
          <div className="text-[10px] font-medium text-[var(--text-muted)] mt-1">Archived in PostgreSQL</div>
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border-dim)] rounded-md p-3 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Vector Chunks</span>
            <Layers size={14} className="text-[#a855f7]" />
          </div>
          <div className="text-[16px] font-semibold text-[#a855f7] font-mono tracking-normal">
            {totalChunks.toLocaleString()}
          </div>
          <div className="text-[10px] font-medium text-[var(--text-muted)] mt-1">Indexed via pgvector</div>
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border-dim)] rounded-md p-3 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">DB Storage Size</span>
            <Database size={14} className="text-[#a855f7]" />
          </div>
          <div className="text-[16px] font-semibold text-[#61afef] font-mono tracking-normal">
            {totalDbSize}
          </div>
          <div className="text-[10px] font-medium text-[var(--text-muted)] mt-1">Tables & pgvector indexes</div>
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border-dim)] rounded-md p-3 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Avg Chunks / Doc</span>
            <HardDrive size={14} className="text-[#a855f7]" />
          </div>
          <div className="text-[16px] font-semibold text-[var(--text-main)] font-mono tracking-normal">
            {avgChunks}
          </div>
          <div className="text-[10px] font-medium text-[var(--text-muted)] mt-1">Raw text size: {rawFileSize}</div>
        </div>
      </div>

      {/* Format Distribution Table */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-dim)] rounded-md p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Database size={13} className="text-[#a855f7]" />
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-main)]">Ingested File Formats</h4>
          </div>
          <span className="text-[10px] font-semibold text-[var(--text-muted)]">
            {dbStats?.by_type ? Object.keys(dbStats.by_type).length : 0} format(s)
          </span>
        </div>

        {dbStats && dbStats.by_type && Object.keys(dbStats.by_type).length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse mt-1">
              <thead>
                <tr className="border-b border-[var(--border-subtle)]/40 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                  <th className="py-2.5 pl-2">File Type (Icon)</th>
                  <th className="py-2.5 pl-4">Count</th>
                  <th className="py-2.5 pl-4">Total Size (MB)</th>
                  <th className="py-2.5 pl-4">Avg Size/File (KB)</th>
                  <th className="py-2.5 pl-4 pr-2">Distribution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]/20">
                {Object.entries(dbStats.by_type)
                  .sort(([, a], [, b]) => Number(b) - Number(a))
                  .map(([format, count]) => {
                    const num = Number(count)
                    const percentage = totalDocs > 0 ? Math.round((num / totalDocs) * 100) : 0
                    const typeDetails = dbStats.by_type_details?.[format] || dbStats.by_type_details?.[`.${format}`] || dbStats.by_type_details?.[format.replace('.', '')]
                    const typeBytes = typeDetails?.bytes || 0
                    const avgBytes = num > 0 ? Math.round(typeBytes / num) : 0

                    const baseBadgeClass = "inline-flex items-center justify-center gap-1.5 w-16 py-1 rounded font-mono font-bold text-[10px] shrink-0 border-0"
                    let iconBadge = <span className={`${baseBadgeClass} bg-[#252833] text-[var(--text-muted)]`}><FileText size={11}/>{format}</span>
                    if (format === 'md' || format === '.md') {
                      iconBadge = <span className={`${baseBadgeClass} bg-[#a855f7]/15 text-[#c084fc]`}><FileText size={11}/>.md</span>
                    } else if (format === 'AI_RESPONSE' || format === 'AI' || format === 'ai') {
                      iconBadge = <span className={`${baseBadgeClass} bg-purple-500/15 text-purple-300`}><Cpu size={11}/>AI</span>
                    } else if (format === 'pdf' || format === '.pdf') {
                      iconBadge = <span className={`${baseBadgeClass} bg-red-500/15 text-red-400`}><FileText size={11}/>.pdf</span>
                    } else if (format === 'json' || format === '.json') {
                      iconBadge = <span className={`${baseBadgeClass} bg-amber-500/15 text-amber-300`}><Code size={11}/>.json</span>
                    } else if (format === 'py' || format === '.py') {
                      iconBadge = <span className={`${baseBadgeClass} bg-blue-500/15 text-blue-400`}><Terminal size={11}/>.py</span>
                    } else if (format === 'xlsx' || format === '.xlsx' || format === 'xls' || format === '.xls' || format === 'csv' || format === '.csv') {
                      iconBadge = <span className={`${baseBadgeClass} bg-emerald-500/15 text-emerald-400`}><FileSpreadsheet size={11}/>.{format.replace('.', '')}</span>
                    }

                    const displayFormatName = format === 'AI_RESPONSE' || format === 'AI' ? 'AI_RESPONSE' : format.startsWith('.') ? format : `.${format}`

                    return (
                      <tr key={format} className="hover:bg-[var(--bg-panel)]/50 transition-colors text-[10px] text-[var(--text-main)] font-semibold">
                        <td className="py-3 pl-2">
                          <div className="flex items-center gap-3 font-mono">
                            {iconBadge}
                            <span className="font-bold text-[10px]">{displayFormatName}</span>
                          </div>
                        </td>
                        <td className="py-3 pl-4 font-mono font-bold">
                          {num.toLocaleString()}
                        </td>
                        <td className="py-3 pl-4 text-[var(--text-muted)] font-mono font-bold">
                          ~{formatBytes(typeBytes)}
                        </td>
                        <td className="py-3 pl-4 text-[var(--text-muted)] font-mono">
                          ~{formatBytes(avgBytes)}/file
                        </td>
                        <td className="py-3 pl-4 pr-2">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-1.5 bg-[#202020] rounded-full overflow-hidden max-w-[200px]">
                              <div
                                className="h-full bg-gradient-to-r from-purple-500 to-[#a855f7] rounded-full transition-all duration-500"
                                style={{ width: `${Math.max(percentage, 2)}%` }}
                              />
                            </div>
                            <span className="font-mono text-[10px] text-[var(--text-muted)] font-bold w-10 text-right">{percentage}%</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-[var(--text-faint)] font-medium">
            No files ingested yet. Go to Data Ingestion to upload files.
          </div>
        )}
      </div>

      {/* Storage Architecture Overview */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-dim)] rounded-md p-3">
        <div className="flex items-center gap-2 text-[11px] font-bold text-[var(--text-muted)] mb-1.5">
          <CheckCircle2 size={13} className="text-emerald-400" />
          <span>Permanent Archive Protection Enabled</span>
        </div>
        <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
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
