import React, { useState, useEffect, useCallback } from 'react'
import { Loader2, RefreshCw } from 'lucide-react'
import AnalyticsCards from './AnalyticsCards'
import AnalyticsFigures from './AnalyticsFigures'
import AnalyticsTable from './AnalyticsTable'
import AnalyticsActivityFeed from './AnalyticsActivityFeed'
import { processAnalyticsData } from './analyticsDataHelper'

const AnalyticsContainer = () => {
  const [isLoading, setIsLoading] = useState(true)
  const [data, setData] = useState(null)
  const [activeSection, setActiveSection] = useState('all') // 'all' | 'cards' | 'figures' | 'table' | 'feed'
  const [hasRunInit, setHasRunInit] = useState(false)

  const fetchMetrics = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await window.api?.db?.getAnalytics()
      if (res && res.success) {
        const processed = processAnalyticsData(res.metrics || {})
        setData(processed)
      } else {
        const processed = processAnalyticsData({})
        setData(processed)
      }
    } catch (err) {
      console.error('Failed to fetch analytics metrics:', err)
      const processed = processAnalyticsData({})
      setData(processed)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!hasRunInit) {
      setHasRunInit(true)
      fetchMetrics()
    }
  }, [hasRunInit, fetchMetrics])

  return (
    <div className="space-y-4 pb-12 text-[var(--text-main)]">
      {/* Subtle & Compact Header & Section Navigation */}
      <div className="bg-[var(--bg-card)]/60 border border-[var(--border-dim)] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-semibold text-[var(--text-main)] tracking-tight">Hybrid RAG Analytics</h1>
            {data?.isUsingBenchmark && (
              <span className="px-2 py-0.5 rounded bg-[var(--bg-panel)] text-[var(--text-muted)] border border-[var(--border-dim)] text-[10px] font-mono">
                Benchmark Mode ({data.totalQueries} points)
              </span>
            )}
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            12 metrics, 5 Pareto/economics figures, raw telemetry table, and live activity feed.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 sm:ml-auto">
          {/* Subtle Compact Section Tabs (No Icons) */}
          <div className="flex bg-[var(--bg-app)]/60 rounded-lg p-0.5 text-xs">
            {[
              { id: 'all', label: 'Overview' },
              { id: 'cards', label: 'Cards' },
              { id: 'figures', label: 'Charts' },
              { id: 'table', label: 'Table' },
              { id: 'feed', label: 'Feed' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id)}
                className={`px-3 py-1 rounded-md transition-colors ${
                  activeSection === tab.id
                    ? 'bg-[var(--bg-card)] text-[var(--text-main)] font-medium shadow-sm'
                    : 'text-[var(--text-muted)] hover:bg-[var(--bg-active)] hover:text-[var(--text-main)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Refresh Action */}
          <button
            onClick={fetchMetrics}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--bg-panel)] hover:bg-[var(--border-dim)] text-[var(--text-main)] text-xs font-medium rounded-lg disabled:opacity-50 transition-colors"
          >
            {isLoading ? <Loader2 size={13} className="animate-spin text-[var(--text-muted)]" /> : <RefreshCw size={13} className="text-[var(--text-muted)]" />}
            <span>{isLoading ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Render Sections dynamically based on active tab */}
      {activeSection === 'cards' && (
        <AnalyticsCards data={data} />
      )}

      {(activeSection === 'all' || activeSection === 'figures') && (
        <AnalyticsFigures data={data} />
      )}

      {(activeSection === 'all' || activeSection === 'table') && (
        <AnalyticsTable data={data} />
      )}

      {(activeSection === 'all' || activeSection === 'feed') && (
        <AnalyticsActivityFeed data={data} />
      )}
    </div>
  )
}

export default AnalyticsContainer
