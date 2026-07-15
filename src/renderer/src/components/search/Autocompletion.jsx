import React, { useEffect, useRef } from 'react'
import { Search } from 'lucide-react'

const Autocompletion = ({ results, visible, query, onSelect, selectedIndex }) => {
  const containerRef = useRef(null)

  const getSuggestion = (content, queryStr) => {
    if (!content || !queryStr) return ''
    const cleanContent = content.replace(/[*_~`>#\[\]]/g, '')
    const lowerContent = cleanContent.toLowerCase()
    const lowerQuery = queryStr.toLowerCase().trim()
    const matchIdx = lowerContent.indexOf(lowerQuery)
    if (matchIdx === -1) return cleanContent.substring(0, 50).replace(/\n/g, ' ') + '...'
    
    // Find start of word containing match
    let start = matchIdx
    while (start > 0 && !/[\s\n.!?]/.test(cleanContent[start - 1])) start--
    
    // Find end of phrase (approx 6-8 words)
    let end = matchIdx + lowerQuery.length
    let spaceCount = 0
    while (end < cleanContent.length && spaceCount < 8) {
      if (cleanContent[end] === ' ' || cleanContent[end] === '\n') spaceCount++
      if (['.', '!', '?'].includes(cleanContent[end])) { end++; break }
      end++
    }
    
    return cleanContent.substring(start, Math.min(end, start + 80)).replace(/\n/g, ' ').trim()
  }

  useEffect(() => {
    if (visible && selectedIndex >= 0 && containerRef.current) {
      const selectedEl = containerRef.current.children[selectedIndex]
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [selectedIndex, visible])

  if (!visible || !results || results.length === 0) return null

  return (
    <div className="absolute bottom-full left-0 right-0 w-full bg-[var(--bg-card)] rounded-t-[5px] border-b border-[var(--border-subtle)]/30 shadow-[0_-4px_20px_rgba(0,0,0,0.4)] overflow-hidden animate-in fade-in duration-100 z-50">
      <div ref={containerRef} className="flex flex-col py-1 max-h-[200px] overflow-y-auto custom-scrollbar">
        {results.map((res, idx) => {
          const suggestionText = getSuggestion(res.content, query)
          
          // Bold the matching part of the suggestion
          const lowerSuggestion = suggestionText.toLowerCase()
          const qLower = (query || '').toLowerCase().trim()
          const matchIdx = lowerSuggestion.indexOf(qLower)
          
          let highlightedSnippet = suggestionText
          if (matchIdx !== -1 && qLower.length > 0) {
            highlightedSnippet = (
              <>
                {suggestionText.substring(0, matchIdx)}
                <span className="text-[var(--text-accent)] font-semibold">
                  {suggestionText.substring(matchIdx, matchIdx + qLower.length)}
                </span>
                {suggestionText.substring(matchIdx + qLower.length)}
              </>
            )
          }

          const isSelected = idx === selectedIndex

          return (
            <div 
              key={idx} 
              onClick={() => onSelect({ ...res, suggestion: suggestionText })}
              className={`px-4 py-1.5 cursor-pointer flex items-center gap-3 transition-colors ${
                isSelected ? 'bg-[var(--bg-active)]' : 'hover:bg-[var(--bg-active)] hover:brightness-110'
              }`}
            >
              <Search size={12} className="text-[var(--text-muted)] shrink-0" />
              <div className="flex items-center gap-2 overflow-hidden w-full text-[13px]">
                <span className="text-[var(--text-main)] truncate max-w-[70%]">{highlightedSnippet}</span>
                <span className="text-[var(--text-muted)] opacity-40 shrink-0">•</span>
                <span className="text-[var(--text-muted)] text-[11px] truncate shrink-0 max-w-[30%]">{res.file_name}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default Autocompletion
