import React, { memo } from 'react'

const MetricCard = memo(({ title, value, trend, trendLabel }) => (
  <div className="bg-white/[0.01] border border-white/[0.04] rounded-[12px] p-3.5 hover:bg-white/[0.02] transition-colors flex flex-col justify-between shadow-none">
    <div>
      <div className="flex justify-between items-center">
        <span className="text-[12px] font-medium text-[var(--text-muted)] truncate pr-2">{title}</span>
        {trend && <span className="text-[12px] font-mono text-[var(--text-faint)]">{trend}</span>}
      </div>
      <div className="mt-1">
        <span className="text-lg font-mono font-semibold text-[var(--text-main)] tracking-tight">{value}</span>
      </div>
    </div>
    
    {trendLabel && (
      <div className="mt-2 pt-2 border-t border-white/[0.03] flex items-center justify-between">
        <span className="text-[12px] text-[var(--text-muted)] truncate">{trendLabel}</span>
      </div>
    )}
  </div>
))

const AnalyticsCards = memo(({ data }) => {
  if (!data) return null

  const rawLocalRate = 100 - (data.hybridRate || 0)
  const localRate = Number.isInteger(rawLocalRate) ? rawLocalRate : parseFloat(rawLocalRate.toFixed(1))
  const localQueries = Math.round((data.totalQueries || 0) * (rawLocalRate / 100))
  const estSavingsUsd = (localQueries * (data.avgTokens || 500) * 0.00001).toFixed(2)
  const estTimeSavedMins = Math.round((localQueries * 1500) / 60000)

  return (
    <div className="space-y-6">
      {/* Headline ROI */}
      <div className="sticky top-[-24px] lg:top-[-32px] z-30 bg-[var(--bg-app)] pt-6 lg:pt-8 -mt-6 lg:-mt-8 pb-4 mb-2">
        <div className="bg-[#a855f7]/10 border border-[#a855f7]/30 rounded-xl p-4 shadow-sm backdrop-blur-md">
          <h2 className="text-[13px] font-black text-[#d8b4fe] tracking-wide mb-1.5">Local-First ROI & Token Economics</h2>
          <p className="text-[12px] font-medium text-[var(--text-muted)] leading-relaxed">
            By intelligently routing <strong className="text-white">{localRate}%</strong> of queries to local vector search instead of the cloud LLM, you have saved approximately <strong className="text-emerald-400">~${estSavingsUsd}</strong> in API costs and avoided <strong className="text-[#a855f7]">{estTimeSavedMins} minutes</strong> of cumulative network latency.
          </p>
        </div>
      </div>

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
