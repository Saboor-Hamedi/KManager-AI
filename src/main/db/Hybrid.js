import embeddingService from './embeddings.js'

/**
 * Performs a hybrid search by converting the query to a vector using the local AI model,
 * and passing both the raw text (for BM25/FTS) and the vector (for Semantic Search) 
 * to the PostgreSQL search_chunks function to perform Reciprocal Rank Fusion.
 */
export async function performHybridSearch(db, queryText, limit = 10) {
  if (!db || !db.isConnected()) {
    throw new Error('Database not connected')
  }
  if (!queryText || queryText.trim() === '') {
    return []
  }

  // 1. Generate embedding for the query using the local transformers.js model
  const vectorArray = await embeddingService.embedQuery(queryText)
  
  // 2. Format as Postgres pgvector string: '[0.1, 0.2, ...]'
  const vectorString = '[' + vectorArray.join(',') + ']'
  
  // 3. Execute the Hybrid Search SQL function
  const res = await db.query('SELECT * FROM search_chunks($1, $2::vector, $3)', [queryText, vectorString, limit])
  
  return res.rows
}
