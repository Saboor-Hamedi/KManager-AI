import React, { memo, useRef, useState, useMemo } from 'react'
import CopyFigureButton from './CopyFigureButton'

const DashboardChart = memo(({ results }) => {
  const chartRef = useRef(null)
  const [timeWindow, setTimeWindow] = useState('50')
  const [hoveredIdx, setHoveredIdx] = useState(null)
  
  const rawData = results?.chartData || []
  
  // Filter/Window selection
  const visibleData = useMemo(() => {
    if (timeWindow === 'all') return rawData
    const n = Number(timeWindow) || 50
    return rawData.slice(-n)
  }, [rawData, timeWindow])

  // If there are hundreds of queries in "All" or large window, bin consecutive queries to maintain clean visual density
  const displayData = useMemo(() => {
    if (visibleData.length <= 60) return visibleData
    const targetBins = 50
    const binSize = Math.ceil(visibleData.length / targetBins)
    const binned = []
    for (let i = 0; i < visibleData.length; i += binSize) {
      const slice = visibleData.slice(i, i + binSize)
      const avgStd = slice.reduce((acc, d) => acc + d.standard, 0) / slice.length
      const avgHyb = slice.reduce((acc, d) => acc + d.hybrid, 0) / slice.length
      binned.push({
        label: `${slice[0].label}-${slice[slice.length - 1].label}`,
        standard: avgStd,
        hybrid: avgHyb,
        queryText: `Avg of ${slice.length} queries (${slice[0].label} to ${slice[slice.length - 1].label})`
      })
    }
    return binned
  }, [visibleData])

  const maxLatency = displayData.length > 0 
    ? Math.max(...displayData.map(d => Math.max(d.standard, d.hybrid))) 
    : 1000

  const isDense = displayData.length > 35

  return (
    <div ref={chartRef} className="bg-[var(--bg-card)] border border-[var(--border-dim)] rounded-xl p-6 hover:border-[var(--border-subtle)] transition-all duration-300 flex-1 w-full min-w-0 relative">
      <CopyFigureButton targetRef={chartRef} filename="latency-comparison-chart.png" />
      
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="text-sm font-black text-[var(--text-main)] tracking-widest uppercase">Latency Comparison (ms)</h2>
          <p className="text-[10px] text-[var(--text-muted)] mt-1 font-medium">
            Showing {displayData.length} data points across {rawData.length} total historical queries
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          {/* Time Window Selector */}
          <div className="flex bg-[var(--bg-app)] border border-[var(--border-dim)] rounded-lg p-0.5 text-[11px]">
            {['25', '50', '100', 'all'].map(win => (
              <button
                key={win}
                onClick={() => setTimeWindow(win)}
                className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                  timeWindow === win
                    ? 'bg-[var(--bg-card)] text-[var(--text-accent)] shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                {win === 'all' ? 'All History' : `Last ${win}`}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-[var(--icon-danger)]/80"></span>
              <span className="text-[10px] text-[var(--text-faint)] font-bold">Standard</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-[var(--icon-secondary)]/80"></span>
              <span className="text-[10px] text-[var(--text-faint)] font-bold">Hybrid</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Adaptive Chart Rendering */}
      <div className="w-full overflow-x-auto custom-scrollbar pb-4 mt-6 relative">
        <div className={`h-64 flex items-end justify-between gap-1 relative px-2 ${displayData.length > 40 ? 'min-w-[900px]' : 'w-full'}`}>
          {/* Y-axis grid lines */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-[0.05] z-0">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="w-full border-b border-[var(--text-main)] flex justify-end pr-1">
                <span className="text-[9px] text-[var(--text-muted)] -mt-4">
                  {Math.round(maxLatency * (1 - i * 0.25))}ms
                </span>
              </div>
            ))}
          </div>

          {displayData.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center text-[var(--text-muted)] text-sm font-medium">
              Run database queries in the Assistant or Search to populate live metrics.
            </div>
          ) : (
            displayData.map((data, idx) => (
              <div 
                key={idx} 
                className="flex flex-col items-center gap-2 flex-1 group z-10 h-full justify-end relative"
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                {/* Interactive Tooltip on Hover */}
                {hoveredIdx === idx && (
                  <div className="absolute bottom-full mb-2 bg-[var(--bg-app)] border border-[var(--border-subtle)] rounded-lg p-2.5 shadow-xl text-xs z-50 pointer-events-none whitespace-nowrap min-w-[150px]">
                    <div className="font-bold text-[var(--text-main)] border-b border-[var(--border-dim)] pb-1 mb-1 truncate max-w-[200px]">
                      {data.label}: {data.queryText || 'Query'}
                    </div>
                    <div className="text-[var(--icon-danger)] font-medium">Standard: {Math.round(data.standard)}ms</div>
                    <div className="text-[var(--icon-secondary)] font-medium">Hybrid: {Math.round(data.hybrid)}ms</div>
                  </div>
                )}

                <div className="w-full relative flex justify-center h-full items-end gap-1">
                  {/* Standard Bar */}
                  <div 
                    className="w-full max-w-[1.75rem] rounded-t-md transition-all duration-300 relative flex justify-center"
                    style={{ height: `${Math.max((data.standard / maxLatency) * 100, 4)}%`, backgroundColor: 'var(--icon-danger)' }}
                  >
                    {!isDense && (
                      <span className="absolute -top-4 text-[8px] font-bold text-[var(--icon-danger)]">
                        {Math.round(data.standard)}
                      </span>
                    )}
                  </div>

                  {/* Hybrid Bar */}
                  <div 
                    className="w-full max-w-[1.75rem] rounded-t-md transition-all duration-300 relative flex justify-center"
                    style={{ height: `${Math.max((data.hybrid / maxLatency) * 100, 4)}%`, backgroundColor: 'var(--icon-secondary)' }}
                  >
                    {!isDense && (
                      <span className="absolute -top-4 text-[8px] font-bold text-[var(--icon-secondary)]">
                        {Math.round(data.hybrid)}
                      </span>
                    )}
                  </div>
                </div>

                <span className="text-[9px] sm:text-[10px] font-bold text-[var(--text-muted)] group-hover:text-[var(--text-main)] transition-colors truncate max-w-[40px]">
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
