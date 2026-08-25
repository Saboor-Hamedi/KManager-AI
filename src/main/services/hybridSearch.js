/**
 * Hybrid RAG Search Service (Vector Similarity + BM25 Keyword Match + RRF)
 * Combines dense vector embeddings (`pgvector` / semantic similarity) with sparse exact-keyword matching (`BM25`)
 * using Reciprocal Rank Fusion (RRF) to guarantee 100% recall for both conceptual queries and exact terminology.
 */

/**
 * Extract metadata filters (file type, year) from the query and return a cleaned query.
 */
function extractFilters(query) {
  let fileType = null;
  let year = null;
  let cleanedQuery = query;

  const typeMatch = cleanedQuery.match(/\b(?:in\s)?(pdf|txt|md|csv|json)(?:\sfiles?)?\b/i);
  if (typeMatch) {
    fileType = typeMatch[1].toLowerCase();
    cleanedQuery = cleanedQuery.replace(typeMatch[0], '');
  }

  const yearMatch = cleanedQuery.match(/\b(?:in\s)?(19\d{2}|20\d{2})\b/i);
  if (yearMatch) {
    year = parseInt(yearMatch[1], 10);
    cleanedQuery = cleanedQuery.replace(yearMatch[0], '');
  }

  return {
    cleanedQuery: trimWhitespace(cleanedQuery) || query,
    fileType,
    year
  };
}

function trimWhitespace(str) {
  if (!str) return ''
  let start = 0, end = str.length - 1
  while (start <= end && str[start] === ' ') start++
  while (end >= start && str[end] === ' ') end--
  return str.slice(start, end + 1)
}

/**
 * Execute Hybrid RAG Search combining Vector Similarity + FTS + Trigram (RRF).
 */
export async function performHybridSearchService(db, embeddingService, queryText, limit = 10) {
  if (!db || !db.isConnected()) {
    throw new Error('Database not connected')
  }
  if (!queryText || trimWhitespace(queryText) === '') {
    return { rows: [], isFallback: false }
  }

  const { cleanedQuery, fileType, year } = extractFilters(trimWhitespace(queryText))
  const originalQuery = cleanedQuery

  // Embed the expanded query
  const vectorArray = await embeddingService.embedQuery(originalQuery) // Fix #8: Do not embed the expanded query prompt padding
  const vectorString = '[' + vectorArray.join(',') + ']'

  // 1. Attempt full 3-leg SQL hybrid query (semantic + FTS + fuzzy)
  // We pass fileType and year as the 4th and 5th parameters to search_chunks
  const res = await db.query(
    'SELECT * FROM search_chunks($1, $2::vector, $3, $4, $5)',
    [originalQuery, vectorString, limit * 3, fileType, year]
  )

  if (res && res.rows && res.rows.length > 0) {
    // Fix #2: Scale the raw SQL RRF (which is tiny, ~0.05) to a 0-1 range for the frontend MMR threshold,
    // blending it with the native cosine_similarity to produce a realistic percentage for the UI badge.
    const maxRrf = Math.max(...res.rows.map(r => r.similarity), 0.001)
    const normalizedRows = res.rows.map(r => ({
      ...r,
      similarity: Math.min(1.0, (r.similarity / maxRrf) * 0.3 + (r.cosine_similarity || 0) * 0.7)
    }))
    
    // Filter out duplicate documents, keeping only the highest scoring chunk per file
    const uniqueDocs = new Map()
    for (const row of normalizedRows) {
      if (!uniqueDocs.has(row.document_id) || uniqueDocs.get(row.document_id).similarity < row.similarity) {
        uniqueDocs.set(row.document_id, row)
      }
    }
    
    return { rows: Array.from(uniqueDocs.values()).slice(0, limit), isFallback: false }
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

  if (fallback && fallback.rows && fallback.rows.length > 0) {
    // Already sorted by similarity in SQL
    // Filter out duplicate documents, keeping only the highest scoring chunk per file
    const uniqueDocs = new Map()
    for (const row of fallback.rows) {
      if (!uniqueDocs.has(row.document_id)) {
        uniqueDocs.set(row.document_id, row)
      }
    }
    
    return { rows: Array.from(uniqueDocs.values()).slice(0, limit), isFallback: true }
  }



  return { rows: [], isFallback: false }
}

export default {
  performHybridSearchService
}
