import React, { memo, useRef, useState, useMemo } from 'react'
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import CopyFigureButton from '../CopyFigureButton'

const TradeoffScatterFigure = memo(({ data }) => {
  const chartRef = useRef(null)
  const [timeWindow, setTimeWindow] = useState('25')

  const rawQueries = useMemo(() => {
    const all = data?.chartData || []
    if (timeWindow === 'all') return all
    const n = Number(timeWindow) || 25
    return all.slice(-n)
  }, [data?.chartData, timeWindow])

  const standardRagData = []
  const hybridRagData = []

  rawQueries.forEach((q) => {
    const lat = q.latency || 0
    const qual = (q.similarity || 0) * 100
    
    if (q.isFallback) {
      standardRagData.push({
        latency: lat,
        quality: qual,
        name: q.queryText || q.label
      })
    } else {
      hybridRagData.push({
        latency: lat,
        quality: qual,
        name: q.queryText || q.label
      })
    }
  })

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const point = payload[0].payload
      return (
        <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] p-2.5 rounded-lg shadow-md text-xs z-50 max-w-[200px]">
          <p className="font-semibold text-[var(--text-main)] border-b border-[var(--border-subtle)] pb-1 mb-1.5 truncate" title={point.name}>{point.name}</p>
          <div className="space-y-1 font-mono">
            <p className="flex justify-between gap-4">
              <span className="text-[var(--text-muted)]">Latency:</span>
              <span className="text-[var(--text-main)] font-semibold">{point.latency}ms</span>
            </p>
            <p className="flex justify-between gap-4">
              <span className="text-[var(--text-muted)]">Similarity:</span>
              <span className="text-[var(--text-main)] font-semibold">{point.quality?.toFixed(1) || 0}%</span>
            </p>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div ref={chartRef} className="bg-[var(--bg-card)]/50 border border-[var(--border-dim)] rounded-xl p-4 hover:border-[var(--border-subtle)] transition-all flex-1 w-full min-w-0 relative">
      <CopyFigureButton targetRef={chartRef} filename="accuracy-latency-tradeoff.png" />
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3 pr-8">
        <div>
          <h2 className="text-xs font-semibold text-[var(--text-main)]">
            Accuracy vs. Latency Trade-Off ({rawQueries.length} records)
          </h2>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
            Pareto frontier of execution speed against answer factuality
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
          <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-dim)" opacity={0.4} />
            <XAxis 
              type="number" 
              dataKey="latency" 
              name="Latency" 
              unit="ms" 
              stroke="var(--text-muted)" 
              fontSize={11} 
              fontWeight="bold"
              tickLine={false} 
              axisLine={false}
            />
            <YAxis 
              type="number" 
              dataKey="quality" 
              name="Quality" 
              unit="%" 
              stroke="var(--text-muted)" 
              fontSize={11} 
              fontWeight="bold"
              tickLine={false} 
              axisLine={false} 
              domain={[20, 105]}
            />
            <ZAxis type="number" range={[50, 50]} />
            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3', stroke: 'var(--border-subtle)', strokeWidth: 1 }} />
            <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'medium', paddingTop: '10px' }} iconType="circle" />
            
            <Scatter name="Standard (DB Only)" data={standardRagData} fill="#ef4444" fillOpacity={0.7} />
            <Scatter name="Hybrid (LLM + DB)" data={hybridRagData} fill="#10b981" fillOpacity={0.85} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
})

export default TradeoffScatterFigure
