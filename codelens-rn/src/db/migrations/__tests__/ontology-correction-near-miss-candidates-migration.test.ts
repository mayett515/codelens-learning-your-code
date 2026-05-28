/// <reference types="node" />
import { describe, expect, it } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { migration015 } from '../015-ontology-correction-evidence';
import { migration017 } from '../017-ontology-correction-raw-proposed-type';
import { migration020 } from '../020-ontology-correction-near-miss-candidates';

describe('Migration 020 - ontology correction near-miss candidates', () => {
  const sql = migration020.up.join('\n');

  it('adds an optional near-miss diagnostics snapshot column without command fields', () => {
    expect(sql).toContain('ALTER TABLE ontology_correction_evidence ADD COLUMN near_miss_candidates_json TEXT');
    expect(sql).not.toContain('target_layer');
    expect(sql).not.toContain('apply_to_branch');
    expect(sql).not.toContain('proposal_id');
    expect(migration020.version).toBe(20);
    expect(migration020).not.toHaveProperty('nonTransactional');
  });

  it('executes after prior evidence migrations and stores diagnostic refs as inert JSON', () => {
    const db = new DatabaseSync(':memory:');
    for (const stmt of migration015.up) db.exec(stmt);
    for (const stmt of migration017.up) db.exec(stmt);
    for (const stmt of migration020.up) db.exec(stmt);

    db.prepare(`
      INSERT INTO ontology_correction_evidence (
        id,
        profile_id,
        active_selection_snapshot_json,
        subject_kind,
        subject_id,
        field,
        previous_type_node_id,
        corrected_type_node_id,
        raw_proposed_type_node_id,
        near_miss_candidates_json,
        reason,
        source,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'ev-1',
      'coding',
      '{"baseProfileId":"coding"}',
      'capture',
      'capture-1',
      'typeNodeId',
      'star_trails',
      'long_exposure',
      'coding:star_trails',
      '[{"scopeId":"coding","nodeId":"long_exposure","rank":2,"score":0.69}]',
      'User corrected a near miss',
      'user',
      1,
    );

    const row = db.prepare(`
      SELECT near_miss_candidates_json
      FROM ontology_correction_evidence
      WHERE id = ?
    `).get('ev-1') as { near_miss_candidates_json: string };

    expect(JSON.parse(row.near_miss_candidates_json)).toEqual([
      { scopeId: 'coding', nodeId: 'long_exposure', rank: 2, score: 0.69 },
    ]);
  });
});
