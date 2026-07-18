import React, { memo, useRef } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import CopyFigureButton from '../CopyFigureButton'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b']

const DocumentTypesFigure = memo(({ data }) => {
  const chartRef = useRef(null)
  const chartData = data?.realCharts?.docTypes || []

  if (chartData.length === 0) {
    return (
      <div className="bg-[var(--bg-card)]/50 border border-[var(--border-dim)] rounded-xl p-4 flex flex-col items-center justify-center flex-1 w-full min-h-[250px] text-[var(--text-muted)] text-sm">
        No documents ingested yet.
      </div>
    )
  }

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] p-2.5 rounded-lg shadow-md text-xs z-50">
          <div className="flex justify-between items-center gap-4 text-[var(--text-main)] font-mono">
            <span className="font-semibold" style={{ color: payload[0].payload.fill }}>
              {payload[0].name.toUpperCase()}
            </span>
            <span>{payload[0].value} files</span>
          </div>
        </div>
      )
    }
    return null
  }

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    if (percent < 0.05) return null // Hide tiny labels
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * Math.PI / 180)
    const y = cy + radius * Math.sin(-midAngle * Math.PI / 180)

    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight="bold" className="pointer-events-none drop-shadow-md">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    )
  }

  return (
    <div ref={chartRef} className="bg-[var(--bg-card)]/50 border border-[var(--border-dim)] rounded-xl p-4 hover:border-[var(--border-subtle)] transition-all flex-1 w-full min-w-0 relative">
      <CopyFigureButton targetRef={chartRef} filename="document-types.png" />
      
      <div className="flex flex-col mb-2 pr-8">
        <h2 className="text-xs font-semibold text-[var(--text-main)]">
          Vault Composition
        </h2>
        <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
          Distribution of ingested file formats
        </p>
      </div>

      <div className="w-full h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
              stroke="none"
              labelLine={false}
              label={renderCustomizedLabel}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              verticalAlign="bottom" 
              height={36} 
              iconType="circle"
              wrapperStyle={{ fontSize: '11px', color: 'var(--text-muted)' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
})

export default DocumentTypesFigure
