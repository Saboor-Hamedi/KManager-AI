import React, { memo, useRef } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import CopyFigureButton from '../CopyFigureButton'

const SearchesOverTimeFigure = memo(({ data }) => {
  const chartRef = useRef(null)
  const chartData = data?.realCharts?.searchesOverTime || []

  if (chartData.length === 0) {
    return (
      <div className="bg-white/[0.01] border border-white/[0.04] rounded-[12px] p-4 flex flex-col items-center justify-center flex-1 w-full min-h-[250px] text-[var(--text-muted)] text-sm">
        No search volume data available yet.
      </div>
    )
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] p-2.5 rounded-lg shadow-md text-xs z-50">
          <div className="font-semibold text-[var(--text-main)] border-b border-[var(--border-subtle)] pb-1.5 mb-1.5">
            {label}
          </div>
          <div className="flex justify-between items-center text-[var(--text-main)] font-mono">
            <span>Searches:</span>
            <span className="font-semibold ml-4">{payload[0].value}</span>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div ref={chartRef} className="bg-white/[0.01] border border-white/[0.04] rounded-[12px] p-4 hover:border-[var(--border-subtle)] transition-all flex-1 w-full min-w-0 relative">
      <CopyFigureButton targetRef={chartRef} filename="searches-over-time.png" />
      
      <div className="flex flex-col mb-4 pr-8">
        <h2 className="text-xs font-semibold text-[var(--text-main)]">
          Search Volume (Last 7 Days)
        </h2>
        <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
          Daily count of queries processed by the semantic engine
        </p>
      </div>

      <div className="w-full h-[250px] mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="gradSearch" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--text-accent)" stopOpacity={1} />
                <stop offset="100%" stopColor="var(--text-accent)" stopOpacity={0.4} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-dim)" vertical={false} opacity={0.4} />
            <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={11} fontWeight="bold" tickLine={false} axisLine={false} />
            <YAxis stroke="var(--text-muted)" fontSize={11} fontWeight="bold" tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--bg-panel)', opacity: 0.5 }} />
            <Bar dataKey="count" fill="url(#gradSearch)" radius={[4, 4, 0, 0]} maxBarSize={40}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
})

export default SearchesOverTimeFigure
