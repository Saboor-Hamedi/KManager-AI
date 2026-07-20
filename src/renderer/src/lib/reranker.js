/**
 * Lightweight Local Semantic & Exact-Overlap Re-Ranker (`reranker.js`)
 * Re-orders retrieved database chunks by evaluating exact multi-word phrase overlap,
 * token density, information density, and Maximal Marginal Relevance (MMR) diversity.
 *
 * Designed to take the top 15–20 candidates from Hybrid RAG Search (`db.search`) and
 * distill them down to the top 3–5 hyper-relevant, non-redundant chunks before passing
 * context to DeepSeek, ensuring zero hallucination and maximum signal-to-noise ratio.
 */

/**
 * Compute n-grams from an array of tokens.
 */
function getNGrams(tokens, n = 2) {
  const ngrams = new Set()
  for (let i = 0; i <= tokens.length - n; i++) {
    ngrams.add(tokens.slice(i, i + n).join(' '))
  }
  return ngrams
}

/**
 * Calculate Jaccard similarity between two sets or string token lists for redundancy filtering.
 */
function computeJaccardSimilarity(textA = '', textB = '') {
  const setA = new Set(textA.toLowerCase().split(/\W+/).filter(t => t.length > 2))
  const setB = new Set(textB.toLowerCase().split(/\W+/).filter(t => t.length > 2))
  if (setA.size === 0 || setB.size === 0) return 0

  let intersection = 0
  for (const item of setA) {
    if (setB.has(item)) intersection++
  }
  const union = setA.size + setB.size - intersection
  return union === 0 ? 0 : intersection / union
}

/**
 * Evaluate exact phrase match, n-gram overlap, query token density, and information quality.
 */
export function evaluateChunkRelevance(queryText = '', chunk = {}) {
  const query = queryText.trim().toLowerCase()
  const content = (chunk.content || '').trim()
  const contentLower = content.toLowerCase()
  if (!query || !content) return 0

  let score = 0

  // 1. Exact Phrase Match Bonus (+0.35)
  // If the user's exact multi-word search phrase appears verbatim inside the chunk
  if (query.length > 3 && contentLower.includes(query)) {
    score += 0.35
  }

  // 2. Token & N-Gram Overlap Bonus (+0.00 to +0.25)
  const qTokens = query.split(/\W+/).filter(t => t.length > 1)
  const cTokens = contentLower.split(/\W+/).filter(t => t.length > 1)
  const cTokenSet = new Set(cTokens)

  if (qTokens.length > 0) {
    let matchedCount = 0
    for (const qt of qTokens) {
      if (cTokenSet.has(qt)) matchedCount++
    }
    const tokenRatio = matchedCount / qTokens.length
    score += tokenRatio * 0.20

    // Check bigram / trigram overlap for multi-word queries
    if (qTokens.length >= 2) {
      const qBigrams = getNGrams(qTokens, 2)
      const cBigrams = getNGrams(cTokens, 2)
      let matchedBigrams = 0
      for (const bg of qBigrams) {
        if (cBigrams.has(bg)) matchedBigrams++
      }
      if (qBigrams.size > 0) {
        score += (matchedBigrams / qBigrams.size) * 0.15
      }
    }
  }

  // 3. Information Density & Structure Score (+0.00 to +0.15)
  // Reward chunks that contain substantive data (numbers, metrics, bullet points, headers, or structured sentences)
  // over short fragments or boilerplate
  const charLength = content.length
  if (charLength >= 120 && charLength <= 1800) {
    score += 0.08 // Optimal context window size
  } else if (charLength < 60) {
    score -= 0.10 // Penalize tiny snippets with minimal context
  }

  // Reward structural markers (bullet lists, markdown headers, numbers/percentages, citations)
  if (/[0-9]+%|[0-9]+\.[0-9]+|\b(table|figure|p-value|eqtl|plddt|rs[0-9]+|biomarker|score)\b/i.test(content)) {
    score += 0.07
  }

  // 4. Base Hybrid/Cosine Similarity weighting (+0.00 to +0.40)
  // Preserve the underlying semantic vector & BM25 rank score calculated by our database hybrid search
  const baseSim = chunk.similarity !== undefined ? chunk.similarity : (chunk.cosine_similarity || 0)
  score += Math.min(1.0, baseSim) * 0.40

  // 5. Table of Contents / Dot-Leader Contamination Penalty (-0.60)
  // Penalize Table of Contents or index pages full of dot leaders (. . . . . or .....)
  // unless the query explicitly asks for a table of contents or index
  const isAskingForToc = /\b(table of contents|toc|index|contents|chapters)\b/i.test(query)
  const dotLeaderMatches = content.match(/\.\s*\.\s*\.\s*\.\s*\./g) || []
  if (!isAskingForToc && (dotLeaderMatches.length >= 2 || /\.\s*\d+\s*$/m.test(content))) {
    if (dotLeaderMatches.length >= 3 || (content.match(/\.\s*\d+\s*/g) || []).length >= 3) {
      score -= 0.60
    } else {
      score -= 0.30
    }
  }

  return Math.min(1.0, Math.max(0.0, score))
}

