import embeddingService from './embeddings.js'
import hybridSearchService from '../services/hybridSearch.js'





/**
 * Performs smart hybrid search combining Vector Similarity + BM25 + Reciprocal Rank Fusion (RRF).
 */
export async function performHybridSearch(db, queryText, limit = 10) {
  return await hybridSearchService.performHybridSearchService(db, embeddingService, queryText, limit)
}
