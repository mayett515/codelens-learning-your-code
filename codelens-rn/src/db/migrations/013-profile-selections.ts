import type { Migration } from './index';

export const migration013: Migration = {
  version: 13,
  up: [
    `CREATE TABLE IF NOT EXISTS profile_selections (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      base_profile_id TEXT NOT NULL,
      project_branch_ids_json TEXT NOT NULL DEFAULT '[]',
      learning_branch_ids_json TEXT NOT NULL DEFAULT '[]',
      personal_branch_ids_json TEXT NOT NULL DEFAULT '[]',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS unique_profile_selections_project ON profile_selections(project_id)`,
    `CREATE INDEX IF NOT EXISTS idx_profile_selections_base_profile ON profile_selections(base_profile_id)`,
    `CREATE INDEX IF NOT EXISTS idx_profile_selections_updated ON profile_selections(updated_at)`,
  ],
};
