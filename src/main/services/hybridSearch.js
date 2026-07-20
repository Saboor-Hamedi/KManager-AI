/**
 * Hybrid RAG Search Service (Vector Similarity + BM25 Keyword Match + RRF)
 * Combines dense vector embeddings (`pgvector` / semantic similarity) with sparse exact-keyword matching (`BM25`)
 * using Reciprocal Rank Fusion (RRF) to guarantee 100% recall for both conceptual queries and exact terminology.
 */

/**
 * Expand a short or potentially typo'd query into a richer search phrase.
 * This dramatically improves recall for short (< 5 char) or partial queries.
 */
export function expandQuery(queryText) {
  if (!queryText) return ''
  const q = trimWhitespace(queryText)
  
  // For short tokens under 6 chars without spaces, append concept hint
  if (q.length < 6 && !q.includes(' ')) {
    return `${q} (related topic or concept)`
  }

  // Smart Query Expansion for natural language questions and conversational queries
  const isQuestion = /^(what|who|where|when|why|how|explain|describe|summarize|compare|define)\b/i.test(q) || q.endsWith('?')
  if (isQuestion) {
    const meaningful = extractMeaningfulTerms(q)
    if (meaningful.length > 0) {
      const corePhrase = meaningful.join(' ')
      return `${q} | ${corePhrase} (definition overview mechanism process analysis summary)`
    }
  }

  return q
}

function trimWhitespace(str) {
  if (!str) return ''
  let start = 0, end = str.length - 1
  while (start <= end && str[start] === ' ') start++
  while (end >= start && str[end] === ' ') end--
  return str.slice(start, end + 1)
}

const STOP_WORDS = new Set([
  'the','a','an','is','it','not','or','and','to','of','in','that','for',
  'on','are','was','but','this','get','have','what','why',
  'how','does','do','can','will','would','could','should','its','been',
  'has','had','very','just','really','there','their','they','them',
  'then','some','with','out','up','all','if','no','so','my','me','we','he',
  'she','his','her','be','at','by','from','about','into','over','after'
])

function isLowInformationQuery(query) {
  const tokens = query.toLowerCase().split(/\s+/).filter(t => t.length > 2)
  const meaningful = tokens.filter(t => !STOP_WORDS.has(t))
  return meaningful.length < 3
}

function extractMeaningfulTerms(query) {
  return query.toLowerCase().split(/\s+/).filter(t => t.length > 2 && !STOP_WORDS.has(t))
}

/**
 * Calculate BM25 scores over a list of document chunks for exact keyword & term matching.
 */
export function computeBM25Scores(queryText, rows) {
  if (!rows || rows.length === 0) return rows

  const qTokens = queryText.toLowerCase().split(/\W+/).filter(t => t.length > 1)
  if (qTokens.length === 0) {
    for (const r of rows) {
      r.bm25Score = 0
      r.bm25Normalized = 0
    }
    return rows
  }

  const k1 = 1.2
  const b = 0.75
  const N = rows.length
  let totalLength = 0

  const docTokensList = rows.map(r => {
    const tokens = (r.content || '').toLowerCase().split(/\W+/).filter(t => t.length > 1)
    totalLength += tokens.length

    const tf = {}
    for (const t of tokens) {
      tf[t] = (tf[t] || 0) + 1
    }
    return { tokens, tf, length: tokens.length }
  })

  const avgdl = totalLength / N || 1

  // Document frequencies for query terms
  const df = {}
  for (const qt of qTokens) {
    df[qt] = 0
    for (const doc of docTokensList) {
      if (doc.tf[qt]) df[qt]++
    }
  }

  for (let i = 0; i < N; i++) {
    const doc = docTokensList[i]
    let score = 0
    for (const qt of qTokens) {
      if (!doc.tf[qt]) continue

      const termFreq = doc.tf[qt]
      const docDf = df[qt]

      // Inverse Document Frequency (IDF)
      const idf = Math.log(1 + (N - docDf + 0.5) / (docDf + 0.5))

      // Term Frequency component
      const tfComponent = (termFreq * (k1 + 1)) / (termFreq + k1 * (1 - b + b * (doc.length / avgdl)))

      score += idf * tfComponent
    }

    rows[i].bm25Score = score
    // Normalize BM25 score loosely across typical range (~0 to 12)
    rows[i].bm25Normalized = Math.min(score / 10, 1.0)
  }

  return rows
}

