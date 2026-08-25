import React from 'react'

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'from', 'have', 'are', 'was', 'were', 'not', 'but',
  'you', 'can', 'will', 'our', 'your', 'what', 'when', 'where', 'why', 'how', 'all', 'any', 'both',
  'each', 'few', 'more', 'most', 'other', 'some', 'such', 'than', 'too', 'very', 'into', 'onto',
  'upon', 'over', 'under', 'above', 'below', 'after', 'before', 'since', 'while', 'during', 'about',
  'against', 'between', 'has', 'had', 'they', 'them', 'their', 'there', 'here', 'which', 'who', 'whom',
  'whose', 'how', 'its', 'it\'s', 'he\'d', 'she\'d', 'we\'d', 'they\'d', 'would', 'could', 'should',
  'does', 'did', 'done', 'doing', 'being', 'been', 'one', 'two', 'three', 'also', 'just', 'only', 'others'
])

const Highlight = ({ text, query, disabled }) => {
  if (disabled || !query || !text) return <>{text || ''}</>
  
  try {
    const exactPhrase = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const words = query
      .trim()
      .split(/\s+/)
      .filter(w => w.length > 2 && !STOP_WORDS.has(w.toLowerCase()))
      .map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      
    // Create an array of patterns, prioritizing the exact phrase if it contains multiple words
    const patterns = []
    if (query.trim().split(/\s+/).length > 1) {
      patterns.push(exactPhrase)
    }
    patterns.push(...words)
    
    if (patterns.length === 0) return <>{text}</>

    const pattern = new RegExp(`(${patterns.join('|')})`, 'gi')
    const matchPattern = new RegExp(`^(${patterns.join('|')})$`, 'i')
    const parts = text.split(pattern)
    
    return (
      <>
        {parts.map((part, i) => 
          matchPattern.test(part)
            ? <span key={i} className="text-[var(--text-accent)]">{part}</span> 
            : <React.Fragment key={i}>{part}</React.Fragment>
        )}
      </>
    )
  } catch (e) {
    return <>{text}</>
  }
}

export default Highlight
