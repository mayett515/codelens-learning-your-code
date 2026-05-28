import type { Migration } from './index';

export const migration021: Migration = {
  version: 21,
  up: [
    `CREATE INDEX IF NOT EXISTS idx_ontology_correction_evidence_profile_created ON ontology_correction_evidence(profile_id, created_at DESC, id DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_profile_proposal_events_base_profile_created ON profile_proposal_events(base_profile_id, created_at DESC, id DESC)`,
  ],
};
