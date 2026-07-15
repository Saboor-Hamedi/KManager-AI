import React, { memo } from 'react'
import { Search, Database, ThumbsUp, ThumbsDown, Activity } from 'lucide-react'
import { cn } from '../../lib/utils'

const formatRelativeTime = (dateStr) => {
  if (!dateStr) return 'Just now'
  const date = new Date(dateStr)
  const diffSec = Math.floor((new Date() - date) / 1000)
  if (isNaN(diffSec) || diffSec < 60) return 'Just now'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin} min${diffMin > 1 ? 's' : ''} ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr} hr${diffHr > 1 ? 's' : ''} ago`
  const diffDay = Math.floor(diffHr / 24)
  return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`
}

const DashboardActivityFeed = memo(({ results }) => {
  const feed = results?.activityFeed || []

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-dim)] rounded-xl p-6 hover:border-[var(--border-subtle)] transition-all duration-300 w-full lg:w-80 shrink-0 flex flex-col max-h-[500px] overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-sm font-black text-[var(--text-main)] tracking-widest uppercase">Real-Time Telemetry Feed</h2>
        <span className="text-[10px] bg-[var(--bg-panel)] px-2 py-0.5 rounded font-mono text-[var(--text-muted)]">
          {feed.length} Events
        </span>
      </div>
      
      {feed.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-4 text-[var(--text-muted)] text-xs gap-2">
          <Activity size={24} className="opacity-40" />
          <span>No activity logged yet. Run queries in Search or Chat to populate live database events.</span>
        </div>
      ) : (
        <div className="space-y-5 overflow-y-auto custom-scrollbar pr-1 flex-1">
          {feed.map((log, index) => {
            let Icon = Search
            let colorClass = 'text-[var(--text-accent)]'
            let bgClass = 'bg-[var(--text-accent)]/10'
            let titleText = log.title || 'Event'
            let detailsText = ''

            if (log.eventType === 'search') {
              Icon = Search
              colorClass = 'text-[#3b82f6]'
              bgClass = 'bg-[#3b82f6]/10'
              detailsText = `${log.latency_ms || 0}ms • Sim: ${log.top_similarity ? Number(log.top_similarity).toFixed(2) : '0.00'}`
            } else if (log.eventType === 'feedback') {
              Icon = log.score > 0 ? ThumbsUp : ThumbsDown
              colorClass = log.score > 0 ? 'text-[#10b981]' : 'text-[var(--icon-danger)]'
              bgClass = log.score > 0 ? 'bg-[#10b981]/10' : 'bg-[var(--icon-danger)]/10'
              detailsText = log.score > 0 ? 'Rated +1 Relevant' : 'Rated -1 Irrelevant'
            } else if (log.eventType === 'ingest') {
              Icon = Database
              colorClass = 'text-purple-400'
              bgClass = 'bg-purple-500/10'
              detailsText = `Document (${log.file_type || 'file'})`
            }

            return (
              <div key={`${log.eventType}-${log.id || index}`} className="relative flex gap-3 group items-start">
                {index !== feed.length - 1 && (
                  <div className="absolute left-3.5 top-8 bottom-[-20px] w-px bg-[var(--border-dim)] group-hover:bg-[var(--text-accent)]/30 transition-colors"></div>
                )}
                
                <div className={cn("w-7 h-7 rounded-full flex items-center justify-center shrink-0 z-10 transition-transform group-hover:scale-110 mt-0.5", bgClass, colorClass)}>
                  <Icon size={13} />
                </div>
                
                <div className="pt-0.5 flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-[var(--text-main)] group-hover:text-[var(--text-accent)] transition-colors truncate" title={titleText}>
                    {titleText}
                  </p>
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <span className="text-[10px] font-medium text-[var(--text-muted)] truncate">
                      {detailsText}
                    </span>
                    <span className="text-[9px] font-mono text-[var(--text-faint)] shrink-0">
                      {formatRelativeTime(log.created_at)}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
})

export default DashboardActivityFeed
