-- ============================================================================
-- KnowledgeHub: Document Extraction Pipeline — PostgreSQL Schema
-- ============================================================================
-- Requirements: PostgreSQL 14+ with pgvector extension installed.
--
-- Install pgvector (on the PostgreSQL server, once):
--   CREATE EXTENSION IF NOT EXISTS vector;
--
-- Then run this entire file against your database to create all tables,
-- indexes, and helper functions.
-- ============================================================================

-- ============================================================================
-- EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS vector;      -- pgvector: semantic search
CREATE EXTENSION IF NOT EXISTS pg_trgm;     -- trigram fuzzy search (typo tolerance)
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch; -- levenshtein / soundex helpers

-- ============================================================================
-- TABLE: documents
-- Stores one row per extracted file from the vault.
-- ============================================================================
CREATE TABLE IF NOT EXISTS documents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_path    TEXT NOT NULL,                           -- relative path within vault
  file_name     TEXT NOT NULL,                           -- basename with extension
  file_type     TEXT NOT NULL,                           -- pdf|docx|xlsx|csv|txt|md|json|...
  file_size     BIGINT,                                  -- bytes on disk
  content       TEXT NOT NULL,                           -- full extracted plain text
  metadata      JSONB DEFAULT '{}',                      -- { pageCount, author, sheetNames, ... }
  content_hash  TEXT,                                     -- SHA-256 hex digest for change detection
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(vault_path)
);

-- ============================================================================
-- TABLE: embedding_documents
-- Stores overlapping ~500-token chunks of each document with pgvector
-- embeddings (384 dimensions from paraphrase-multilingual-MiniLM-L12-v2 via Transformers.js).
-- ============================================================================
CREATE TABLE IF NOT EXISTS embedding_documents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id   UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index   INT NOT NULL,                            -- ordinal position in document
  content       TEXT NOT NULL,                            -- chunk plain text (~500 tokens)
  embedding     VECTOR(384),                             -- paraphrase-multilingual-MiniLM-L12-v2 embedding vector
  fts_vector    TSVECTOR GENERATED ALWAYS AS (to_tsvector('simple', content)) STORED,
  token_count   INT,                                     -- actual token count for this chunk
  UNIQUE(document_id, chunk_index)
);

