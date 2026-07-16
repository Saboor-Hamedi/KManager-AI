import React, { memo, useRef, useState, useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import CopyFigureButton from '../CopyFigureButton'

const TokenEconomicsFigure = memo(({ data }) => {
  const chartRef = useRef(null)
  const [timeWindow, setTimeWindow] = useState('25')

  const rawQueries = useMemo(() => {
    const all = data?.chartData || []
    if (timeWindow === 'all') return all
    const n = Number(timeWindow) || 25
    return all.slice(-n)
  }, [data?.chartData, timeWindow])

  let standardCum = 0
  let hybridCum = 0
  
  const economicsData = rawQueries.map((q, idx) => {
    const isConv = q.isConv
    const chunks = q.resultCount || 5
    
    // Standard always hits full context
    standardCum += 1200 + (chunks * 150)
    
    // Hybrid bypasses LLM on conversational
    if (isConv) {
      hybridCum += 45
    } else {
      hybridCum += 1200 + (chunks * 150)
    }
    
    return {
      query: `Q${idx + 1}`,
      Standard_RAG: standardCum,
      Hybrid_RAG: hybridCum,
      savings: standardCum - hybridCum
    }
  })

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const p = payload[0].payload
      return (
        <div className="bg-[var(--bg-panel)] border border-[var(--border-dim)] p-2.5 rounded-lg shadow-md text-xs z-50 min-w-[170px] font-mono">
          <p className="font-semibold text-[var(--text-main)] border-b border-[var(--border-dim)] pb-1 mb-1.5">{label} Cost</p>
          <div className="space-y-1">
            <div className="flex justify-between text-[var(--text-muted)]">
              <span>Standard:</span>
              <span>{(p.Standard_RAG / 1000).toFixed(1)}k</span>
            </div>
            <div className="flex justify-between text-[var(--text-main)] font-semibold">
              <span>Hybrid:</span>
              <span>{(p.Hybrid_RAG / 1000).toFixed(1)}k</span>
            </div>
            <div className="pt-1 border-t border-[var(--border-dim)]/40 flex justify-between text-[var(--text-muted)]">
              <span>Saved:</span>
              <span>{(p.savings / 1000).toFixed(1)}k</span>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div ref={chartRef} className="bg-[var(--bg-card)]/50 border border-[var(--border-dim)] rounded-xl p-4 hover:border-[var(--border-subtle)] transition-all flex-1 w-full min-w-0 relative">
      <CopyFigureButton targetRef={chartRef} filename="token-economics.png" />
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3 pr-8">
        <div>
          <h2 className="text-xs font-semibold text-[var(--text-main)]">
            Token & Cost Economics ({economicsData.length} records)
          </h2>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
            Cumulative API token expenditure over time
          </p>
        </div>

        {/* Range Selector Tabs on Right Side */}
        <div className="flex flex-wrap items-center justify-end gap-3 sm:ml-auto">
          <div className="flex bg-[var(--bg-app)]/60 rounded-lg p-0.5 text-xs">
            {['15', '25', '50', 'all'].map(win => (
              <button
                key={win}
                onClick={() => setTimeWindow(win)}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  timeWindow === win
                    ? 'bg-[var(--bg-card)] text-[var(--text-main)] font-medium shadow-sm/50'
                    : 'text-[var(--text-muted)] hover:bg-[var(--bg-active)] hover:text-[var(--text-main)]'
                }`}
              >
                {win === 'all' ? 'All' : win}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      <div className="w-full h-[280px] mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={economicsData} margin={{ top: 10, right: 15, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="gradStdCost" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--icon-danger)" stopOpacity={0.4} />
                <stop offset="100%" stopColor="var(--icon-danger)" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="gradHybCost" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.6} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-dim)" opacity={0.4} vertical={false} />
            <XAxis dataKey="query" stroke="var(--text-muted)" fontSize={11} fontWeight="bold" tickLine={false} axisLine={false} minTickGap={30} />
            <YAxis stroke="var(--text-muted)" fontSize={11} fontWeight="bold" tickLine={false} axisLine={false} tickFormatter={(val) => `${(val/1000).toFixed(1)}k`} unit=" tks" />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--border-subtle)', strokeWidth: 1.5 }} />
            <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'medium', paddingTop: '10px' }} iconType="circle" />
            <Area type="monotone" dataKey="Standard_RAG" name="Standard" stroke="var(--icon-danger)" strokeWidth={3} fill="url(#gradStdCost)" />
            <Area type="monotone" dataKey="Hybrid_RAG" name="Hybrid" stroke="#3b82f6" strokeWidth={3} fill="url(#gradHybCost)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
})

export default TokenEconomicsFigure
