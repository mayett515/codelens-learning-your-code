import type { Migration } from './index';

export const migration018: Migration = {
  version: 18,
  up: [
    `CREATE TABLE IF NOT EXISTS profile_trust_settings (
      id TEXT PRIMARY KEY,
      scope_key TEXT NOT NULL UNIQUE,
      base_profile_id TEXT NOT NULL,
      target_kind TEXT NOT NULL CHECK(target_kind IN ('base_profile','profile_branch')),
      target_profile_id TEXT,
      target_branch_id TEXT,
      trust_mode TEXT NOT NULL CHECK(trust_mode IN ('manual_only','suggest_first','trusted_low_risk_auto','adaptive')),
      auto_apply_enabled INTEGER NOT NULL CHECK(auto_apply_enabled IN (0,1)),
      max_auto_apply_risk_score REAL NOT NULL CHECK(max_auto_apply_risk_score >= 0 AND max_auto_apply_risk_score <= 100),
      auto_apply_proposal_kinds_json TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      CHECK(
        (target_kind = 'base_profile' AND target_profile_id IS NOT NULL AND target_branch_id IS NULL)
        OR
        (target_kind = 'profile_branch' AND target_branch_id IS NOT NULL AND target_profile_id IS NULL)
      ),
      CHECK(target_kind != 'base_profile' OR auto_apply_enabled = 0),
      CHECK(auto_apply_enabled = 0 OR trust_mode IN ('trusted_low_risk_auto','adaptive')),
      CHECK(auto_apply_enabled = 1 OR max_auto_apply_risk_score = 0)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_profile_trust_settings_base_profile ON profile_trust_settings(base_profile_id)`,
    `CREATE INDEX IF NOT EXISTS idx_profile_trust_settings_target_branch ON profile_trust_settings(target_branch_id)`,
    `CREATE INDEX IF NOT EXISTS idx_profile_trust_settings_mode ON profile_trust_settings(trust_mode)`,
    `CREATE INDEX IF NOT EXISTS idx_profile_trust_settings_updated ON profile_trust_settings(updated_at)`,
  ],
};
