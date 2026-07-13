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
 * Lightweight, in-memory BM25 scorer.
 * Re-ranks the subset of documents returned by PostgreSQL.
 */
function applyBM25ReRanking(queryText, rows) {
  if (!rows || rows.length === 0) return rows;
  
  // 1. Tokenize query (lowercase, split by non-word chars, remove empty/short)
  const qTokens = queryText.toLowerCase().split(/\W+/).filter(t => t.length > 1);
  if (qTokens.length === 0) return rows;

  // 2. Tokenize documents and build stats
  const k1 = 1.2;
  const b = 0.75;
  const N = rows.length;
  let totalLength = 0;
  
  const docTokensList = rows.map(r => {
    const tokens = (r.content || '').toLowerCase().split(/\W+/).filter(t => t.length > 1);
    totalLength += tokens.length;
    
    // Map of token -> count in this doc
    const tf = {};
    for (const t of tokens) {
      tf[t] = (tf[t] || 0) + 1;
    }
    return { tokens, tf, length: tokens.length };
  });
  
  const avgdl = totalLength / N || 1;

  // 3. Document Frequencies for query tokens
  const df = {};
  for (const qt of qTokens) {
    df[qt] = 0;
    for (const doc of docTokensList) {
      if (doc.tf[qt]) df[qt]++;
    }
  }

  // 4. Calculate BM25 for each document
  for (let i = 0; i < N; i++) {
    const doc = docTokensList[i];
    let score = 0;
    for (const qt of qTokens) {
      if (!doc.tf[qt]) continue;
      
      const termFreq = doc.tf[qt];
      const docDf = df[qt];
      
      // Inverse Document Frequency (IDF)
      const idf = Math.log(1 + (N - docDf + 0.5) / (docDf + 0.5));
      
      // Term Frequency component
      const tfComponent = (termFreq * (k1 + 1)) / (termFreq + k1 * (1 - b + b * (doc.length / avgdl)));
      
      score += idf * tfComponent;
    }
    
    // Normalize BM25 score loosely (assume max realistic score for a few terms is ~10-15)
    // We cap at 1.0 just for UI simplicity, but keep original for ranking
    rows[i].bm25Score = score;
    rows[i].bm25Normalized = Math.min(score / 10, 1.0);
    
    // Combine SQL similarity (which includes semantic/fuzzy) with pure BM25
    rows[i].combinedScore = rows[i].similarity + (rows[i].bm25Normalized * 0.5);
  }

  // 5. Sort by combined score descending
  return rows.sort((a, b) => b.combinedScore - a.combinedScore);
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
    const reranked = applyBM25ReRanking(originalQuery, res.rows)
    return { rows: reranked, isFallback: false }
  }

  // 2. FALLBACK: If all 3 legs returned nothing (edge case: very short / unknown query),
  //    do a pure nearest-neighbour semantic search with no threshold so we ALWAYS
  //    return something meaningful rather than an empty page.
  const fallback = await db.query(
    `SELECT
       dc.id, dc.document_id, dc.chunk_index, dc.content,
       d.vault_path, d.file_name, d.file_type, d.created_at,
       (1 - (dc.embedding <=> $1::vector))::FLOAT AS similarity
     FROM embedding_documents dc
     JOIN documents d ON d.id = dc.document_id
     WHERE dc.embedding IS NOT NULL
     ORDER BY dc.embedding <=> $1::vector
     LIMIT $2`,
    [vectorString, limit]
  )

  return { rows: applyBM25ReRanking(originalQuery, fallback.rows), isFallback: true }
}
