import React, { useEffect, useRef } from 'react'
import { Search } from 'lucide-react'
import { cleanMetadata, stripMarkdown } from '../../utils/useMetadata'

export const getSuggestion = (content, queryStr) => {
  if (!content || !queryStr) return { text: '', matchIdx: -1 }
  // Strip all metadata, HTML tags, and markdown symbols down to clean plain text
  const cleanContent = stripMarkdown(cleanMetadata(content)).replace(/\s+/g, ' ').trim()
  
  // Try exact match first
  const escapedQuery = queryStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  let match = cleanContent.match(new RegExp(`\\b${escapedQuery}`, 'i')) || cleanContent.match(new RegExp(escapedQuery, 'i'))
  
  // If no exact match, try to find the longest matching word from the query
  let matchIdx = match ? match.index : -1
  let matchLen = queryStr.length

  if (matchIdx === -1) {
    const queryWords = queryStr.split(/\s+/).filter(w => w.length > 2)
    for (const word of queryWords) {
      const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const wordMatch = cleanContent.match(new RegExp(`\\b${escapedWord}`, 'i')) || cleanContent.match(new RegExp(escapedWord, 'i'))
      if (wordMatch) {
        matchIdx = wordMatch.index
        matchLen = word.length
        break
      }
    }
  }

  // If absolutely no words match (e.g. pure semantic similarity), fallback gracefully
  if (matchIdx === -1) {
    const fallbackText = cleanContent.length > 90 
      ? cleanContent.substring(0, 90).replace(/\s+\S*$/, '') + '...' 
      : cleanContent
    return { text: fallbackText, matchIdx: -1, matchLen: 0 }
  }
  
  // Find start of the sentence or phrase (trace back ~4 words max)
  let start = matchIdx
  let spaceCountBack = 0
  while (start > 0 && spaceCountBack < 4) {
    start--
    if (cleanContent[start] === ' ') spaceCountBack++
    if (['.', '!', '?', ':'].includes(cleanContent[start])) { start += 2; break }
  }
  
  // Find end of phrase (trace forward ~8 words max)
  let end = matchIdx + matchLen
  let spaceCountFwd = 0
  while (end < cleanContent.length && spaceCountFwd < 8) {
    if (cleanContent[end] === ' ') spaceCountFwd++
    if (['.', '!', '?', '\n'].includes(cleanContent[end])) { end++; break }
    end++
  }
  
  const suggestionText = cleanContent.substring(start, end).trim()
  
  // Recalculate matchIdx relative to the extracted snippet
  const relativeMatchIdx = matchIdx - start
  
  return { text: suggestionText, matchIdx: relativeMatchIdx, matchLen }
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
          const qLower = (query || '').toLowerCase().trim()
          const suggestionObj = res.suggestionText !== undefined 
            ? { text: res.suggestionText, matchIdx: res.suggestionMatchIdx, matchLen: qLower.length } 
            : getSuggestion(res.content, query)
          const suggestionText = suggestionObj.text || ''
          const matchIdx = suggestionObj.matchIdx
          const matchLen = suggestionObj.matchLen || qLower.length
          
          let highlightedSnippet = suggestionText
          if (matchIdx !== -1 && matchLen > 0) {
            highlightedSnippet = (
              <>
                {suggestionText.substring(0, matchIdx)}
                <span className="text-[var(--text-accent)] font-semibold">
                  {suggestionText.substring(matchIdx, matchIdx + matchLen)}
                </span>
                {suggestionText.substring(matchIdx + matchLen)}
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
                <span className="text-[var(--text-muted)] text-[12px] truncate shrink-0 max-w-[30%]">{res.file_name}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default Autocompletion
