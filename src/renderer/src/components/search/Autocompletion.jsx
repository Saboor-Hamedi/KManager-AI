import React, { useEffect, useRef } from 'react'
import { Search } from 'lucide-react'

export const getSuggestion = (content, queryStr) => {
  if (!content || !queryStr) return { text: '', matchIdx: -1 }
  const cleanContent = content.replace(/[*_~`>#\[\]\n]/g, ' ')
  const escapedQuery = queryStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  
  // Look for word boundary match first
  let regex = new RegExp(`\\b${escapedQuery}`, 'i')
  let match = cleanContent.match(regex)
  
  // Fallback to substring match if word boundary fails
  if (!match) {
    regex = new RegExp(escapedQuery, 'i')
    match = cleanContent.match(regex)
  }

  if (!match) return { text: cleanContent.substring(0, 50).trim() + '...', matchIdx: -1 }
  
  const matchIdx = match.index
  
  // Find start of the sentence or phrase (trace back up to 3 words max)
  let start = matchIdx
  let spaceCountBack = 0
  while (start > 0 && spaceCountBack < 3) {
    start--
    if (cleanContent[start] === ' ') spaceCountBack++
    if (['.', '!', '?', ':'].includes(cleanContent[start])) { start += 2; break }
  }
  
  // Find end of phrase (approx 6-8 words forward)
  let end = matchIdx + queryStr.length
  let spaceCountFwd = 0
  while (end < cleanContent.length && spaceCountFwd < 6) {
    if (cleanContent[end] === ' ') spaceCountFwd++
    if (['.', '!', '?', '\n'].includes(cleanContent[end])) { end++; break }
    end++
  }
  
  const suggestionText = cleanContent.substring(start, end).replace(/\s+/g, ' ').trim()
  
  // Recalculate matchIdx relative to the extracted snippet
  const relativeMatch = suggestionText.match(regex)
  const relativeMatchIdx = relativeMatch ? relativeMatch.index : suggestionText.toLowerCase().indexOf(queryStr.toLowerCase())
  
  return { text: suggestionText, matchIdx: relativeMatchIdx }
}

const Autocompletion = ({ results, visible, query, onSelect, selectedIndex, onClose }) => {
  const containerRef = useRef(null)

  useEffect(() => {
    if (!visible) return
    const handleKey = (e) => {
      if (e.key === 'Escape') {
        onClose?.()
      }
    }
    const handleMouseDown = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        onClose?.()
      }
    }
    window.addEventListener('keydown', handleKey)
    document.addEventListener('mousedown', handleMouseDown)
    return () => {
      window.removeEventListener('keydown', handleKey)
      document.removeEventListener('mousedown', handleMouseDown)
    }
  }, [visible, onClose])

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
      <div ref={containerRef} className="flex flex-col py-1 max-h-[300px] min-h-[40px] overflow-y-auto custom-scrollbar">
        {results.map((res, idx) => {
          const suggestionObj = res.suggestionText !== undefined 
            ? { text: res.suggestionText, matchIdx: res.suggestionMatchIdx } 
            : getSuggestion(res.content, query)
          const suggestionText = suggestionObj.text || ''
          const matchIdx = suggestionObj.matchIdx
          
          // Bold the matching part of the suggestion
          const qLower = (query || '').toLowerCase().trim()
          
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
