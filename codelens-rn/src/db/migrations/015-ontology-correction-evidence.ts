import type { Migration } from './index';

export const migration015: Migration = {
  version: 15,
  up: [
    `CREATE TABLE IF NOT EXISTS ontology_correction_evidence (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL,
      active_selection_snapshot_json TEXT NOT NULL,
      subject_kind TEXT NOT NULL CHECK(subject_kind IN ('capture','item')),
      subject_id TEXT NOT NULL,
      field TEXT NOT NULL CHECK(field IN ('typeNodeId')),
      previous_type_node_id TEXT,
      corrected_type_node_id TEXT NOT NULL,
      reason TEXT,
      source TEXT NOT NULL CHECK(source IN ('user')),
      created_at INTEGER NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_ontology_correction_evidence_profile ON ontology_correction_evidence(profile_id)`,
    `CREATE INDEX IF NOT EXISTS idx_ontology_correction_evidence_subject ON ontology_correction_evidence(subject_kind, subject_id)`,
    `CREATE INDEX IF NOT EXISTS idx_ontology_correction_evidence_created ON ontology_correction_evidence(created_at)`,
  ],
};
