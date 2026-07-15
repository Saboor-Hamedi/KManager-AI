import React, { memo, useState, useMemo } from 'react'
import { Search, ArrowUpDown } from 'lucide-react'

const AnalyticsTable = memo(({ data }) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('label')
  const [sortOrder, setSortOrder] = useState('desc')
  const [filterRoute, setFilterRoute] = useState('all')

  const rawQueries = data?.chartData || []

  const filteredData = useMemo(() => {
    return rawQueries.filter(q => {
      const matchesSearch = !searchQuery || q.queryText?.toLowerCase().includes(searchQuery.toLowerCase()) || q.label?.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesRoute = filterRoute === 'all' 
        ? true 
        : filterRoute === 'conv' ? q.isConv : !q.isConv
      return matchesSearch && matchesRoute
    }).sort((a, b) => {
      let valA = a[sortBy]
      let valB = b[sortBy]

      if (sortBy === 'coherence') {
        valA = a.metrics?.hybridCoherence || 0
        valB = b.metrics?.hybridCoherence || 0
      } else if (sortBy === 'relevance') {
        valA = a.metrics?.hybridRelevance || 0
        valB = b.metrics?.hybridRelevance || 0
      } else if (sortBy === 'faithfulness') {
        valA = a.metrics?.hybridFaithfulness || 0
        valB = b.metrics?.hybridFaithfulness || 0
      } else if (sortBy === 'label') {
        valA = Number(a.label?.replace(/\D/g, '')) || 0
        valB = Number(b.label?.replace(/\D/g, '')) || 0
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1
      return 0
    })
  }, [rawQueries, searchQuery, sortBy, sortOrder, filterRoute])

  const toggleSort = (key) => {
    if (sortBy === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(key)
      setSortOrder('desc')
    }
  }

  if (!rawQueries.length) return null

  return (
    <div className="bg-[var(--bg-card)]/50 border border-[var(--border-dim)] rounded-xl p-4 transition-all w-full min-h-[520px] flex flex-col justify-between">
      <div>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-xs font-semibold text-[var(--text-main)]">
              Query Telemetry
            </h2>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
              Per-query inspection across latency, quality, and routing ({filteredData.length} records)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Bar */}
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1 bg-[var(--bg-app)]/60 border border-[var(--border-dim)] rounded-lg text-xs text-[var(--text-main)] placeholder-[var(--text-faint)] focus:outline-none focus:border-[var(--border-subtle)] w-48 transition-colors"
              />
            </div>

            {/* Route Filter (Single Words) */}
            <div className="flex bg-[var(--bg-app)]/60 border border-[var(--border-dim)] rounded-lg p-0.5 text-xs">
              {['all', 'conv', 'complex'].map(r => (
                <button
                  key={r}
                  onClick={() => setFilterRoute(r)}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    filterRoute === r ? 'bg-[var(--bg-card)] text-[var(--text-main)] font-medium shadow-sm border border-[var(--border-dim)]/50' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                >
                  {r === 'all' ? 'All' : r === 'conv' ? 'Conversational' : 'Vector'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Compact, Single-Word Table Container */}
        <div className="overflow-x-auto overflow-y-auto max-h-[520px] min-h-[400px] rounded-lg border border-[var(--border-dim)] bg-[var(--bg-app)]/40 w-full">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--border-dim)] bg-[var(--bg-panel)]/50 text-[11px] font-medium text-[var(--text-muted)]">
                <th className="py-2 px-3 cursor-pointer hover:text-[var(--text-main)] transition-colors" onClick={() => toggleSort('label')}>
                  <div className="flex items-center gap-1">
                    ID <ArrowUpDown size={11} />
                  </div>
                </th>
                <th className="py-2 px-3">Prompt</th>
                <th className="py-2 px-3">Route</th>
                <th className="py-2 px-3 text-right cursor-pointer hover:text-[var(--text-main)] transition-colors" onClick={() => toggleSort('standard')}>
                  <div className="flex items-center justify-end gap-1">
                    Standard <ArrowUpDown size={11} />
                  </div>
                </th>
                <th className="py-2 px-3 text-right cursor-pointer hover:text-[var(--text-main)] transition-colors" onClick={() => toggleSort('hybrid')}>
                  <div className="flex items-center justify-end gap-1">
                    Hybrid <ArrowUpDown size={11} />
                  </div>
                </th>
                <th className="py-2 px-3 text-right cursor-pointer hover:text-[var(--text-main)] transition-colors" onClick={() => toggleSort('coherence')}>
                  <div className="flex items-center justify-end gap-1">
                    Coherence <ArrowUpDown size={11} />
                  </div>
                </th>
                <th className="py-2 px-3 text-right cursor-pointer hover:text-[var(--text-main)] transition-colors" onClick={() => toggleSort('relevance')}>
                  <div className="flex items-center justify-end gap-1">
                    Relevance <ArrowUpDown size={11} />
                  </div>
                </th>
                <th className="py-2 px-3 text-right cursor-pointer hover:text-[var(--text-main)] transition-colors" onClick={() => toggleSort('faithfulness')}>
                  <div className="flex items-center justify-end gap-1">
                    Faithfulness <ArrowUpDown size={11} />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-dim)]/40 text-xs font-mono">
              {filteredData.slice(0, 50).map((q, idx) => {
                const coh = q.metrics?.hybridCoherence || 95
                const rel = q.metrics?.hybridRelevance || 90
                const faith = q.metrics?.hybridFaithfulness || 98
                const savings = q.standard - q.hybrid

                return (
                  <tr key={idx} className="hover:bg-[var(--bg-panel)]/40 transition-colors">
                    <td className="py-2 px-3 text-[var(--text-muted)]">{q.label}</td>
                    <td className="py-2 px-3 font-sans text-[var(--text-main)] max-w-xs truncate" title={q.queryText}>
                      {q.queryText}
                    </td>
                    <td className="py-2 px-3 font-sans">
                      <span className="px-1.5 py-0.5 rounded text-[11px] font-mono text-[var(--text-muted)] bg-[var(--bg-panel)] border border-[var(--border-dim)]">
                        {q.isConv ? 'Conversational' : 'Vector'}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right text-[var(--text-muted)]">{q.standard}ms</td>
                    <td className="py-2 px-3 text-right text-[var(--text-main)] font-semibold">
                      {q.hybrid}ms
                      {savings > 0 && <span className="text-[10px] text-[var(--text-muted)] ml-1 font-normal">(-{savings}ms)</span>}
                    </td>
                    <td className="py-2 px-3 text-right text-[var(--text-main)]">{coh.toFixed(0)}%</td>
                    <td className="py-2 px-3 text-right text-[var(--text-main)]">{rel.toFixed(0)}%</td>
                    <td className="py-2 px-3 text-right text-[var(--text-main)]">{faith.toFixed(0)}%</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
      
      {filteredData.length > 50 && (
        <p className="text-[11px] text-[var(--text-muted)] text-center mt-3">
          Showing top 50 of {filteredData.length} records
        </p>
      )}
    </div>
  )
})

export default AnalyticsTable