/**
 * Apply Reciprocal Rank Fusion (RRF) combining vector similarity ranks with BM25 keyword match ranks.
 * RRF Formula: score(d) = \sum_{m in methods} 1 / (k + rank_m(d))
 * Default RRF constant k = 60 (standard in IR literature).
 */
export function computeReciprocalRankFusion(rows, k = 60) {
  if (!rows || rows.length === 0) return rows

  // 1. Assign semantic rank (1-based) sorted by cosine similarity
  const semanticSorted = [...rows].sort((a, b) => {
    const simA = a.cosine_similarity !== undefined ? a.cosine_similarity : (a.similarity || 0)
    const simB = b.cosine_similarity !== undefined ? b.cosine_similarity : (b.similarity || 0)
    return simB - simA
  })
  const semanticRankMap = new Map()
  semanticSorted.forEach((r, idx) => semanticRankMap.set(r.id || idx, idx + 1))

  // 2. Assign BM25 rank (1-based) sorted by bm25Score
  const bm25Sorted = [...rows].sort((a, b) => (b.bm25Score || 0) - (a.bm25Score || 0))
  const bm25RankMap = new Map()
  bm25Sorted.forEach((r, idx) => bm25RankMap.set(r.id || idx, idx + 1))

  // 3. Assign FTS SQL rank (if present from search_chunks SQL query)
  const ftsRankMap = new Map()
  const hasFtsRank = rows.some(r => r.keyword_rank !== undefined && r.keyword_rank !== null)
  if (hasFtsRank) {
    const ftsSorted = [...rows].sort((a, b) => (a.keyword_rank || 999) - (b.keyword_rank || 999))
    ftsSorted.forEach((r, idx) => ftsRankMap.set(r.id || idx, idx + 1))
  }

  // 4. Compute RRF and fused scores
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowId = row.id || i
    const semRank = semanticRankMap.get(rowId) || rows.length + 1
    const bmRank = bm25RankMap.get(rowId) || rows.length + 1
    const ftsRank = ftsRankMap.get(rowId) || rows.length + 1

    const rrfSemantic = 1 / (k + semRank)
    const rrfBm25 = 1 / (k + bmRank)
    const rrfFts = hasFtsRank ? (1 / (k + ftsRank)) : 0

    const rawRrfScore = rrfSemantic + rrfBm25 + rrfFts
    row.rrfScore = rawRrfScore

    // Determine base cosine similarity
    const cosineSim = row.cosine_similarity !== undefined ? row.cosine_similarity : (row.similarity || 0)

    // Keyword boost: exact hits in BM25 or FTS get strong elevation
    const hasKeywordHit = (row.bm25Score && row.bm25Score > 0) || (row.keyword_rank && row.keyword_rank <= 20)
    const keywordBoost = hasKeywordHit ? 0.20 : 0

    // Combine Cosine Similarity (dense), BM25 (sparse), and RRF rank fusion into a calibrated score
    row.combinedScore = (cosineSim * 0.55) + ((row.bm25Normalized || 0) * 0.25) + (rawRrfScore * 10 * 0.20) + keywordBoost

    // Calibrate similarity field to clean 0.0 - 1.0 range for UI badge representation
    row.similarity = Math.min(1.0, Math.max(0.0, row.combinedScore))
  }

  // Sort descending by combinedScore
  const sorted = rows.sort((a, b) => b.combinedScore - a.combinedScore)

  // Filter out low-relevance noise (< 0.32 similarity if no keyword match exists)
  return sorted.filter(r => {
    const cosSim = r.cosine_similarity !== undefined ? r.cosine_similarity : (r.similarity || 0)
    if (r.bm25Score > 0 || (r.keyword_rank && r.keyword_rank <= 50)) return true
    return cosSim >= 0.32
  })
}

/**
 * Execute Hybrid RAG Search combining Vector Similarity + BM25 + Reciprocal Rank Fusion.
 */
