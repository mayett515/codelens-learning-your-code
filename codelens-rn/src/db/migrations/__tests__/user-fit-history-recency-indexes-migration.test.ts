/// <reference types="node" />
import { describe, expect, it } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { migration015 } from '../015-ontology-correction-evidence';
import { migration017 } from '../017-ontology-correction-raw-proposed-type';
import { migration019 } from '../019-profile-proposal-events';
import { migration020 } from '../020-ontology-correction-near-miss-candidates';
import { migration021 } from '../021-user-fit-history-recency-indexes';

describe('Migration 021 - user-fit history recency indexes', () => {
  const sql = migration021.up.join('\n');

  it('adds profile plus recency indexes for bounded user-fit history reads', () => {
    expect(sql).toContain(
      'idx_ontology_correction_evidence_profile_created',
    );
    expect(sql).toContain(
      'ontology_correction_evidence(profile_id, created_at DESC, id DESC)',
    );
    expect(sql).toContain(
      'idx_profile_proposal_events_base_profile_created',
    );
    expect(sql).toContain(
      'profile_proposal_events(base_profile_id, created_at DESC, id DESC)',
    );
    expect(migration021.version).toBe(21);
    expect(migration021).not.toHaveProperty('nonTransactional');
  });

  it('executes after correction and proposal event migrations', () => {
    const db = new DatabaseSync(':memory:');
    for (const stmt of migration015.up) db.exec(stmt);
    for (const stmt of migration017.up) db.exec(stmt);
    for (const stmt of migration019.up) db.exec(stmt);
    for (const stmt of migration020.up) db.exec(stmt);
    for (const stmt of migration021.up) db.exec(stmt);
    for (const stmt of migration021.up) db.exec(stmt);

    const indexes = db.prepare(`
      SELECT name, tbl_name, sql
      FROM sqlite_master
      WHERE type = 'index'
        AND name IN (
          'idx_ontology_correction_evidence_profile_created',
          'idx_profile_proposal_events_base_profile_created'
        )
      ORDER BY name
    `).all() as Array<{ name: string; tbl_name: string; sql: string }>;

    expect(indexes).toEqual([
      {
        name: 'idx_ontology_correction_evidence_profile_created',
        tbl_name: 'ontology_correction_evidence',
        sql: 'CREATE INDEX idx_ontology_correction_evidence_profile_created ON ontology_correction_evidence(profile_id, created_at DESC, id DESC)',
      },
      {
        name: 'idx_profile_proposal_events_base_profile_created',
        tbl_name: 'profile_proposal_events',
        sql: 'CREATE INDEX idx_profile_proposal_events_base_profile_created ON profile_proposal_events(base_profile_id, created_at DESC, id DESC)',
      },
    ]);
  });
});
