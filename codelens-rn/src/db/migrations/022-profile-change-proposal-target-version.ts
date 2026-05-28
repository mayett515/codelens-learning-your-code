import type { Migration } from './index';

export const migration022: Migration = {
  version: 22,
  up: [
    `ALTER TABLE profile_change_proposals ADD COLUMN target_profile_version INTEGER`,
    `CREATE INDEX IF NOT EXISTS idx_profile_change_proposals_target_profile_version ON profile_change_proposals(target_profile_id, target_profile_version)`,
  ],
};
