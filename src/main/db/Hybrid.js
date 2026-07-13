import embeddingService from './embeddings.js'

/**
 * Expand a short or potentially typo'd query into a richer search phrase.
 * This dramatically improves recall for short (< 5 char) or partial queries.
 *
 * Strategy:
 * - Short prefix: embed the original AND generate a padded version to pull context
 * - The SQL fuzzy leg handles character-level similarity; the expanded query
 *   helps the semantic embedding land closer to real concepts.
 */
function expandQuery(queryText) {
  const q = queryText.trim()
  // Already a proper phrase — no expansion needed
  if (q.length >= 6 || q.includes(' ')) return q

  // For very short tokens (typos / prefixes like "rus"), append a wildcard hint.
  // This biases the embedding toward the concept rather than treating it as an acronym.
  return `${q} (related topic or concept)`
}

/**
 * Performs a smart hybrid search:
 *   1. Semantic (pgvector) — meaning-based, uses expanded query for better embedding
 *   2. FTS keyword — exact token matching (uses original query)
 *   3. Trigram fuzzy (pg_trgm word_similarity) — typo & prefix tolerance
 *   4. Pure-semantic fallback — if all legs return 0 results, always return
 *      the top-K nearest neighbours by raw cosine similarity, so the user
 *      never sees "No results" on a non-empty query.
 */
export async function performHybridSearch(db, queryText, limit = 10) {
  if (!db || !db.isConnected()) {
    throw new Error('Database not connected')
  }
  if (!queryText || queryText.trim() === '') {
    return []
  }

  const originalQuery = queryText.trim()
  const expandedQuery = expandQuery(originalQuery)

  // Embed the EXPANDED query for better semantic recall on short/typo inputs
  const vectorArray = await embeddingService.embedQuery(expandedQuery)
  const vectorString = '[' + vectorArray.join(',') + ']'

  // 1. Run the full 3-leg hybrid search (semantic + FTS + fuzzy)
  const res = await db.query(
    'SELECT * FROM search_chunks($1, $2::vector, $3)',
    [originalQuery, vectorString, limit]
  )

  if (res.rows.length > 0) {
    return { rows: res.rows, isFallback: false }
  }

  // 2. FALLBACK: If all 3 legs returned nothing (edge case: very short / unknown query),
  //    do a pure nearest-neighbour semantic search with no threshold so we ALWAYS
  //    return something meaningful rather than an empty page.
  const fallback = await db.query(
    `SELECT
       dc.id, dc.document_id, dc.chunk_index, dc.content,
       d.vault_path, d.file_name, d.file_type,
       (1 - (dc.embedding <=> $1::vector))::FLOAT AS similarity
     FROM embedding_documents dc
     JOIN documents d ON d.id = dc.document_id
     WHERE dc.embedding IS NOT NULL
     ORDER BY dc.embedding <=> $1::vector
     LIMIT $2`,
    [vectorString, limit]
  )

  return { rows: fallback.rows, isFallback: true }
}
