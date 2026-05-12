import type { Migration } from './index';

export const migration016: Migration = {
  version: 16,
  up: [
    `CREATE TABLE IF NOT EXISTS profile_change_proposals (
      id TEXT PRIMARY KEY,
      proposal_kind TEXT NOT NULL CHECK(proposal_kind IN ('classification_patch','ontology_node_patch','relationship_patch','branch_merge','manual_draft')),
      source_kind TEXT NOT NULL CHECK(source_kind IN ('checker','model','user','system')),
      base_profile_id TEXT NOT NULL,
      source_branch_id TEXT,
      target_kind TEXT NOT NULL CHECK(target_kind IN ('base_profile','profile_branch')),
      target_profile_id TEXT,
      target_branch_id TEXT,
      evidence_ids_json TEXT NOT NULL,
      patch_json TEXT NOT NULL,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      reason TEXT NOT NULL,
      risk_score REAL NOT NULL CHECK(risk_score >= 0 AND risk_score <= 100),
      semantic_confidence REAL CHECK(semantic_confidence IS NULL OR (semantic_confidence >= 0 AND semantic_confidence <= 1)),
      user_fit_confidence REAL CHECK(user_fit_confidence IS NULL OR (user_fit_confidence >= 0 AND user_fit_confidence <= 1)),
      status TEXT NOT NULL CHECK(status IN ('pending','accepted','rejected','postponed','superseded')),
      superseded_by_proposal_id TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      reviewed_at INTEGER,
      applied_at INTEGER,
      CHECK(
        (target_kind = 'base_profile' AND target_profile_id IS NOT NULL AND target_branch_id IS NULL)
        OR
        (target_kind = 'profile_branch' AND target_branch_id IS NOT NULL AND target_profile_id IS NULL)
      )
    )`,
    `CREATE INDEX IF NOT EXISTS idx_profile_change_proposals_base_profile ON profile_change_proposals(base_profile_id)`,
    `CREATE INDEX IF NOT EXISTS idx_profile_change_proposals_source_branch ON profile_change_proposals(source_branch_id)`,
    `CREATE INDEX IF NOT EXISTS idx_profile_change_proposals_target_branch ON profile_change_proposals(target_branch_id)`,
    `CREATE INDEX IF NOT EXISTS idx_profile_change_proposals_status ON profile_change_proposals(status)`,
    `CREATE INDEX IF NOT EXISTS idx_profile_change_proposals_updated ON profile_change_proposals(updated_at)`,
  ],
};
