import type { Migration } from './index';

export const migration024: Migration = {
  version: 24,
  up: [
    `ALTER TABLE profile_change_proposals ADD COLUMN target_branch_updated_at INTEGER`,
    `CREATE INDEX IF NOT EXISTS idx_profile_change_proposals_target_branch_revision ON profile_change_proposals(target_branch_id, target_branch_updated_at)`,
  ],
};