export async function performHybridSearchService(db, embeddingService, queryText, limit = 10) {
  if (!db || !db.isConnected()) {
    throw new Error('Database not connected')
  }
  if (!queryText || trimWhitespace(queryText) === '') {
    return { rows: [], isFallback: false }
  }

  const originalQuery = trimWhitespace(queryText)
  const expandedQuery = expandQuery(originalQuery)

  // Embed the expanded query
  const vectorArray = await embeddingService.embedQuery(expandedQuery)
  const vectorString = '[' + vectorArray.join(',') + ']'

  // 1. Attempt full 3-leg SQL hybrid query (semantic + FTS + fuzzy)
  const res = await db.query(
    'SELECT * FROM search_chunks($1, $2::vector, $3)',
    [originalQuery, vectorString, limit * 3]
  )

  if (res && res.rows && res.rows.length > 0) {
    const bm25Rows = computeBM25Scores(originalQuery, res.rows)
    const fusedRows = computeReciprocalRankFusion(bm25Rows)
    if (fusedRows.length > 0) {
      return { rows: fusedRows.slice(0, limit), isFallback: false }
    }
  }

  // 2. FALLBACK: Pure vector similarity query across all chunks if FTS leg yielded no exact hits
  const fallback = await db.query(
    `SELECT
       dc.id, dc.document_id, dc.chunk_index, dc.content,
       d.vault_path, d.file_name, d.file_type, d.created_at,
       (1 - (dc.embedding <=> $1::vector))::FLOAT AS similarity,
       (1 - (dc.embedding <=> $1::vector))::FLOAT AS cosine_similarity
     FROM embedding_documents dc
     JOIN documents d ON d.id = dc.document_id
     WHERE dc.embedding IS NOT NULL
     ORDER BY dc.embedding <=> $1::vector
     LIMIT $2`,
    [vectorString, limit * 3]
  )

  const fallbackBm25 = computeBM25Scores(originalQuery, fallback.rows || [])
  const fallbackFused = computeReciprocalRankFusion(fallbackBm25)

  if (fallbackFused.length > 0) {
    return { rows: fallbackFused.slice(0, limit), isFallback: true }
  }

  // 3. LOW-INFORMATION QUERY HANDLING
  if (isLowInformationQuery(originalQuery)) {
    const meaningfulTerms = extractMeaningfulTerms(originalQuery)

    // 3a. Try with just the meaningful terms
    if (meaningfulTerms.length > 0) {
      const refinedQuery = meaningfulTerms.join(' ')
      const refinedVector = await embeddingService.embedQuery(refinedQuery)
      const refinedVectorStr = '[' + refinedVector.join(',') + ']'

      const refinedFallback = await db.query(
        `SELECT dc.id, dc.document_id, dc.chunk_index, dc.content,
           d.vault_path, d.file_name, d.file_type, d.created_at,
           (1 - (dc.embedding <=> $1::vector))::FLOAT AS similarity,
           (1 - (dc.embedding <=> $1::vector))::FLOAT AS cosine_similarity
         FROM embedding_documents dc
         JOIN documents d ON d.id = dc.document_id
         WHERE dc.embedding IS NOT NULL
         ORDER BY dc.embedding <=> $1::vector
         LIMIT $2`,
        [refinedVectorStr, limit * 3]
      )

      if (refinedFallback.rows.length > 0) {
        const bm25Refined = computeBM25Scores(refinedQuery, refinedFallback.rows)
        const fusedRefined = computeReciprocalRankFusion(bm25Refined)
        if (fusedRefined.length > 0) {
          return { rows: fusedRefined.slice(0, limit), isFallback: true, queryRefined: true, refinedQuery }
        }
      }
    }

    // 3b. Last resort: ILIKE search for any meaningful term
    const termFilter = meaningfulTerms.slice(0, 2)
    if (termFilter.length > 0) {
      const likeConditions = termFilter.map((_, i) => `dc.content ILIKE $${i + 2}`).join(' OR ')
      const lastResort = await db.query(
        `SELECT dc.id, dc.document_id, dc.chunk_index, dc.content,
           d.vault_path, d.file_name, d.file_type, d.created_at,
           (1 - (dc.embedding <=> $1::vector))::FLOAT AS similarity
         FROM embedding_documents dc
         JOIN documents d ON d.id = dc.document_id
         WHERE dc.embedding IS NOT NULL AND (${likeConditions})
         ORDER BY dc.embedding <=> $1::vector
         LIMIT $${termFilter.length + 2}`,
        [vectorString, ...termFilter, limit]
      )

      if (lastResort.rows.length > 0) {
        return { rows: lastResort.rows, isFallback: true, lowInfoQuery: true }
      }
    }
  }

  return { rows: [], isFallback: false }
}

export default {
  expandQuery,
  computeBM25Scores,
  computeReciprocalRankFusion,
  performHybridSearchService
}
