import React, { useState, useEffect, useCallback } from 'react'
import { Loader2, RefreshCw, X, LayoutDashboard, BarChart2, List, Activity, Settings2, Database, PanelLeftClose, PanelLeft } from 'lucide-react'
import { cn } from '../../lib/utils'
import AnalyticsCards from './AnalyticsCards'
import AnalyticsFigures from './AnalyticsFigures'
import AnalyticsTable from './AnalyticsTable'
import AnalyticsActivityFeed from './AnalyticsActivityFeed'
import AnalyticsDatabase from './AnalyticsDatabase'
import { processAnalyticsData } from './analyticsDataHelper'
import { useKeyboardShortcuts } from '../../../../utils/useKeyboardShortcuts'

const AnalyticsModal = ({ isOpen, onClose }) => {
  const [isLoading, setIsLoading] = useState(true)
  const [data, setData] = useState(null)
  const [activeSection, setActiveSection] = useState('cards')
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

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

  // Fetch metrics whenever modal opens
  useEffect(() => {
    if (isOpen) {
      fetchMetrics()
    }
  }, [isOpen, fetchMetrics])

  useKeyboardShortcuts({
    onEscape: isOpen ? () => {
      onClose()
      return true
    } : undefined
  })

  if (!isOpen) return null

  const tabs = [
    { id: 'cards', label: 'Overview', icon: LayoutDashboard },
    { id: 'figures', label: 'Performance Charts', icon: BarChart2 },
    { id: 'database', label: 'Database & Tradeoffs', icon: Database },
    { id: 'table', label: 'Raw Telemetry', icon: List },
    { id: 'feed', label: 'Activity Feed', icon: Activity },
  ]

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xl flex items-center justify-center z-[10000] animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="bg-[var(--bg-app)] rounded-[5px] shadow-[var(--shadow-modal)] flex flex-col overflow-hidden w-[90vw] h-[85vh] max-w-[1200px] animate-in zoom-in-95 duration-200" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="h-[26px] bg-[var(--bg-panel)] flex items-center justify-between shrink-0 select-none border-b border-white/[0.04]">
          <div className="flex items-center h-full">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="h-full px-3 hover:bg-[var(--bg-active)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors flex items-center justify-center border-0"
              title="Toggle Sidebar"
            >
              {isSidebarOpen ? <PanelLeftClose size={13} /> : <PanelLeft size={13} />}
            </button>
            <div className="flex items-center gap-1.5 ml-1">
              <h2 className="text-[11px] font-semibold text-[var(--text-main)] tracking-tight">Hybrid RAG Analytics</h2>
            </div>
          </div>
          <div className="flex items-center h-full">
            <button
              onClick={fetchMetrics}
              disabled={isLoading}
              className="h-full px-3 hover:bg-[var(--bg-active)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 border-0"
              title="Sync Metrics"
            >
              {isLoading ? <Loader2 size={12} className="animate-spin text-[var(--text-accent)]" /> : <RefreshCw size={12} />}
              <span className="text-[10px] font-semibold">{isLoading ? 'Syncing...' : 'Sync Data'}</span>
            </button>
            <button
              onClick={onClose}
              className="h-full px-3 hover:bg-[#e81123] hover:text-white text-[var(--text-muted)] transition-colors flex items-center justify-center border-0"
              title="Close Analytics (Esc)"
            >
              <X size={13} />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-row min-h-0 relative bg-[var(--bg-app)]">
          
          {/* Inner Sidebar */}
          <div className={cn(
            "h-full bg-[var(--bg-panel)]/30 border-r border-[var(--border-dim)] flex flex-col transition-all duration-300 ease-in-out overflow-hidden shrink-0",
            isSidebarOpen ? "w-56" : "w-0 border-r-0"
          )}>
            <div className="w-56 py-4 space-y-5">
              <div className="space-y-1.5">
                <h3 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest px-5 pb-1.5">Views</h3>
                <div className="flex flex-col">
                  {tabs.map(tab => {
                    const Icon = tab.icon
                    const isActive = activeSection === tab.id
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveSection(tab.id)}
                        className={cn(
                          "w-full flex items-center gap-3 px-5 py-2.5 text-[12px] font-semibold transition-all duration-200 relative outline-none border-0",
                          isActive 
                            ? "bg-[var(--bg-active)] text-[var(--text-accent)]" 
                            : "text-[var(--text-muted)] hover:bg-[var(--bg-active)] hover:text-[var(--text-main)]"
                        )}
                      >
                        {isActive && (
                          <div className="absolute left-0 top-0.5 bottom-0.5 w-0.5 bg-[var(--text-accent)] rounded-full" />
                        )}
                        <Icon size={15} className={isActive ? "text-[var(--text-accent)]" : "group-hover:text-[var(--text-main)]"} />
                        <span className="tracking-wide">{tab.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {data?.isUsingBenchmark && (
                <div className="mt-4 p-3 rounded-md bg-[var(--bg-active)] border border-[var(--border-dim)]">
                  <div className="flex items-center gap-1.5 text-[var(--text-accent)] mb-1">
                    <Activity size={12} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Benchmark Mode</span>
                  </div>
                  <p className="text-[10px] text-[var(--text-muted)] leading-tight">
                    Tracking <span className="text-[var(--text-main)] font-semibold">{data.totalQueries}</span> points in eval mode.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Main Scrollable Analytics View */}
          <div className="flex-1 min-w-0 bg-[var(--bg-app)] overflow-y-auto custom-scrollbar p-6 lg:p-8">
            <div className="max-w-5xl mx-auto space-y-6">
              {isLoading && !data ? (
                <div className="flex flex-col items-center justify-center h-64 gap-3 animate-pulse">
                  <div className="w-8 h-8 rounded-full border-2 border-[var(--text-accent)] border-t-transparent animate-spin" />
                  <span className="text-xs font-medium text-[var(--text-muted)]">Loading metrics from database...</span>
                </div>
              ) : (
                <div className="flex flex-col gap-10 animate-in fade-in duration-300">
                  {activeSection === 'cards' && <AnalyticsCards data={data} />}
                  {activeSection === 'figures' && <AnalyticsFigures data={data} />}
                  {activeSection === 'database' && <AnalyticsDatabase data={data} />}
                  {activeSection === 'table' && <AnalyticsTable data={data} />}
                  {activeSection === 'feed' && <AnalyticsActivityFeed data={data} />}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

export default AnalyticsModal