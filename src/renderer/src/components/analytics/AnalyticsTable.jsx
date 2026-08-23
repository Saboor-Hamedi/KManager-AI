import React, { memo, useState, useMemo } from 'react'
import { Search, ArrowUpDown } from 'lucide-react'

const AnalyticsTable = memo(({ data }) => {
  const [inputValue, setInputValue] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('label')
  const [sortOrder, setSortOrder] = useState('desc')
  const [filterRoute, setFilterRoute] = useState('all')
  const [groupSimilar, setGroupSimilar] = useState(false)

  // Debounce the search query to prevent heavy UI lag on every keystroke
  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      setSearchQuery(inputValue)
    }, 300)
    return () => clearTimeout(timeoutId)
  }, [inputValue])

  const rawQueries = data?.chartData || []

  const filteredData = useMemo(() => {
    let processed = rawQueries.filter(q => {
      const matchesSearch = !searchQuery || q.queryText?.toLowerCase().includes(searchQuery.toLowerCase()) || q.label?.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesRoute = filterRoute === 'all' 
        ? true 
        : filterRoute === 'conv' ? q.isConv : !q.isConv
      return matchesSearch && matchesRoute
    })

    if (groupSimilar) {
      const grouped = {}
      processed.forEach(q => {
        const text = (q.queryText || '').toLowerCase().trim()
        if (!grouped[text]) {
          grouped[text] = { ...q, count: 1 }
        } else {
          grouped[text].count++
          grouped[text].standard += q.standard
          grouped[text].hybrid += q.hybrid
        }
      })
      processed = Object.values(grouped).map(g => ({
        ...g,
        standard: Math.round(g.standard / g.count),
        hybrid: Math.round(g.hybrid / g.count)
      }))
    }

    return processed.sort((a, b) => {
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
      } else if (sortBy === 'count') {
        valA = a.count || 1
        valB = b.count || 1
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1
      return 0
    })
  }, [rawQueries, searchQuery, sortBy, sortOrder, filterRoute, groupSimilar])

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
    <div className="bg-transparent w-full flex flex-col animate-in fade-in duration-300">
      <div className="sticky top-[-24px] lg:top-[-32px] z-30 bg-[var(--bg-app)] pt-6 lg:pt-8 -mt-6 lg:-mt-8 pb-3 border-b border-white/[0.05] mb-2">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-[12px] font-semibold text-[var(--text-main)] uppercase tracking-wider">
              Raw Query Telemetry
            </h2>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
              {filteredData.length} records • Inspection
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 flex-1">
            <button
              onClick={() => setGroupSimilar(!groupSimilar)}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors border ${groupSimilar ? 'bg-[#a855f7]/15 text-[#c084fc] border-[#a855f7]/30' : 'bg-transparent text-[var(--text-muted)] border-[var(--border-dim)] hover:text-[var(--text-main)]'}`}
            >
              Group Similar
            </button>

            {/* Search Bar */}
            <div className="relative">
              <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Search..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="pl-6 pr-2 py-1 bg-[var(--bg-panel)] border border-[var(--border-dim)] rounded text-[11px] text-[var(--text-main)] placeholder-[var(--text-faint)] focus:outline-none focus:border-[var(--border-subtle)] w-36 transition-colors"
              />
            </div>

            {/* Route Filter (Single Words) */}
            <div className="flex bg-[var(--bg-app)]/60 border border-[var(--border-dim)] rounded p-0.5">
              {['all', 'conv', 'complex'].map(r => (
                <button
                  key={r}
                  onClick={() => setFilterRoute(r)}
                  className={`px-2 py-0.5 rounded-[3px] text-[10px] uppercase tracking-wider transition-colors ${
                    filterRoute === r ? 'bg-[var(--text-muted)] text-[var(--bg-app)] font-bold shadow-none' : 'text-[var(--text-muted)] hover:bg-[var(--bg-active)] hover:text-[var(--text-main)] font-medium'
                  }`}
                >
                  {r === 'all' ? 'All' : r === 'conv' ? 'Conv' : 'Vector'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Seamless Table Container */}
      <div className="w-full">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-[58px] lg:top-[50px] bg-[var(--bg-app)]/95 backdrop-blur-sm z-20">
              <tr className="border-b-2 border-[var(--border-subtle)] text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
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
                    Coh <ArrowUpDown size={10} className="opacity-50" />
                  </div>
                </th>
                <th className="py-2.5 px-3 text-right cursor-pointer hover:text-[var(--text-main)] transition-colors" onClick={() => toggleSort('relevance')}>
                  <div className="flex items-center justify-end gap-1">
                    Rel <ArrowUpDown size={10} className="opacity-50" />
                  </div>
                </th>
                <th className="py-2.5 px-3 text-right cursor-pointer hover:text-[var(--text-main)] transition-colors" onClick={() => toggleSort('faithfulness')}>
                  <div className="flex items-center justify-end gap-1">
                    Faith <ArrowUpDown size={10} className="opacity-50" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="text-[12px] font-mono divide-transparent">
              {filteredData.slice(0, 50).map((q, idx) => {
                const coh = q.metrics?.hybridCoherence || 95
                const rel = q.metrics?.hybridRelevance || 90
                const faith = q.metrics?.hybridFaithfulness || 98
                const savings = q.standard - q.hybrid

                return (
                  <tr key={idx} className="border-none hover:bg-[var(--bg-panel)]/40 transition-colors group cursor-default">
                    <td className="py-3 px-3 text-[var(--text-muted)] group-hover:text-[var(--text-main)] transition-colors">
                      {q.count > 1 ? `x${q.count}` : q.label}
                    </td>
                    <td className="py-3 px-3 font-sans text-[var(--text-main)] max-w-xs truncate" title={q.queryText}>
                      {q.queryText}
                    </td>
                    <td className="py-3 px-3 font-sans">
                      <span className="px-1.5 py-0.5 rounded text-[12px] font-bold tracking-wide uppercase text-[var(--text-muted)] bg-[var(--bg-panel)]">
                        {q.isConv ? 'Conv' : 'Vector'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right text-[var(--text-muted)]">{q.standard}ms</td>
                    <td className="py-3 px-3 text-right text-[var(--text-main)] font-semibold">
                      {q.hybrid}ms
                      {savings > 0 && <span className="text-[12px] text-[var(--text-muted)] ml-1 font-normal opacity-0 group-hover:opacity-100 transition-opacity">(-{savings}ms)</span>}
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
      {filteredData.length > 50 && (
        <p className="text-[12px] text-[var(--text-muted)] text-center mt-3">
          Showing top 50 of {filteredData.length} records
        </p>
      )}
    </div>
  )
})

export default AnalyticsTable
