import React, { memo, useRef, useState, useMemo } from 'react'
import CopyFigureButton from './CopyFigureButton'

const DashboardQualityChart = memo(({ results }) => {
  const chartRef = useRef(null)
  const [viewMode, setViewMode] = useState('trend') // 'trend' or 'summary'
  const [timeWindow, setTimeWindow] = useState('50')
  const [hoveredIdx, setHoveredIdx] = useState(null)

  const rawData = results?.chartData || []

  const visibleData = useMemo(() => {
    if (timeWindow === 'all') return rawData
    const n = Number(timeWindow) || 50
    return rawData.slice(-n)
  }, [rawData, timeWindow])

  // Adaptive downsampling for hundreds of queries
  const displayData = useMemo(() => {
    if (visibleData.length <= 50) return visibleData
    const targetBins = 40
    const binSize = Math.ceil(visibleData.length / targetBins)
    const binned = []
    for (let i = 0; i < visibleData.length; i += binSize) {
      const slice = visibleData.slice(i, i + binSize)
      const avgFaith = slice.reduce((acc, d) => acc + (d.metrics?.hybridFaithfulness || 0), 0) / slice.length
      const avgRel = slice.reduce((acc, d) => acc + (d.metrics?.hybridRelevance || 0), 0) / slice.length
      const avgCoh = slice.reduce((acc, d) => acc + (d.metrics?.hybridCoherence || 0), 0) / slice.length
      binned.push({
        label: `${slice[0].label}-${slice[slice.length - 1].label}`,
        queryText: `Avg of ${slice.length} queries`,
        metrics: {
          hybridFaithfulness: avgFaith,
          hybridRelevance: avgRel,
          hybridCoherence: avgCoh
        }
      })
    }
    return binned
  }, [visibleData])

  if (!rawData || rawData.length === 0) {
    return (
      <div className="bg-[var(--bg-card)] border border-[var(--border-dim)] rounded-xl p-6 flex-1 w-full xl:max-w-xl flex items-center justify-center text-[var(--text-muted)] text-sm">
        Run real database queries to populate Coherence and Quality history.
      </div>
    )
  }

  const avgBaseFaithfulness = rawData.reduce((a, b) => a + (b.metrics?.baseFaithfulness || 0), 0) / rawData.length
  const avgHybridFaithfulness = rawData.reduce((a, b) => a + (b.metrics?.hybridFaithfulness || 0), 0) / rawData.length
  const avgBaseRelevance = rawData.reduce((a, b) => a + (b.metrics?.baseRelevance || 0), 0) / rawData.length
  const avgHybridRelevance = rawData.reduce((a, b) => a + (b.metrics?.hybridRelevance || 0), 0) / rawData.length
  const avgBaseCoherence = rawData.reduce((a, b) => a + (b.metrics?.baseCoherence || 0), 0) / rawData.length
  const avgHybridCoherence = rawData.reduce((a, b) => a + (b.metrics?.hybridCoherence || 0), 0) / rawData.length

  const summaryMetrics = [
    { label: 'Response Coherence', base: avgBaseCoherence, hybrid: avgHybridCoherence, color: '#3b82f6' },
    { label: 'Answer Relevance', base: avgBaseRelevance, hybrid: avgHybridRelevance, color: '#10b981' },
    { label: 'Faithfulness (Factuality)', base: avgBaseFaithfulness, hybrid: avgHybridFaithfulness, color: '#a855f7' }
  ]

  return (
    <div ref={chartRef} className="bg-[var(--bg-card)] border border-[var(--border-dim)] rounded-xl p-6 hover:border-[var(--border-subtle)] transition-all duration-300 flex-1 w-full xl:max-w-xl flex flex-col relative min-w-0">
      <CopyFigureButton targetRef={chartRef} filename="quality-coherence-chart.png" />
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
        <div>
          <h2 className="text-sm font-black text-[var(--text-main)] tracking-widest uppercase">
            {viewMode === 'trend' ? 'Coherence & Quality Trend (%)' : 'Overall Quality Benchmark (%)'}
          </h2>
          <p className="text-[10px] text-[var(--text-muted)] mt-1 font-medium">
            {viewMode === 'trend' ? `Time-series progression over ${displayData.length} data points` : `Average of ${rawData.length} real historical queries`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Mode Toggle */}
          <div className="flex bg-[var(--bg-app)] border border-[var(--border-dim)] rounded-lg p-0.5 text-[11px]">
            <button
              onClick={() => setViewMode('trend')}
              className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                viewMode === 'trend' ? 'bg-[var(--bg-card)] text-[var(--text-accent)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              Trend Graph
            </button>
            <button
              onClick={() => setViewMode('summary')}
              className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                viewMode === 'summary' ? 'bg-[var(--bg-card)] text-[var(--text-accent)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              Summary Bars
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'trend' && (
        <div className="flex items-center justify-between gap-4 mb-4 pb-2 border-b border-[var(--border-dim)] text-[10px]">
          <div className="flex flex-wrap gap-3">
            <span className="flex items-center gap-1 font-bold text-[#3b82f6]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#3b82f6]"></span> Coherence
            </span>
            <span className="flex items-center gap-1 font-bold text-[#10b981]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]"></span> Relevance
            </span>
            <span className="flex items-center gap-1 font-bold text-[#a855f7]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#a855f7]"></span> Faithfulness
            </span>
          </div>
          <div className="flex gap-1 text-[10px]">
            {['25', '50', 'all'].map(win => (
              <button
                key={win}
                onClick={() => setTimeWindow(win)}
                className={`px-1.5 py-0.5 rounded font-bold ${timeWindow === win ? 'bg-[var(--bg-active)] text-[var(--text-accent)]' : 'text-[var(--text-muted)]'}`}
              >
                {win === 'all' ? 'All' : win}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* View Content */}
      <div className="flex-1 flex flex-col justify-around gap-4 relative min-h-[220px]">
        {viewMode === 'summary' ? (
          <div className="flex flex-col gap-4">
            {summaryMetrics.map((m, idx) => (
              <div key={idx} className="flex flex-col gap-1.5">
                <div className="flex justify-between items-end text-[11px] font-bold text-[var(--text-muted)]">
                  <span>{m.label}</span>
                  <span className="text-[var(--text-main)] font-mono">{m.hybrid.toFixed(1)}% (vs Base {m.base.toFixed(1)}%)</span>
                </div>
                <div className="w-full bg-[var(--bg-panel)] rounded-md h-5 relative overflow-hidden flex">
                  <div 
                    className="h-full transition-all duration-500 rounded-l flex items-center px-2 shadow-sm"
                    style={{ width: `${m.hybrid}%`, backgroundColor: m.color }}
                  >
                    <span className="text-[9px] font-bold text-white shadow-sm">{m.hybrid.toFixed(0)}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Time Series Progression Graph (Adaptive CSS Line/Bar hybrid) */
          <div className="w-full overflow-x-auto custom-scrollbar pb-2 relative flex-1 flex flex-col justify-end">
            <div className={`h-48 flex items-end justify-between gap-1 relative px-1 ${displayData.length > 35 ? 'min-w-[600px]' : 'w-full'}`}>
              {/* Y Grid lines */}
              {[100, 80, 60, 40].map((val, i) => (
                <div key={i} className="absolute inset-x-0 border-b border-[var(--text-main)]/5 flex justify-end pr-1 pointer-events-none" style={{ bottom: `${val}%` }}>
                  <span className="text-[8px] text-[var(--text-muted)] -mt-3">{val}%</span>
                </div>
              ))}

              {displayData.map((d, idx) => {
                const coh = d.metrics?.hybridCoherence || 0
                const rel = d.metrics?.hybridRelevance || 0
                const faith = d.metrics?.hybridFaithfulness || 0

                return (
                  <div 
                    key={idx} 
                    className="flex flex-col items-center flex-1 group z-10 h-full justify-end relative"
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                  >
                    {hoveredIdx === idx && (
                      <div className="absolute bottom-full mb-2 bg-[var(--bg-app)] border border-[var(--border-subtle)] rounded-lg p-2 shadow-xl text-[11px] z-50 pointer-events-none whitespace-nowrap">
                        <div className="font-bold text-[var(--text-main)] border-b border-[var(--border-dim)] pb-1 mb-1">{d.label}: {d.queryText}</div>
                        <div className="text-[#3b82f6]">Coherence: {coh.toFixed(1)}%</div>
                        <div className="text-[#10b981]">Relevance: {rel.toFixed(1)}%</div>
                        <div className="text-[#a855f7]">Faithfulness: {faith.toFixed(1)}%</div>
                      </div>
                    )}

                    <div className="w-full flex justify-center items-end gap-0.5 h-full relative">
                      <div className="w-1.5 sm:w-2 rounded-t transition-all bg-[#3b82f6]" style={{ height: `${Math.max(4, coh)}%` }} title="Coherence" />
                      <div className="w-1.5 sm:w-2 rounded-t transition-all bg-[#10b981]" style={{ height: `${Math.max(4, rel)}%` }} title="Relevance" />
                      <div className="w-1.5 sm:w-2 rounded-t transition-all bg-[#a855f7]" style={{ height: `${Math.max(4, faith)}%` }} title="Faithfulness" />
                    </div>
                    <span className="text-[8px] font-bold text-[var(--text-muted)] group-hover:text-[var(--text-main)] mt-1 truncate max-w-[32px]">
                      {d.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
})

export default DashboardQualityChart
