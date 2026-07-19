import React, { memo, useRef } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import CopyFigureButton from '../CopyFigureButton'

const COLORS = {
  'Positive': '#10b981', // green
  'Negative': '#ef4444', // red
  'Neutral': '#64748b'   // slate
}

const FeedbackSentimentFigure = memo(({ data }) => {
  const chartRef = useRef(null)
  const chartData = data?.realCharts?.feedbackBuckets || []

  if (chartData.length === 0) {
    return (
      <div className="bg-white/[0.01] border border-white/[0.04] rounded-[12px] p-4 flex flex-col items-center justify-center flex-1 w-full min-h-[250px] text-[var(--text-muted)] text-sm">
        No feedback submitted yet.
      </div>
    )
  }

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] p-2.5 rounded-lg shadow-md text-xs z-50">
          <div className="flex justify-between items-center gap-4 text-[var(--text-main)] font-mono">
            <span className="font-semibold" style={{ color: payload[0].payload.fill }}>
              {payload[0].name}
            </span>
            <span>{payload[0].value} ratings</span>
          </div>
        </div>
      )
    }
    return null
  }

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    if (percent < 0.05) return null
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
    <div ref={chartRef} className="bg-white/[0.01] border border-white/[0.04] rounded-[12px] p-4 hover:border-[var(--border-subtle)] transition-all flex-1 w-full min-w-0 relative">
      <CopyFigureButton targetRef={chartRef} filename="feedback-sentiment.png" />
      
      <div className="flex flex-col mb-2 pr-8">
        <h2 className="text-xs font-semibold text-[var(--text-main)]">
          Feedback Sentiment
        </h2>
        <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
          Distribution of positive vs negative user ratings
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
              dataKey="count"
              nameKey="category"
              stroke="none"
              labelLine={false}
              label={renderCustomizedLabel}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[entry.category] || '#64748b'} />
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

export default FeedbackSentimentFigure
