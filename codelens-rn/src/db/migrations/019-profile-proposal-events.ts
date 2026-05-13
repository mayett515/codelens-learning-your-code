import type { Migration } from './index';

export const migration019: Migration = {
  version: 19,
  up: [
    `CREATE TABLE IF NOT EXISTS profile_proposal_events (
      id TEXT PRIMARY KEY,
      proposal_id TEXT NOT NULL,
      action TEXT NOT NULL CHECK(action IN ('applied','rejected','postponed','asked_why')),
      actor_kind TEXT NOT NULL CHECK(actor_kind IN ('user','system','model')),
      actor_id TEXT,
      base_profile_id TEXT NOT NULL,
      proposal_kind TEXT NOT NULL CHECK(proposal_kind IN ('classification_patch','ontology_node_patch','relationship_patch','branch_merge','manual_draft')),
      target_kind TEXT NOT NULL CHECK(target_kind IN ('base_profile','profile_branch')),
      target_profile_id TEXT,
      target_branch_id TEXT,
      status_before TEXT NOT NULL CHECK(status_before IN ('pending','accepted','rejected','postponed','superseded')),
      status_after TEXT NOT NULL CHECK(status_after IN ('pending','accepted','rejected','postponed','superseded')),
      proposal_updated_at_before INTEGER NOT NULL,
      proposal_updated_at_after INTEGER NOT NULL,
      branch_updated_at_before INTEGER,
      branch_updated_at_after INTEGER,
      reason TEXT,
      details_json TEXT,
      created_at INTEGER NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_profile_proposal_events_proposal ON profile_proposal_events(proposal_id)`,
    `CREATE INDEX IF NOT EXISTS idx_profile_proposal_events_base_profile ON profile_proposal_events(base_profile_id)`,
    `CREATE INDEX IF NOT EXISTS idx_profile_proposal_events_target_branch ON profile_proposal_events(target_branch_id)`,
    `CREATE INDEX IF NOT EXISTS idx_profile_proposal_events_action ON profile_proposal_events(action)`,
    `CREATE INDEX IF NOT EXISTS idx_profile_proposal_events_created ON profile_proposal_events(created_at)`,
  ],
};
