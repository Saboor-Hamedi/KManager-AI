import React, { memo } from 'react'
import { Clock, Zap, Database, Cpu } from 'lucide-react'
import { cn } from '../../lib/utils'

const MetricCard = memo(({ title, value, icon: Icon, trend, colorClass, bgClass, trendUp, neutral, trendLabel }) => (
  <div className="bg-[var(--bg-card)] border border-[var(--border-dim)] rounded-xl p-3 hover:border-[var(--border-subtle)] transition-all duration-300">
    <div className="flex justify-between items-center mb-1.5">
      <h3 className="text-[9px] font-black text-[var(--text-main)] tracking-widest uppercase leading-tight">{title}</h3>
      <div className={cn("p-1 rounded-md", bgClass)}>
        <Icon size={12} className={colorClass} strokeWidth={2.5} />
      </div>
    </div>
    <div className="flex items-baseline gap-2">
      <span className="text-lg font-black text-[var(--text-main)] tracking-tight leading-none">{value}</span>
    </div>
    
    <div className="mt-1.5 flex items-center gap-1.5">
      <span className={cn(
        "text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1",
        neutral ? 'bg-[var(--bg-panel)] text-[var(--text-main)]' : 
        trendUp ? 'bg-[#10b981]/10 text-[#10b981]' : 'bg-[var(--icon-danger)]/10 text-[var(--icon-danger)]'
      )}>
        {trend}
      </span>
      {trendLabel && <span className="text-[8px] text-[var(--text-faint)] font-medium">{trendLabel}</span>}
    </div>
  </div>
))

const DashboardMetrics = ({ results }) => {
  if (!results) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <MetricCard title="Avg Latency (Std)" value="-- ms" icon={Clock} colorClass="text-[var(--text-muted)]" bgClass="bg-[var(--bg-active)]" trend="Waiting" trendLabel="for benchmark" neutral={true} />
        <MetricCard title="Avg Latency (Hybrid)" value="-- ms" icon={Zap} colorClass="text-[var(--text-muted)]" bgClass="bg-[var(--bg-active)]" trend="Waiting" trendLabel="for benchmark" neutral={true} />
        <MetricCard title="DB Searches Skipped" value="0" icon={Database} colorClass="text-[var(--text-muted)]" bgClass="bg-[var(--bg-active)]" trend="Waiting" trendLabel="for benchmark" neutral={true} />
        <MetricCard title="Est. Tokens Saved" value="0" icon={Cpu} colorClass="text-[var(--text-muted)]" bgClass="bg-[var(--bg-active)]" trend="Waiting" trendLabel="for benchmark" neutral={true} />
      </div>
    )
  }

  const latencyDiff = results.avgStandard - results.avgHybrid
  const latencyPercent = ((latencyDiff / results.avgStandard) * 100).toFixed(1)

  return (
    <div className="flex flex-col gap-3 mb-4 animate-in fade-in duration-300">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard 
          title="Avg Latency (Std)" 
          value={`${results.avgStandard}ms`} 
          icon={Clock} 
          colorClass="text-[var(--icon-danger)]" 
          bgClass="bg-[var(--icon-danger)]/10" 
          trend="Baseline" 
          trendLabel="standard RAG" 
          neutral={true} 
        />
        <MetricCard 
          title="Avg Latency (Hybrid)" 
          value={`${results.avgHybrid}ms`} 
          icon={Zap} 
          colorClass="text-[var(--icon-secondary)]" 
          bgClass="bg-[var(--icon-secondary)]/10" 
          trend={`-${latencyPercent}%`} 
          trendLabel="faster overall" 
          trendUp={true} 
        />
        <MetricCard 
          title="DB Searches Skipped" 
          value={results.dbSearchesAvoided} 
          icon={Database} 
          colorClass="text-[var(--text-accent)]" 
          bgClass="bg-[var(--text-accent)]/10" 
          trend="Zero Latency" 
          trendLabel="bypassed vector search" 
          trendUp={true} 
        />
        <MetricCard 
          title="Est. Tokens Saved" 
          value={results.totalTokensSaved} 
          icon={Cpu} 
          colorClass="text-[var(--text-accent)]" 
          bgClass="bg-[var(--text-accent)]/10" 
          trend="Cost Reduction" 
          trendLabel="API tokens preserved" 
          trendUp={true} 
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard 
          title="Avg Faithfulness" 
          value={`${results.quality.faithfulness}%`} 
          icon={Zap} 
          colorClass="text-[#10b981]" 
          bgClass="bg-[#10b981]/10" 
          trend="No Hallucinations" 
          trendLabel="context adherence" 
          trendUp={true} 
        />
        <MetricCard 
          title="Avg Relevance" 
          value={`${results.quality.relevance}%`} 
          icon={Zap} 
          colorClass="text-[#10b981]" 
          bgClass="bg-[#10b981]/10" 
          trend="High Accuracy" 
          trendLabel="answers query perfectly" 
          trendUp={true} 
        />
        <MetricCard 
          title="Avg Coherence" 
          value={`${results.quality.coherence}%`} 
          icon={Zap} 
          colorClass="text-[#3b82f6]" 
          bgClass="bg-[#3b82f6]/10" 
          trend="Well-structured" 
          trendLabel="logical text flow" 
          neutral={true} 
        />
        <MetricCard 
          title="Accuracy Gain" 
          value={`+${results.quality.hallucinationDrop}%`} 
          icon={Zap} 
          colorClass="text-[var(--icon-secondary)]" 
          bgClass="bg-[var(--icon-secondary)]/10" 
          trend="Massive Improvement" 
          trendLabel="vs Base LLM" 
          trendUp={true} 
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard 
          title="Avg Cosine Sim." 
          value={results.retrieval.avgCosine} 
          icon={Database} 
          colorClass="text-[#8b5cf6]" 
          bgClass="bg-[#8b5cf6]/10" 
          trend="High Semantic Match" 
          trendLabel="pgvector distance" 
          trendUp={true} 
        />
        <MetricCard 
          title="Context Density" 
          value={`${results.retrieval.contextDensity}%`} 
          icon={Database} 
          colorClass="text-[#8b5cf6]" 
          bgClass="bg-[#8b5cf6]/10" 
          trend="Highly Efficient" 
          trendLabel="useful token ratio" 
          trendUp={true} 
        />
        <MetricCard 
          title="MRR@3" 
          value={results.retrieval.mrrAt3} 
          icon={Database} 
          colorClass="text-[#8b5cf6]" 
          bgClass="bg-[#8b5cf6]/10" 
          trend="Top-K Accuracy" 
          trendLabel="retrieval rank" 
          trendUp={true} 
        />
        <MetricCard 
          title="Retrieval Speed" 
          value={`${results.retrieval.avgSearchSpeed}ms`} 
          icon={Clock} 
          colorClass="text-[#8b5cf6]" 
          bgClass="bg-[#8b5cf6]/10" 
          trend="Lightning Fast" 
          trendLabel="database latency" 
          trendUp={true} 
        />
      </div>
    </div>
  )
}

export default DashboardMetrics
