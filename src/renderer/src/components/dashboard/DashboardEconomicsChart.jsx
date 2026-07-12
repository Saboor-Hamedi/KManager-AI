import React, { useRef } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import CopyFigureButton from './CopyFigureButton'

const DashboardEconomicsChart = ({ results }) => {
  const chartRef = useRef(null)

  if (!results || !results.chartData) {
    return null
  }

  // Generate cumulative token data
  let standardTokens = 0
  let hybridTokens = 0
  
  const economicsData = results.chartData.map((q, idx) => {
    // Standard always runs full LLM context (~1200 tokens)
    standardTokens += 1200
    
    // Hybrid skips LLM for conversational
    if (q.isConv) {
      hybridTokens += 50 // Router overhead only
    } else {
      hybridTokens += 1200 // Hits LLM
    }
    
    return {
      query: `Q${idx + 1}`,
      Standard_RAG: standardTokens,
      Hybrid_RAG: hybridTokens
    }
  })

  return (
    <div ref={chartRef} className="bg-[var(--bg-card)] border border-[var(--border-dim)] rounded-xl p-6 hover:border-[var(--border-subtle)] transition-all duration-300 flex-1 w-full flex flex-col relative overflow-hidden">
      <CopyFigureButton targetRef={chartRef} filename="token-economics-chart.png" />
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-sm font-black text-[var(--text-main)] tracking-widest uppercase">Cumulative Token Cost</h2>
          <p className="text-[10px] text-[var(--text-muted)] mt-1 font-medium">Standard RAG vs Hybrid Smart RAG across 50 queries</p>
        </div>
      </div>
      
      <div className="w-full h-[300px] mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={economicsData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-dim)" vertical={false} />
            <XAxis dataKey="query" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `${val/1000}k`} />
            <Tooltip 
              contentStyle={{ backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border-dim)', borderRadius: '8px' }}
              itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
              labelStyle={{ color: 'var(--text-muted)', fontSize: '10px', marginBottom: '4px' }}
            />
            <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '10px' }} iconType="circle" />
            <Line type="monotone" dataKey="Standard_RAG" name="Standard RAG" stroke="var(--icon-danger)" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
            <Line type="monotone" dataKey="Hybrid_RAG" name="Hybrid RAG" stroke="#10b981" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default DashboardEconomicsChart
