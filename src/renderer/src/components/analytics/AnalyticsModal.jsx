import React, { useState, useEffect, useCallback } from 'react'
import { Loader2, RefreshCw, X, LayoutDashboard, BarChart2, List, Activity, Settings2, Database, PanelLeftClose, PanelLeft } from 'lucide-react'
import { cn } from '../../lib/utils'
import AnalyticsCards from './AnalyticsCards'
import AnalyticsFigures from './AnalyticsFigures'
import AnalyticsTable from './AnalyticsTable'
import AnalyticsActivityFeed from './AnalyticsActivityFeed'
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
    { id: 'table', label: 'Raw Telemetry', icon: List },
    { id: 'feed', label: 'Activity Feed', icon: Activity },
  ]

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[10000] animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="bg-[var(--bg-app)] border border-[var(--border-subtle)] rounded-[5px] shadow-[0_0_60px_-15px_rgba(0,0,0,0.7)] flex flex-col overflow-hidden w-[90vw] h-[85vh] max-w-[1200px] animate-in zoom-in-95 duration-200 ring-1 ring-white/5" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="h-8 bg-[var(--bg-panel)] border-b border-[var(--border-dim)] flex items-center justify-between shrink-0">
          <div className="flex items-center h-full">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="h-full px-3 hover:bg-[var(--bg-active)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors flex items-center justify-center"
              title="Toggle Sidebar"
            >
              {isSidebarOpen ? <PanelLeftClose size={15} /> : <PanelLeft size={15} />}
            </button>
            <div className="flex items-center gap-2 ml-2">
              <h2 className="text-xs font-semibold text-[var(--text-main)] tracking-wide">Hybrid RAG Analytics</h2>
            </div>
          </div>
          <div className="flex items-center h-full">
            <button
              onClick={fetchMetrics}
              disabled={isLoading}
              className="h-full px-3 hover:bg-[var(--bg-active)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
              title="Sync Metrics"
            >
              {isLoading ? <Loader2 size={12} className="animate-spin text-[var(--text-accent)]" /> : <RefreshCw size={12} />}
              <span className="text-[11px] font-medium">{isLoading ? 'Syncing...' : 'Sync'}</span>
            </button>
            <button
              onClick={onClose}
              className="h-full px-3 hover:bg-[#e81123] hover:text-white text-[var(--text-muted)] transition-colors flex items-center justify-center"
              title="Close Analytics (Esc)"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-row min-h-0 relative">
          
          {/* Inner Sidebar */}
          <div className={cn(
            "h-full bg-[var(--bg-activitybar)] border-r border-[var(--border-dim)] flex flex-col transition-all duration-300 ease-in-out overflow-hidden shrink-0",
            isSidebarOpen ? "w-52" : "w-0 border-r-0"
          )}>
            <div className="w-52 p-3 space-y-4">
              <div className="space-y-1">
                <h3 className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest px-2 pb-1">Analytics Views</h3>
                <div className="flex flex-col gap-0.5">
                  {tabs.map(tab => {
                    const Icon = tab.icon
                    const isActive = activeSection === tab.id
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveSection(tab.id)}
                        className={cn(
                          "w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-md transition-colors border border-transparent",
                          isActive 
                            ? "bg-[var(--bg-active)] text-[var(--text-accent)] border-[var(--border-subtle)] shadow-sm" 
                            : "text-[var(--text-muted)] hover:bg-[var(--bg-active)] hover:text-[var(--text-main)]"
                        )}
                      >
                        <Icon size={14} className={isActive ? "text-[var(--text-accent)]" : "opacity-70"} />
                        <span>{tab.label}</span>
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