/**
 * Re-rank and prune candidate chunks using scoring + Maximal Marginal Relevance (MMR) diversity.
 * Prevents returning 4 nearly identical chunks to the AI prompt by penalizing redundancy.
 *
 * @param {string} queryText - User search query
 * @param {Array} chunks - Array of retrieved chunk objects from database
 * @param {Object} options - { topK: 5, mmrLambda: 0.75, minScoreThreshold: 0.18 }
 * @returns {Array} Re-ranked and deduplicated hyper-relevant topK chunks
 */
export function rerankChunks(queryText, chunks = [], options = {}) {
  const topK = options.topK || 5
  const mmrLambda = options.mmrLambda !== undefined ? options.mmrLambda : 0.75
  const minScoreThreshold = options.minScoreThreshold !== undefined ? options.minScoreThreshold : 0.18

  if (!chunks || chunks.length === 0) return []
  if (chunks.length <= 2) return chunks

  // Calculate individual relevance scores for all candidates
  const scoredChunks = chunks.map(chunk => {
    const rerankScore = evaluateChunkRelevance(queryText, chunk)
    return {
      ...chunk,
      rerankScore,
      // Calibrate similarity badge to the refined rerank score if it improved precision
      similarity: Math.max(chunk.similarity || 0, Math.min(1.0, rerankScore))
    }
  }).filter(c => c.rerankScore >= minScoreThreshold).sort((a, b) => b.rerankScore - a.rerankScore)

  // Apply MMR (Maximal Marginal Relevance) selection to select topK while filtering out duplicates
  const selected = []
  const candidates = [...scoredChunks]

  // Pick the highest scoring chunk first
  if (candidates.length > 0) {
    selected.push(candidates.shift())
  }

  while (selected.length < topK && candidates.length > 0) {
    let bestIdx = -1
    let bestMmrScore = -Infinity

    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i]
      const relScore = candidate.rerankScore || 0

      // Compute max similarity between this candidate and any already selected chunk
      let maxSimToSelected = 0
      for (const sel of selected) {
        const sim = computeJaccardSimilarity(candidate.content || '', sel.content || '')
        if (sim > maxSimToSelected) maxSimToSelected = sim
      }

      // If this candidate is almost identical (>82% Jaccard similarity) to an already picked chunk, skip/penalize heavily
      if (maxSimToSelected > 0.82) continue

      // MMR formula: lambda * Relevance - (1 - lambda) * Redundancy
      const mmrScore = (mmrLambda * relScore) - ((1 - mmrLambda) * maxSimToSelected)
      if (mmrScore > bestMmrScore) {
        bestMmrScore = mmrScore
        bestIdx = i
      }
    }

    if (bestIdx !== -1) {
      selected.push(candidates[bestIdx])
      candidates.splice(bestIdx, 1)
    } else {
      // If remaining candidates were too redundant, pick the top remaining one if needed to fill topK
      if (candidates.length > 0 && selected.length < Math.min(topK, scoredChunks.length)) {
        selected.push(candidates.shift())
      } else {
        break
      }
    }
  }

  return selected
}

export default {
  evaluateChunkRelevance,
  rerankChunks
}
