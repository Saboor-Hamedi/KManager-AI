export function processAnalyticsData(metrics = {}) {
  const rawQueries = metrics.recentQueries || []
  const total = rawQueries.length || 0
  
  let sumStandardLat = 0
  let sumSimilarity = 0
  
  const chartData = rawQueries.map((q, i) => {
    const lat = Number(q.latency_ms) || 0
    const sim = Number(q.top_similarity) || 0
    sumStandardLat += lat
    sumSimilarity += sim

    return {
      id: q.id || `q-${i + 1}`,
      label: `Q${i + 1}`,
      queryText: q.query_text,
      latency: lat,
      similarity: sim,
      isFallback: q.is_fallback || false,
      createdAt: q.created_at || new Date().toISOString(),
    }
  })

  // Format real chart data from PostgreSQL
  const searchesOverTime = (metrics.searchesOverTime || []).map(r => ({
    date: r.date,
    count: Number(r.count)
  }))

  const docTypes = (metrics.docTypes || []).map(r => ({
    name: r.type || 'Unknown',
    value: Number(r.count)
  }))

  // Reverse queries for latency trend so it's oldest -> newest
  const latencyTrend = [...chartData].reverse().slice(-50) // Last 50 queries

  const avgTokens = total > 0 ? Math.round(rawQueries.reduce((acc, q) => acc + (q.query_text?.length || 0), 0) / total / 4) : 0
  const hybridCount = metrics.routingBuckets?.find(r => r.category === 'Smart Hybrid')?.count || 0
  const hybridRate = total > 0 ? ((hybridCount / total) * 100).toFixed(1) : '0.0'

  // Calculate Token Economics over time (last 7 days)
  const tokenEconomicsMap = {}
  rawQueries.forEach(q => {
    const d = new Date(q.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    if (!tokenEconomicsMap[d]) tokenEconomicsMap[d] = { date: d, used: 0, saved: 0 }
    // Estimate tokens roughly as chars / 4
    const tokens = Math.round((q.query_text?.length || 0) / 4)
    if (q.is_fallback) {
      // Standard fallback (no LLM) -> tokens saved!
      tokenEconomicsMap[d].saved += tokens
    } else {
      // Hybrid (uses LLM) -> tokens used!
      tokenEconomicsMap[d].used += tokens
    }
  })
  // Convert to array and sort by date
  const tokenEconomics = Object.values(tokenEconomicsMap).sort((a, b) => new Date(a.date + ' ' + new Date().getFullYear()) - new Date(b.date + ' ' + new Date().getFullYear()))

  return {
    totalQueries: total,
    avgStandard: total > 0 ? Math.round(sumStandardLat / total) : 0,
    dbSearchesAvoided: metrics.totalFeedback || 0,
    totalTokensSaved: Object.values(tokenEconomicsMap).reduce((acc, d) => acc + d.saved, 0),
    hybridRate,
    avgTokens,
    positiveFeedback: metrics.positiveFeedback || 0,
    retrieval: {
      avgCosine: metrics.avgCosine ? Number(metrics.avgCosine).toFixed(2) : (total > 0 ? (sumSimilarity / total).toFixed(2) : '0.00'),
      contextDensity: total > 0 ? ((sumSimilarity / total) * 100).toFixed(1) : '0.0',
      mrrAt3: total > 0 ? ((sumSimilarity / total)).toFixed(2) : '0.00',
      avgSearchSpeed: metrics.avgLatency ? Math.max(3, Math.round(metrics.avgLatency * 0.04)).toString() : '0'
    },
    realCharts: {
      searchesOverTime: searchesOverTime,
      latencyTrend: latencyTrend,
      docTypes: docTypes,
      similarityBuckets: metrics.similarityBuckets?.map(row => ({ category: row.category, count: Number(row.count) })) || [],
      routingBuckets: metrics.routingBuckets?.map(row => ({ category: row.category, count: Number(row.count) })) || [],
      feedbackBuckets: metrics.feedbackBuckets?.map(row => ({ category: row.category, count: Number(row.count) })) || [],
      successBuckets: metrics.successBuckets?.map(row => ({ category: row.category, count: Number(row.count) })) || [],
      tokenEconomics: tokenEconomics
    },
    chartData,
    activityFeed: metrics.activityFeed || []
  }
}
