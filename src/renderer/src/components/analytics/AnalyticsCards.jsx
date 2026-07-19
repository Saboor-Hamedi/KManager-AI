import React, { memo } from 'react'

const MetricCard = memo(({ title, value, trend, trendLabel }) => (
  <div className="bg-white/[0.01] border border-white/[0.04] rounded-[12px] p-3.5 hover:bg-white/[0.02] transition-colors flex flex-col justify-between shadow-none">
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
      <div className="mt-2 pt-2 border-t border-white/[0.03] flex items-center justify-between">
        <span className="text-[10px] text-[var(--text-muted)] truncate">{trendLabel}</span>
      </div>
    )}
  </div>
))

const AnalyticsCards = memo(({ data }) => {
  if (!data) return null

  return (
    <div className="space-y-6">
      {/* Tier 1: Real System Telemetry */}
      <div>
        <h2 className="text-xs font-semibold text-[var(--text-main)] mb-2.5">System Usage & Feedback</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricCard 
            title="Total Queries" 
            value={data.totalQueries.toLocaleString()} 
            trend="Lifetime" 
            trendLabel="All semantic searches" 
          />
          <MetricCard 
            title="Avg Latency" 
            value={`${data.avgStandard}ms`} 
            trend="Real-time" 
            trendLabel="End-to-end response" 
          />
          <MetricCard 
            title="User Feedback" 
            value={data.dbSearchesAvoided.toLocaleString()} 
            trend="Ratings" 
            trendLabel="Total ratings collected" 
          />
          <MetricCard 
            title="Tokens Ingested" 
            value={data.tokensIngested.toLocaleString()} 
            trend="Vault Size" 
            trendLabel="Estimated token count" 
          />
        </div>
      </div>

      {/* Tier 2: Real Retrieval Stats */}
      <div>
        <h2 className="text-xs font-semibold text-[var(--text-main)] mb-2.5">Retrieval Engine Precision</h2>
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
            trend="Signal" 
            trendLabel="Approx. signal/noise" 
          />
          <MetricCard 
            title="Mean Reciprocal" 
            value={data.retrieval.mrrAt3} 
            trend="Top-K" 
            trendLabel="Rank accuracy estimate" 
          />
          <MetricCard 
            title="Index Speed" 
            value={`${data.retrieval.avgSearchSpeed}ms`} 
            trend="Lookup" 
            trendLabel="Approx. vector scan" 
          />
        </div>
      </div>

      {/* Tier 3: Real Pipeline & Economics */}
      <div>
        <h2 className="text-xs font-semibold text-[var(--text-main)] mb-2.5">Pipeline Analytics & Economics</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricCard 
            title="Hybrid Routing Rate" 
            value={`${data.hybridRate}%`} 
            trend="Smart RAG" 
            trendLabel="Queries sent to LLM" 
          />
          <MetricCard 
            title="Avg Query Length" 
            value={`${data.avgTokens}`} 
            trend="Tokens" 
            trendLabel="Est. tokens per prompt" 
          />
          <MetricCard 
            title="Positive Feedback" 
            value={`${data.helpfulRate}%`} 
            trend="Satisfaction" 
            trendLabel="Helpful response rate" 
          />
          <MetricCard 
            title="Avg Latency (Base)" 
            value={`${data.avgDbTime}ms`} 
            trend="pgvector" 
            trendLabel="Raw index traversal" 
          />
        </div>
      </div>
    </div>
  )
})

export default AnalyticsCards
