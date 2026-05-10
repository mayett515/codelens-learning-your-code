import type { Migration } from './index';

export const migration014: Migration = {
  version: 14,
  up: [
    `CREATE TABLE IF NOT EXISTS profile_definitions (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      description TEXT NOT NULL,
      version INTEGER NOT NULL,
      source_kind TEXT NOT NULL CHECK(source_kind IN ('built_in','user','imported','adapter')),
      profile_json TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_profile_definitions_source_kind ON profile_definitions(source_kind)`,
    `CREATE INDEX IF NOT EXISTS idx_profile_definitions_updated ON profile_definitions(updated_at)`,
  ],
};
