import { describe, it, expect } from 'vitest'
import { processAnalyticsData } from '../../../../../src/renderer/src/components/analytics/analyticsDataHelper'

describe('processAnalyticsData', () => {
  it('returns default structure for empty metrics', () => {
    const result = processAnalyticsData({})
    expect(result).toHaveProperty('isUsingBenchmark')
    expect(result).toHaveProperty('totalQueries')
    expect(result).toHaveProperty('chartData')
    expect(result).toHaveProperty('quality')
    expect(result).toHaveProperty('retrieval')
    expect(result).toHaveProperty('activityFeed')
    expect(Array.isArray(result.chartData)).toBe(true)
  })

  it('generates benchmark data when fewer than 5 queries exist', () => {
    const result = processAnalyticsData({
      recentQueries: [{ query_text: 'test', latency_ms: 100, top_similarity: 0.9 }]
    })
    expect(result.isUsingBenchmark).toBe(true)
    expect(result.chartData.length).toBeGreaterThan(5)
  })

  it('uses real queries when enough exist', () => {
    const queries = Array(10).fill(null).map((_, i) => ({
      id: `q-${i}`,
      query_text: `Query ${i}`,
      latency_ms: 100 + i,
      top_similarity: 0.8 + (i * 0.01),
      result_count: 5,
      is_fallback: i % 3 === 0,
      created_at: new Date().toISOString()
    }))
    const result = processAnalyticsData({ recentQueries: queries })
    expect(result.isUsingBenchmark).toBe(false)
  })

  it('computes quality metrics', () => {
    const result = processAnalyticsData({})
    expect(result.quality).toHaveProperty('faithfulness')
    expect(result.quality).toHaveProperty('relevance')
    expect(result.quality).toHaveProperty('coherence')
    expect(result.quality).toHaveProperty('hallucinationDrop')
  })

  it('computes retrieval metrics', () => {
    const result = processAnalyticsData({})
    expect(result.retrieval).toHaveProperty('avgCosine')
    expect(result.retrieval).toHaveProperty('contextDensity')
    expect(result.retrieval).toHaveProperty('mrrAt3')
    expect(result.retrieval).toHaveProperty('avgSearchSpeed')
  })

  it('returns chart data with required fields', () => {
    const result = processAnalyticsData({})
    expect(result.chartData.length).toBeGreaterThan(0)
    const point = result.chartData[0]
    expect(point).toHaveProperty('label')
    expect(point).toHaveProperty('queryText')
    expect(point).toHaveProperty('standard')
    expect(point).toHaveProperty('hybrid')
    expect(point).toHaveProperty('similarity')
    expect(point).toHaveProperty('metrics')
  })
})
