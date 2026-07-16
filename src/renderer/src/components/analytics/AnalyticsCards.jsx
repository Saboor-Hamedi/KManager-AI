import React, { memo } from 'react'

const MetricCard = memo(({ title, value, trend, trendLabel }) => (
  <div className="bg-[var(--bg-card)]/50 border border-[var(--border-dim)] rounded-xl p-3.5 hover:bg-[var(--bg-card)] transition-colors flex flex-col justify-between">
    <div>
      <div className="flex justify-between items-center">
        <span className="text-[11px] font-medium text-[var(--text-muted)] truncate pr-2">{title}</span>
        {trend && <span className="text-[10px] font-mono text-[var(--text-faint)]">{trend}</span>}
      </div>
      <div className="mt-1">
        <span className="text-lg font-mono font-semibold text-[var(--text-main)] tracking-tight">{value}</span>
      </div>
    </div>
    
    {trendLabel && (
      <div className="mt-2 pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between">
        <span className="text-[10px] text-[var(--text-muted)] truncate">{trendLabel}</span>
      </div>
    )}
  </div>
))

const AnalyticsCards = memo(({ data }) => {
  if (!data) return null

  const latencyDiff = Math.max(0, data.avgStandard - data.avgHybrid)
  const latencyPercent = data.avgStandard > 0 ? ((latencyDiff / data.avgStandard) * 100).toFixed(1) : '0.0'

  return (
    <div className="space-y-6">
      {/* Tier 1: System Latency & Cost Optimization */}
      <div>
        <h2 className="text-xs font-semibold text-[var(--text-main)] mb-2.5">Latency & Economics</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricCard 
            title="Avg Latency (Std)" 
            value={`${data.avgStandard}ms`} 
            trend="Baseline" 
            trendLabel="Standard RAG pipeline" 
          />
          <MetricCard 
            title="Avg Latency (Hybrid)" 
            value={`${data.avgHybrid}ms`} 
            trend={`-${latencyPercent}%`} 
            trendLabel="Intent-aware routing" 
          />
          <MetricCard 
            title="User Evaluations" 
            value={data.dbSearchesAvoided.toLocaleString()} 
            trend="Total Ratings" 
            trendLabel="Relevance evaluations" 
          />
          <MetricCard 
            title="Est. Tokens Saved" 
            value={data.totalTokensSaved.toLocaleString()} 
            trend="Cost Preserved" 
            trendLabel="By avoiding unnecessary lookups" 
          />
        </div>
      </div>

      {/* Tier 2: Output Quality & Defense */}
      <div>
        <h2 className="text-xs font-semibold text-[var(--text-main)] mb-2.5">Output Quality Metrics</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricCard 
            title="Faithfulness" 
            value={`${data.quality.faithfulness}%`} 
            trend="High Adherence" 
            trendLabel="Context adherence rate" 
          />
          <MetricCard 
            title="Relevance" 
            value={`${data.quality.relevance}%`} 
            trend="High Precision" 
            trendLabel="Answer precision score" 
          />
          <MetricCard 
            title="Coherence" 
            value={`${data.quality.coherence}%`} 
            trend="Structured" 
            trendLabel="Logical flow synthesis" 
          />
          <MetricCard 
            title="Accuracy Gain" 
            value={`+${data.quality.hallucinationDrop}%`} 
            trend="vs Base LLM" 
            trendLabel="Ungrounded model baseline" 
          />
        </div>
      </div>

      {/* Tier 3: Retrieval Engine Precision */}
      <div>
        <h2 className="text-xs font-semibold text-[var(--text-main)] mb-2.5">Retrieval & Indexing Precision</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricCard 
            title="Avg Cosine Sim." 
            value={data.retrieval.avgCosine} 
            trend="pgvector" 
            trendLabel="Vector distance match" 
          />
          <MetricCard 
            title="Context Density" 
            value={`${data.retrieval.contextDensity}%`} 
            trend="Efficient" 
            trendLabel="Useful signal/token ratio" 
          />
          <MetricCard 
            title="MRR@3" 
            value={data.retrieval.mrrAt3} 
            trend="Top-K" 
            trendLabel="Mean reciprocal rank" 
          />
          <MetricCard 
            title="Retrieval Speed" 
            value={`${data.retrieval.avgSearchSpeed}ms`} 
            trend="Index Query" 
            trendLabel="Vector lookup latency" 
          />
        </div>
      </div>
    </div>
  )
})

export default AnalyticsCards
