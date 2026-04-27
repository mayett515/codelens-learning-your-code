import type { Migration } from './index';

export const migration008: Migration = {
  version: 8,
  up: [
    `CREATE TABLE IF NOT EXISTS review_events (
      id TEXT PRIMARY KEY,
      concept_id TEXT NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
      rating TEXT NOT NULL CHECK (rating IN ('strong', 'partial', 'weak')),
      delta REAL NOT NULL,
      familiarity_before REAL NOT NULL,
      familiarity_after REAL NOT NULL,
      user_recall_text TEXT,
      created_at INTEGER NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_review_events_concept ON review_events(concept_id)`,
    `CREATE INDEX IF NOT EXISTS idx_review_events_created ON review_events(created_at DESC)`,
  ],
};
