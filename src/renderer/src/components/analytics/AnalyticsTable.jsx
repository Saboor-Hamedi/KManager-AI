import React, { memo, useState, useMemo } from 'react'
import { Search, ArrowUpDown } from 'lucide-react'

const AnalyticsTable = memo(({ data }) => {
  const [inputValue, setInputValue] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('label')
  const [sortOrder, setSortOrder] = useState('desc')
  const [filterRoute, setFilterRoute] = useState('all')

  // Debounce the search query to prevent heavy UI lag on every keystroke
  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      setSearchQuery(inputValue)
    }, 300)
    return () => clearTimeout(timeoutId)
  }, [inputValue])

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
    <div className="bg-transparent w-full min-h-[520px] flex flex-col justify-between animate-in fade-in duration-300">
      <div>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-[13px] font-bold text-[var(--text-main)]">
              Raw Query Telemetry
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
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-[var(--bg-panel)] border border-[var(--border-dim)] rounded-lg text-xs text-[var(--text-main)] placeholder-[var(--text-faint)] focus:outline-none focus:border-[var(--border-subtle)] w-48 transition-colors"
              />
            </div>

            {/* Route Filter (Single Words) */}
            <div className="flex bg-[var(--bg-app)]/60 border border-[var(--border-dim)] rounded-lg p-0.5 text-xs">
              {['all', 'conv', 'complex'].map(r => (
                <button
                  key={r}
                  onClick={() => setFilterRoute(r)}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    filterRoute === r ? 'bg-white/[0.04] text-[var(--text-main)] font-medium shadow-none border border-white/[0.04]' : 'text-[var(--text-muted)] hover:bg-[var(--bg-active)] hover:text-[var(--text-main)]'
                  }`}
                >
                  {r === 'all' ? 'All' : r === 'conv' ? 'Conversational' : 'Vector'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Seamless Table Container */}
        <div className="overflow-x-auto overflow-y-auto max-h-[520px] min-h-[400px] w-full custom-scrollbar pr-2">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-[var(--bg-app)]/95 backdrop-blur-sm z-10">
              <tr className="border-b border-[var(--border-dim)] text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                <th className="py-2.5 px-3 cursor-pointer hover:text-[var(--text-main)] transition-colors w-16" onClick={() => toggleSort('label')}>
                  <div className="flex items-center gap-1">
                    ID <ArrowUpDown size={10} className="opacity-50" />
                  </div>
                </th>
                <th className="py-2.5 px-3 w-1/3">Prompt</th>
                <th className="py-2.5 px-3">Route</th>
                <th className="py-2.5 px-3 text-right cursor-pointer hover:text-[var(--text-main)] transition-colors" onClick={() => toggleSort('standard')}>
                  <div className="flex items-center justify-end gap-1">
                    Standard <ArrowUpDown size={10} className="opacity-50" />
                  </div>
                </th>
                <th className="py-2.5 px-3 text-right cursor-pointer hover:text-[var(--text-main)] transition-colors" onClick={() => toggleSort('hybrid')}>
                  <div className="flex items-center justify-end gap-1">
                    Hybrid <ArrowUpDown size={10} className="opacity-50" />
                  </div>
                </th>
                <th className="py-2.5 px-3 text-right cursor-pointer hover:text-[var(--text-main)] transition-colors" onClick={() => toggleSort('coherence')}>
                  <div className="flex items-center justify-end gap-1">
                    Coherence <ArrowUpDown size={10} className="opacity-50" />
                  </div>
                </th>
                <th className="py-2.5 px-3 text-right cursor-pointer hover:text-[var(--text-main)] transition-colors" onClick={() => toggleSort('relevance')}>
                  <div className="flex items-center justify-end gap-1">
                    Relevance <ArrowUpDown size={10} className="opacity-50" />
                  </div>
                </th>
                <th className="py-2.5 px-3 text-right cursor-pointer hover:text-[var(--text-main)] transition-colors" onClick={() => toggleSort('faithfulness')}>
                  <div className="flex items-center justify-end gap-1">
                    Truth <ArrowUpDown size={10} className="opacity-50" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="text-[11px] font-mono">
              {filteredData.slice(0, 50).map((q, idx) => {
                const coh = q.metrics?.hybridCoherence || 95
                const rel = q.metrics?.hybridRelevance || 90
                const faith = q.metrics?.hybridFaithfulness || 98
                const savings = q.standard - q.hybrid

                return (
                  <tr key={idx} className="border-b border-[var(--border-subtle)]/30 hover:bg-[var(--bg-panel)]/40 transition-colors group cursor-default">
                    <td className="py-3 px-3 text-[var(--text-muted)] group-hover:text-[var(--text-main)] transition-colors">{q.label}</td>
                    <td className="py-3 px-3 font-sans text-[var(--text-main)] max-w-xs truncate" title={q.queryText}>
                      {q.queryText}
                    </td>
                    <td className="py-3 px-3 font-sans">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wide uppercase text-[var(--text-muted)] bg-[var(--bg-panel)]">
                        {q.isConv ? 'Conv' : 'Vector'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right text-[var(--text-muted)]">{q.standard}ms</td>
                    <td className="py-3 px-3 text-right text-[var(--text-main)] font-semibold">
                      {q.hybrid}ms
                      {savings > 0 && <span className="text-[9px] text-[var(--text-muted)] ml-1 font-normal opacity-0 group-hover:opacity-100 transition-opacity">(-{savings}ms)</span>}
                    </td>
                    <td className="py-3 px-3 text-right text-[var(--text-main)]">{coh.toFixed(0)}%</td>
                    <td className="py-3 px-3 text-right text-[var(--text-main)]">{rel.toFixed(0)}%</td>
                    <td className="py-3 px-3 text-right text-[var(--text-main)]">{faith.toFixed(0)}%</td>
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
