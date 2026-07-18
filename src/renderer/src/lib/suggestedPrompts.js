/**
 * Utility for generating smart follow-up prompts and related exploration topics
 * based on user query, retrieved document chunks, and AI synthesis.
 */

function cleanQueryText(text) {
  if (!text) return ''
  return text
    .replace(/[-–—]/g, ' ')
    .replace(/[^\w\s]/g, '')
    .replace(/\b(in|on|at|for|to|of|by|with|about|the|a|an)\s*$/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// Generate fast, immediate local suggestions derived from retrieved chunks & headings
export const getLocalSuggestedPrompts = (query, results = [], ragAnswer = '') => {
  const suggestions = new Set()
  const cleanQuery = cleanQueryText(query)

  // 1. Extract headings or bolded terms from ragAnswer for dynamic topic drill-downs
  if (ragAnswer) {
    const headings = [...ragAnswer.matchAll(/^###?\s+([^#\n]+)/gm)].map(m => m[1].trim())
    for (const h of headings) {
      if (h && h.length < 50 && !h.toLowerCase().includes('summary') && !h.toLowerCase().includes('conclusion')) {
        suggestions.add(`Tell me more about: ${h}`)
        if (suggestions.size >= 2) break
      }
    }

    if (suggestions.size < 3) {
      const boldTerms = [...ragAnswer.matchAll(/\*\*([^*]{3,40})\*\*/g)].map(m => m[1].trim())
      for (const term of boldTerms) {
        if (term.length > 3 && term.toLowerCase() !== cleanQuery.toLowerCase() && !cleanQuery.toLowerCase().includes(term.toLowerCase())) {
          suggestions.add(`How does this relate to ${term}?`)
          if (suggestions.size >= 2) break
        }
      }
    }
  }

  // 2. Derive suggestions from document chunk titles
  if (suggestions.size < 3 && results && results.length > 0) {
    const topDoc = results[0]?.title || ''
    if (topDoc && topDoc !== 'Document' && !topDoc.includes('Untitled')) {
      const cleanTitle = topDoc.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')
      suggestions.add(`Summarize the key points from "${cleanTitle}"`)
      if (suggestions.size < 3 && results.length > 1 && results[1]?.title) {
        const doc2 = results[1].title.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')
        suggestions.add(`Compare "${cleanTitle}" with "${doc2}"`)
      }
    }
  }

  // 3. Fallback / supplementary analytical prompts
  if (cleanQuery && suggestions.size < 3) {
    suggestions.add(`What are the practical applications of ${cleanQuery}?`)
  }
  if (cleanQuery && suggestions.size < 3) {
    suggestions.add(`Give a step-by-step example for ${cleanQuery}`)
  }
  if (cleanQuery && suggestions.size < 3) {
    suggestions.add(`What are the best practices for ${cleanQuery}?`)
  }

  return Array.from(suggestions).slice(0, 3)
}
