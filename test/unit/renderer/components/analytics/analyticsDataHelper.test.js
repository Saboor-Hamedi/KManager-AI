import { describe, it, expect } from 'vitest'
import { processAnalyticsData } from '../../../../../src/renderer/src/components/analytics/analyticsDataHelper'

describe('processAnalyticsData', () => {
  it('returns default structure for empty metrics', () => {
    const result = processAnalyticsData({})
    expect(result).toHaveProperty('totalQueries', 0)
    expect(result).toHaveProperty('avgStandard', 0)
    expect(result).toHaveProperty('retrieval')
    expect(result).toHaveProperty('realCharts')
    expect(result).toHaveProperty('chartData')
    expect(result).toHaveProperty('activityFeed')
    expect(Array.isArray(result.chartData)).toBe(true)
  })

  it('processes real queries', () => {
    const queries = Array(10).fill(null).map((_, i) => ({
      id: `q-${i}`,
      query_text: `Query ${i}`,
      latency_ms: 100 + i,
      top_similarity: 0.8 + (i * 0.01),
      result_count: 5,
      created_at: new Date().toISOString()
    }))
    const result = processAnalyticsData({ recentQueries: queries })
    expect(result.totalQueries).toBe(10)
    expect(result.chartData.length).toBe(10)
  })

  it('computes retrieval metrics', () => {
    const result = processAnalyticsData({})
    expect(result.retrieval).toHaveProperty('avgCosine')
    expect(result.retrieval).toHaveProperty('contextDensity')
    expect(result.retrieval).toHaveProperty('mrrAt3')
    expect(result.retrieval).toHaveProperty('avgSearchSpeed')
  })

  it('returns chart data with required fields', () => {
    const queries = Array(5).fill(null).map((_, i) => ({
      id: `q-${i}`,
      query_text: `Query ${i}`,
      latency_ms: 100,
      top_similarity: 0.9,
      created_at: new Date().toISOString()
    }))
    const result = processAnalyticsData({ recentQueries: queries })
    expect(result.chartData.length).toBeGreaterThan(0)
    const point = result.chartData[0]
    expect(point).toHaveProperty('label')
    expect(point).toHaveProperty('queryText')
    expect(point).toHaveProperty('latency')
    expect(point).toHaveProperty('similarity')
  })
})
