import type { Migration } from './index';

export const migration006: Migration = {
  version: 6,
  up: [
    `CREATE TABLE IF NOT EXISTS promotion_suggestions_cache (
      cluster_fingerprint TEXT PRIMARY KEY,
      capture_ids_json TEXT NOT NULL,
      proposed_name TEXT NOT NULL,
      proposed_normalized_key TEXT NOT NULL,
      proposed_concept_type TEXT NOT NULL,
      shared_keywords_json TEXT NOT NULL,
      session_count INTEGER NOT NULL,
      capture_count INTEGER NOT NULL,
      mean_similarity REAL NOT NULL,
      avg_extraction_confidence REAL NOT NULL,
      cluster_score REAL NOT NULL,
      max_capture_created_at INTEGER NOT NULL DEFAULT 0,
      computed_at INTEGER NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_promotion_cache_score ON promotion_suggestions_cache(cluster_score DESC)`,
    `CREATE TABLE IF NOT EXISTS promotion_dismissals (
      cluster_fingerprint TEXT PRIMARY KEY,
      dismissed_at INTEGER NOT NULL,
      capture_ids_json TEXT NOT NULL,
      capture_count INTEGER NOT NULL,
      is_permanent INTEGER NOT NULL DEFAULT 0,
      proposed_normalized_key TEXT NOT NULL DEFAULT ''
    )`,
    `CREATE INDEX IF NOT EXISTS idx_promotion_dismissals_at ON promotion_dismissals(dismissed_at DESC)`,
  ],
};
