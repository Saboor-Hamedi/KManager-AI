import embeddingService from './embeddings.js'
import hybridSearchService from '../services/hybridSearch.js'

/**
 * Expand a short or potentially typo'd query into a richer search phrase.
 */
export function expandQuery(queryText) {
  return hybridSearchService.expandQuery(queryText)
}

/**
 * Lightweight, in-memory BM25 scorer and RRF rank fusion.
 */
export function applyBM25ReRanking(queryText, rows) {
  const bm25Rows = hybridSearchService.computeBM25Scores(queryText, rows)
  return hybridSearchService.computeReciprocalRankFusion(bm25Rows)
}

/**
 * Performs smart hybrid search combining Vector Similarity + BM25 + Reciprocal Rank Fusion (RRF).
 */
export async function performHybridSearch(db, queryText, limit = 10) {
  return await hybridSearchService.performHybridSearchService(db, embeddingService, queryText, limit)
}
