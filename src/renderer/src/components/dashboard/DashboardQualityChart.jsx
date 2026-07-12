import React, { memo, useRef } from 'react'
import CopyFigureButton from './CopyFigureButton'

const DashboardQualityChart = memo(({ results }) => {
  const chartRef = useRef(null)

  if (!results || !results.chartData || results.chartData.length === 0) {
    return null
  }

  // Aggregate averages across all complex queries (where hallucination matters)
  const complexQueries = results.chartData.filter(d => !d.isConv)
  
  const avgBaseFaithfulness = complexQueries.reduce((a, b) => a + b.metrics.baseFaithfulness, 0) / complexQueries.length
  const avgHybridFaithfulness = complexQueries.reduce((a, b) => a + b.metrics.hybridFaithfulness, 0) / complexQueries.length
  
  const avgBaseRelevance = complexQueries.reduce((a, b) => a + b.metrics.baseRelevance, 0) / complexQueries.length
  const avgHybridRelevance = complexQueries.reduce((a, b) => a + b.metrics.hybridRelevance, 0) / complexQueries.length
  
  const avgBaseCoherence = complexQueries.reduce((a, b) => a + b.metrics.baseCoherence, 0) / complexQueries.length
  const avgHybridCoherence = complexQueries.reduce((a, b) => a + b.metrics.hybridCoherence, 0) / complexQueries.length

  const metrics = [
    { label: 'Faithfulness (Factuality)', base: avgBaseFaithfulness, hybrid: avgHybridFaithfulness },
    { label: 'Answer Relevance', base: avgBaseRelevance, hybrid: avgHybridRelevance },
    { label: 'Response Coherence', base: avgBaseCoherence, hybrid: avgHybridCoherence }
  ]

  return (
    <div ref={chartRef} className="bg-[var(--bg-card)] border border-[var(--border-dim)] rounded-xl p-6 hover:border-[var(--border-subtle)] transition-all duration-300 flex-1 w-full xl:max-w-md flex flex-col relative">
      <CopyFigureButton targetRef={chartRef} filename="quality-comparison-chart.png" />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="text-sm font-black text-[var(--text-main)] tracking-widest uppercase">Response Quality (%)</h2>
          <p className="text-[10px] text-[var(--text-muted)] mt-1 font-medium">Base LLM vs Hybrid RAG (Complex Queries)</p>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm bg-[var(--icon-danger)]"></span>
            <span className="text-[9px] text-[var(--text-faint)] font-bold">Base LLM</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#10b981]"></span>
            <span className="text-[9px] text-[var(--text-faint)] font-bold">Hybrid RAG</span>
          </div>
        </div>
      </div>
      
      <div className="flex-1 flex flex-col justify-around gap-4 relative">
        {metrics.map((m, idx) => (
          <div key={idx} className="flex flex-col gap-2 relative z-10">
            <div className="flex justify-between items-end">
              <span className="text-[11px] font-bold text-[var(--text-muted)]">{m.label}</span>
            </div>
            
            <div className="flex flex-col gap-1.5 relative">
              {/* Base LLM Bar */}
              <div className="w-full bg-[var(--bg-panel)] rounded h-5 relative overflow-hidden group">
                <div 
                  className="h-full transition-all duration-500 rounded flex items-center px-2"
                  style={{ width: `${m.base}%`, backgroundColor: 'var(--icon-danger)' }}
                >
                  <span className="text-[9px] font-bold text-white shadow-sm drop-shadow-md">
                    {m.base.toFixed(0)}%
                  </span>
                </div>
              </div>
              
              {/* Hybrid RAG Bar */}
              <div className="w-full bg-[var(--bg-panel)] rounded h-5 relative overflow-hidden group">
                <div 
                  className="h-full transition-all duration-500 rounded flex items-center px-2"
                  style={{ width: `${m.hybrid}%`, backgroundColor: '#10b981' }}
                >
                  <span className="text-[9px] font-bold text-white shadow-sm drop-shadow-md">
                    {m.hybrid.toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
})

export default DashboardQualityChart