-- ============================================================================
-- TABLE: search_feedback
-- Stores user relevance feedback for pgvector search results to allow
-- future fine-tuning or re-ranking.
-- ============================================================================
CREATE TABLE IF NOT EXISTS search_feedback (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_text    TEXT NOT NULL,
  chunk_id      UUID REFERENCES embedding_documents(id) ON DELETE SET NULL,
  document_id   UUID REFERENCES documents(id) ON DELETE SET NULL,
  score         INT NOT NULL CHECK (score IN (-1, 1)),  -- +1 relevant, -1 irrelevant
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Lookup by type and path
CREATE INDEX IF NOT EXISTS idx_documents_type   ON documents(file_type);
CREATE INDEX IF NOT EXISTS idx_documents_hash   ON documents(content_hash);
CREATE INDEX IF NOT EXISTS idx_documents_updated ON documents(updated_at DESC);

-- Chunk parent lookup
CREATE INDEX IF NOT EXISTS idx_chunks_document   ON embedding_documents(document_id);
CREATE INDEX IF NOT EXISTS idx_chunks_index      ON embedding_documents(document_id, chunk_index);

-- Full text search index
CREATE INDEX IF NOT EXISTS idx_chunks_fts ON embedding_documents USING GIN(fts_vector);

-- Trigram index for fuzzy / typo-tolerant search
CREATE INDEX IF NOT EXISTS idx_chunks_content_trgm ON embedding_documents USING GIN(content gin_trgm_ops);

-- pgvector: IVFFlat index for approximate nearest-neighbour search
-- (lists = 100 is a sensible default for up to ~1M vectors; tune as needed)
CREATE INDEX IF NOT EXISTS idx_chunks_embedding
  ON embedding_documents
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- ============================================================================
-- HELPER: delete_document(vault_path TEXT)
-- Removes a document and its chunks by vault path (handy for cleanup).
-- ============================================================================
CREATE OR REPLACE FUNCTION delete_document_by_path(p_vault_path TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM documents WHERE vault_path = p_vault_path;
END;
$$;

-- ============================================================================
-- HELPER: get_document_stats()
-- Returns summary statistics about extracted documents.
-- ============================================================================
CREATE OR REPLACE FUNCTION get_document_stats()
RETURNS TABLE (
  total_docs     BIGINT,
  total_chunks   BIGINT,
  by_type        JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM documents)::BIGINT AS total_docs,
    (SELECT COUNT(*) FROM embedding_documents)::BIGINT AS total_chunks,
    COALESCE(
      (SELECT jsonb_object_agg(file_type, cnt)
       FROM (SELECT file_type, COUNT(*) AS cnt FROM documents GROUP BY file_type) sub),
      '{}'::JSONB
    ) AS by_type;
END;
$$;

-- ============================================================================
-- ============================================================================
-- HELPER: search_chunks(query_text TEXT, query_embedding VECTOR(384), limit INT)
-- Performs 3-leg Hybrid Search:
--   1. Semantic (pgvector cosine similarity) — meaning-based matching
--   2. Full-Text Search (tsvector) — exact keyword matching
--   3. Trigram fuzzy (pg_trgm word_similarity) — typo & partial word tolerance
-- Results are merged via Reciprocal Rank Fusion (RRF).
-- ============================================================================
DROP FUNCTION IF EXISTS search_chunks(text, vector, integer);

CREATE OR REPLACE FUNCTION search_chunks(
  query_text TEXT,
  query_embedding VECTOR(384),
  result_limit INT DEFAULT 10
)
RETURNS TABLE (
  id            UUID,
  document_id   UUID,
  chunk_index   INT,
  content       TEXT,
  vault_path    TEXT,
  file_name     TEXT,
  file_type     TEXT,
  created_at    TIMESTAMPTZ,
  similarity    FLOAT
)
LANGUAGE plpgsql
AS $func$
BEGIN
  RETURN QUERY
  WITH semantic_search AS (
    SELECT
      dc.id,
      RANK() OVER (ORDER BY dc.embedding <=> query_embedding) AS semantic_rank
    FROM embedding_documents dc
    WHERE dc.embedding IS NOT NULL
    ORDER BY dc.embedding <=> query_embedding
    LIMIT 100
  ),
  keyword_search AS (
    SELECT
      dc.id,
      RANK() OVER (ORDER BY ts_rank_cd(dc.fts_vector, plainto_tsquery('simple', query_text)) DESC) AS keyword_rank
    FROM embedding_documents dc
    WHERE dc.fts_vector @@ plainto_tsquery('simple', query_text)
    ORDER BY ts_rank_cd(dc.fts_vector, plainto_tsquery('simple', query_text)) DESC
    LIMIT 100
  ),
  -- word_similarity catches partial/prefix matches and typos better than similarity()
  -- e.g. "rus" scores 0.75 against "Rust" because "rus" is a word-boundary prefix
  fuzzy_search AS (
    SELECT
      dc.id,
      RANK() OVER (ORDER BY word_similarity(query_text, dc.content) DESC) AS fuzzy_rank
    FROM embedding_documents dc
    WHERE word_similarity(query_text, dc.content) > 0.12
    ORDER BY word_similarity(query_text, dc.content) DESC
    LIMIT 100
  )
  SELECT
    dc.id,
    dc.document_id,
    dc.chunk_index,
    dc.content,
    d.vault_path,
    d.file_name,
    d.file_type,
    d.created_at,
    -- RRF: semantic (1x) + exact keyword (2x) + fuzzy (1.5x)
    (COALESCE(1.0 / (60 + ss.semantic_rank), 0.0) +
     COALESCE(2.0 / (60 + ks.keyword_rank), 0.0) +
     COALESCE(1.5 / (60 + fs.fuzzy_rank),   0.0))::FLOAT AS similarity
  FROM embedding_documents dc
  JOIN documents d ON d.id = dc.document_id
  LEFT JOIN semantic_search ss ON ss.id = dc.id
  LEFT JOIN keyword_search  ks ON ks.id = dc.id
  LEFT JOIN fuzzy_search    fs ON fs.id = dc.id
  WHERE ss.id IS NOT NULL OR ks.id IS NOT NULL OR fs.id IS NOT NULL
  ORDER BY similarity DESC
  LIMIT result_limit;
END;
$func$;
