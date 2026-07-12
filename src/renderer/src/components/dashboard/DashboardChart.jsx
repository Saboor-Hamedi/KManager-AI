import React, { memo, useRef } from 'react'
import CopyFigureButton from './CopyFigureButton'

const DashboardChart = memo(({ results }) => {
  const chartRef = useRef(null)
  const chartData = results?.chartData || []
  
  // Calculate max latency for dynamic scaling
  const maxLatency = chartData.length > 0 
    ? Math.max(...chartData.map(d => Math.max(d.standard, d.hybrid))) 
    : 2000

  return (
    <div ref={chartRef} className="bg-[var(--bg-card)] border border-[var(--border-dim)] rounded-xl p-6 hover:border-[var(--border-subtle)] transition-all duration-300 flex-1 w-full min-w-0 relative">
      <CopyFigureButton targetRef={chartRef} filename="latency-comparison-chart.png" />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-sm font-black text-[var(--text-main)] tracking-widest uppercase">Latency Comparison (ms)</h2>
          <p className="text-[10px] text-[var(--text-muted)] mt-1 font-medium">Standard RAG vs Hybrid Smart RAG across 50 queries</p>
        </div>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-[var(--icon-danger)]/60 border border-[var(--icon-danger)]"></span>
            <span className="text-[10px] text-[var(--text-faint)] font-bold">Standard RAG</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-[var(--icon-secondary)]/80 border border-[var(--icon-secondary)]"></span>
            <span className="text-[10px] text-[var(--text-faint)] font-bold">Hybrid RAG</span>
          </div>
        </div>
      </div>
      
      {/* CSS Bar Chart with Horizontal Scroll for large datasets */}
      <div className="w-full overflow-x-auto custom-scrollbar pb-4 mt-8 relative">
        <div className="h-64 flex items-end justify-between gap-1 sm:gap-2 min-w-[1200px] relative px-2">
          {/* Y-axis grid lines (simulated) */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-[0.03] z-0">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="w-full border-b border-[var(--text-main)]"></div>
            ))}
          </div>

          {chartData.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center text-[var(--text-muted)] text-sm font-medium">
              Run the benchmark to generate performance data.
            </div>
          ) : (
            chartData.map((data, idx) => (
              <div key={idx} className="flex flex-col items-center gap-3 flex-1 group z-10 h-full justify-end">
              <div className="w-full relative flex justify-center h-full items-end gap-1 sm:gap-2">
                
                {/* Standard Bar */}
                <div 
                  className="w-full max-w-[2rem] rounded-t-md shadow-sm transition-all duration-300 relative flex justify-center"
                  style={{ height: `${Math.max((data.standard / maxLatency) * 100, 5)}%`, backgroundColor: 'var(--icon-danger)' }}
                >
                  <span className="absolute -top-5 text-[8px] sm:text-[9px] font-bold text-[var(--icon-danger)]">
                    {data.standard.toFixed(0)}
                  </span>
                </div>

                {/* Hybrid Bar */}
                <div 
                  className="w-full max-w-[2rem] rounded-t-md shadow-sm transition-all duration-300 relative flex justify-center"
                  style={{ height: `${Math.max((data.hybrid / maxLatency) * 100, 5)}%`, backgroundColor: 'var(--icon-secondary)' }}
                >
                  <span className="absolute -top-5 text-[8px] sm:text-[9px] font-bold text-[var(--icon-secondary)]">
                    {data.hybrid.toFixed(0)}
                  </span>
                </div>

              </div>
              <span className="text-[10px] sm:text-xs font-bold text-[var(--text-muted)] group-hover:text-[var(--text-main)] transition-colors whitespace-nowrap">
                {data.label}
              </span>
            </div>
          ))
        )}
        </div>
      </div>
    </div>
  )
})

export default DashboardChart
