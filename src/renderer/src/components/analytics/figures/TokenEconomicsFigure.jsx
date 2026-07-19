import React, { memo, useRef } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import CopyFigureButton from '../CopyFigureButton'

const TokenEconomicsFigure = memo(({ data }) => {
  const chartRef = useRef(null)
  const chartData = data?.realCharts?.tokenEconomics || []

  if (chartData.length === 0) {
    return (
      <div className="bg-white/[0.01] border border-white/[0.04] rounded-[12px] p-4 flex flex-col items-center justify-center flex-1 w-full min-h-[250px] text-[var(--text-muted)] text-sm">
        No token data available yet.
      </div>
    )
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] p-2.5 rounded-lg shadow-md text-xs z-50 min-w-[150px]">
          <div className="font-semibold text-[var(--text-main)] border-b border-[var(--border-subtle)] pb-1.5 mb-1.5">
            {label}
          </div>
          <div className="space-y-1 font-mono">
            {payload.map((entry, index) => (
              <div key={index} className="flex justify-between items-center text-[var(--text-main)]">
                <span style={{ color: entry.fill }}>{entry.name}:</span>
                <span className="font-semibold">{entry.value}</span>
              </div>
            ))}
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div ref={chartRef} className="bg-white/[0.01] border border-white/[0.04] rounded-[12px] p-4 hover:border-[var(--border-subtle)] transition-all flex-1 w-full min-w-0 relative">
      <CopyFigureButton targetRef={chartRef} filename="token-economics.png" />
      
      <div className="flex flex-col mb-4 pr-8">
        <h2 className="text-xs font-semibold text-[var(--text-main)]">
          Token Economics
        </h2>
        <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
          Estimated tokens sent to LLM vs avoided via Standard local routing
        </p>
      </div>

      <div className="w-full h-[250px] mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }} barSize={30}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-dim)" vertical={false} opacity={0.4} />
            <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--bg-panel)', opacity: 0.5 }} />
            <Legend 
              verticalAlign="bottom" 
              height={36} 
              iconType="circle"
              wrapperStyle={{ fontSize: '11px', color: 'var(--text-muted)' }}
            />
            <Bar dataKey="used" name="Tokens Sent (LLM)" fill="#8b5cf6" radius={[2, 2, 0, 0]} />
            <Bar dataKey="saved" name="Tokens Saved (Local)" fill="#10b981" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
})

export default TokenEconomicsFigure
