import React, { memo } from 'react'
import { Activity, Search, ThumbsUp, ThumbsDown, FileText, CheckCircle2, Clock } from 'lucide-react'

const AnalyticsActivityFeed = memo(({ data }) => {
  const feed = data?.activityFeed || []

  return (
    <div className="bg-[var(--bg-card)]/50 border border-[var(--border-dim)] rounded-xl p-4 transition-all w-full min-h-[520px] flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xs font-semibold text-[var(--text-main)]">
              Live Database Activity Telemetry Feed
            </h2>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
              Real-time stream of RAG queries, user evaluations, and document chunk ingestion
            </p>
          </div>
          <span className="px-2 py-0.5 rounded bg-[var(--bg-panel)] text-[var(--text-muted)] text-[11px] font-mono border border-[var(--border-dim)]">
            {feed.length} events
          </span>
        </div>

        {!feed.length ? (
          <div className="text-center py-24 border border-dashed border-[var(--border-dim)] rounded-2xl bg-[var(--bg-app)]/30 min-h-[380px] flex flex-col items-center justify-center">
            <Activity size={32} className="mx-auto text-[var(--text-muted)] mb-3 opacity-50" />
            <p className="text-sm font-bold text-[var(--text-main)]">No recent activity logged yet.</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">Run queries in the Chat tab or ingest documents to see real-time telemetry here.</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[520px] min-h-[400px] overflow-y-auto pr-2 custom-scrollbar w-full">
          {feed.map((item, idx) => {
            const isSearch = item.eventType === 'search' || item.type === 'search'
            const isFeedback = item.eventType === 'feedback' || item.type === 'feedback'
            const isIngest = item.eventType === 'ingest' || item.type === 'ingest'

            return (
              <div 
                key={idx} 
                className="flex items-center justify-between p-3.5 bg-[var(--bg-panel)]/80 hover:bg-[var(--bg-panel)] border border-[var(--border-dim)] rounded-2xl transition-all duration-200 group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="p-2 rounded-lg border border-[var(--border-dim)] bg-[var(--bg-app)]/60 text-[var(--text-muted)] shrink-0">
                    {isSearch ? <Search size={14} /> : isFeedback ? (item.score === 1 ? <ThumbsUp size={14} /> : <ThumbsDown size={14} />) : <FileText size={14} />}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-[var(--text-main)]">
                        {isSearch ? 'Query' : isFeedback ? 'Rating' : 'Ingest'}
                      </span>
                      {isSearch && item.top_similarity && (
                        <span className="text-[11px] font-mono text-[var(--text-muted)] bg-[var(--bg-panel)] px-1.5 py-0.5 rounded border border-[var(--border-dim)]">
                          {Number(item.top_similarity).toFixed(2)}
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-bold text-[var(--text-main)] truncate max-w-md mt-0.5" title={item.title || item.file_name}>
                      {item.title || item.file_name || 'System Event'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0 font-mono text-xs">
                  {isSearch && item.latency_ms && (
                    <span className="text-[var(--text-accent)] font-bold">{item.latency_ms} ms</span>
                  )}
                  {isFeedback && (
                    <span className={`font-black ${item.score === 1 ? 'text-[#10b981]' : 'text-[var(--icon-danger)]'}`}>
                      {item.score === 1 ? '+1 Helpful' : '-1 Issue'}
                    </span>
                  )}
                  {isIngest && (
                    <span className="text-[#8b5cf6] font-bold flex items-center gap-1">
                      <CheckCircle2 size={12} /> Indexed
                    </span>
                  )}
                  <span className="text-[10px] text-[var(--text-faint)] flex items-center gap-1">
                    <Clock size={11} />
                    {item.created_at ? new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Just now'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
      </div>
    </div>
  )
})

export default AnalyticsActivityFeed
