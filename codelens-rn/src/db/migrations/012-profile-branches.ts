import type { Migration } from './index';

export const migration012: Migration = {
  version: 12,
  up: [
    `CREATE TABLE IF NOT EXISTS profile_branches (
      id TEXT PRIMARY KEY,
      parent_profile_id TEXT NOT NULL,
      branch_kind TEXT NOT NULL CHECK(branch_kind IN ('project','learning','personal')),
      name TEXT NOT NULL,
      overlay_json TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_profile_branches_parent ON profile_branches(parent_profile_id)`,
    `CREATE INDEX IF NOT EXISTS idx_profile_branches_kind ON profile_branches(branch_kind)`,
    `CREATE INDEX IF NOT EXISTS idx_profile_branches_updated ON profile_branches(updated_at)`,
  ],
};
