import React, { memo, useRef, useState, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import CopyFigureButton from '../CopyFigureButton'

const LatencyComparisonFigure = memo(({ data }) => {
  const chartRef = useRef(null)
  const [timeWindow, setTimeWindow] = useState('25')

  const rawData = data?.chartData || []

  const visibleData = useMemo(() => {
    if (timeWindow === 'all') return rawData
    const n = Number(timeWindow) || 25
    return rawData.slice(-n)
  }, [rawData, timeWindow])

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const point = payload[0].payload
      const savings = point.standard - point.hybrid
      const pct = point.standard > 0 ? Math.round((savings / point.standard) * 100) : 0
      
      return (
        <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] p-2.5 rounded-lg shadow-md text-xs z-50 min-w-[180px]">
          <div className="font-semibold text-[var(--text-main)] border-b border-[var(--border-subtle)] pb-1.5 mb-1.5 truncate max-w-[220px]" title={point.queryText}>
            {label}: {point.queryText}
          </div>
          <div className="space-y-1 font-mono">
            <div className="flex justify-between items-center text-[var(--text-muted)]">
              <span>Standard:</span>
              <span>{point.standard}ms</span>
            </div>
            <div className="flex justify-between items-center text-[var(--text-main)] font-semibold">
              <span>Hybrid:</span>
              <span>{point.hybrid}ms</span>
            </div>
            <div className="pt-1 border-t border-[var(--border-subtle)] flex justify-between items-center text-[var(--text-muted)]">
              <span>Saved:</span>
              <span>{savings}ms ({pct}%)</span>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div ref={chartRef} className="bg-white/[0.01] border border-white/[0.04] rounded-[12px] p-4 hover:border-[var(--border-subtle)] transition-all flex-1 w-full min-w-0 relative">
      <CopyFigureButton targetRef={chartRef} filename="latency-comparison.png" />
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3 pr-8">
        <div>
          <h2 className="text-xs font-semibold text-[var(--text-main)]">
            End-to-End Latency Comparison (ms)
          </h2>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
            Standard RAG vs Intent-Aware Hybrid Routing across {visibleData.length} queries
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 sm:ml-auto">
          {/* Range Selector */}
          <div className="flex bg-[var(--bg-app)]/60 rounded-lg p-0.5 text-xs">
            {['15', '25', '50', 'all'].map(win => (
              <button
                key={win}
                onClick={() => setTimeWindow(win)}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  timeWindow === win
                    ? 'bg-white/[0.03] text-[var(--text-main)] font-medium shadow-none border border-white/[0.04]'
                    : 'text-[var(--text-muted)] hover:bg-[var(--bg-active)] hover:text-[var(--text-main)]'
                }`}
              >
                {win === 'all' ? 'All' : win}
              </button>
            ))}
          </div>

          {/* Legend (Single Words) */}
          <div className="flex items-center gap-3 text-xs font-medium">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[var(--icon-danger)]" />
              <span className="text-[var(--text-main)]">Standard</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[var(--icon-secondary)]" />
              <span className="text-[var(--text-main)]">Hybrid</span>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full h-[280px] mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={visibleData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }} barGap={3}>
            <defs>
              <linearGradient id="gradStandard" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--icon-danger)" stopOpacity={1} />
                <stop offset="100%" stopColor="var(--icon-danger)" stopOpacity={0.6} />
              </linearGradient>
              <linearGradient id="gradHybrid" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--icon-secondary)" stopOpacity={1} />
                <stop offset="100%" stopColor="var(--icon-secondary)" stopOpacity={0.6} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-dim)" vertical={false} opacity={0.4} />
            <XAxis dataKey="label" stroke="var(--text-muted)" fontSize={11} fontWeight="bold" tickLine={false} axisLine={false} />
            <YAxis stroke="var(--text-muted)" fontSize={11} fontWeight="bold" tickLine={false} axisLine={false} unit="ms" />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--bg-panel)', opacity: 0.5 }} />
            <Bar dataKey="standard" name="Standard RAG" fill="url(#gradStandard)" radius={[6, 6, 0, 0]} maxBarSize={32} />
            <Bar dataKey="hybrid" name="Hybrid Smart RAG" fill="url(#gradHybrid)" radius={[6, 6, 0, 0]} maxBarSize={32} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
})

export default LatencyComparisonFigure
