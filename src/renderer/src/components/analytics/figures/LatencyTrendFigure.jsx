import React, { memo, useRef } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import CopyFigureButton from '../CopyFigureButton'

const LatencyTrendFigure = memo(({ data }) => {
  const chartRef = useRef(null)
  const chartData = data?.realCharts?.latencyTrend || []

  if (chartData.length === 0) {
    return (
      <div className="bg-white/[0.01] border border-white/[0.04] rounded-[12px] p-4 flex flex-col items-center justify-center flex-1 w-full min-h-[250px] text-[var(--text-muted)] text-sm">
        No latency data available yet.
      </div>
    )
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const point = payload[0].payload
      return (
        <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] p-2.5 rounded-lg shadow-md text-xs z-50 min-w-[180px]">
          <div className="font-semibold text-[var(--text-main)] border-b border-[var(--border-subtle)] pb-1.5 mb-1.5 truncate max-w-[220px]" title={point.queryText}>
            {label}: {point.queryText}
          </div>
          <div className="space-y-1 font-mono">
            <div className="flex justify-between items-center text-[var(--text-main)] font-semibold">
              <span>Latency:</span>
              <span>{point.latency}ms</span>
            </div>
            <div className="flex justify-between items-center text-[var(--text-muted)]">
              <span>Sim. Score:</span>
              <span>{point.similarity.toFixed(3)}</span>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div ref={chartRef} className="bg-white/[0.01] border border-white/[0.04] rounded-[12px] p-4 hover:border-[var(--border-subtle)] transition-all flex-1 w-full min-w-0 relative">
      <CopyFigureButton targetRef={chartRef} filename="latency-trend.png" />
      
      <div className="flex flex-col mb-4 pr-8">
        <h2 className="text-xs font-semibold text-[var(--text-main)]">
          Real-time Latency Trend (ms)
        </h2>
        <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
          End-to-end response time over the last {chartData.length} queries
        </p>
      </div>

      <div className="w-full h-[250px] mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-dim)" vertical={false} opacity={0.4} />
            <XAxis dataKey="label" stroke="var(--text-muted)" fontSize={11} fontWeight="bold" tickLine={false} axisLine={false} />
            <YAxis stroke="var(--text-muted)" fontSize={11} fontWeight="bold" tickLine={false} axisLine={false} unit="ms" />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--border-dim)', strokeWidth: 1 }} />
            <Line 
              type="monotone" 
              dataKey="latency" 
              stroke="var(--icon-danger)" 
              strokeWidth={2}
              dot={{ r: 2, fill: 'var(--bg-app)', strokeWidth: 2 }}
              activeDot={{ r: 4, fill: 'var(--icon-danger)' }} 
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
})

export default LatencyTrendFigure
