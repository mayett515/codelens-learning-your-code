/// <reference types="node" />
import { describe, expect, it } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { migration015 } from '../015-ontology-correction-evidence';
import { migration017 } from '../017-ontology-correction-raw-proposed-type';

describe('Migration 017 - ontology correction raw proposed type', () => {
  const sql = migration017.up.join('\n');

  it('adds a raw proposed type column without changing evidence command boundaries', () => {
    expect(sql).toContain('ALTER TABLE ontology_correction_evidence ADD COLUMN raw_proposed_type_node_id TEXT');
    expect(sql).not.toContain('target_layer');
    expect(sql).not.toContain('apply_to_branch');
    expect(migration017.version).toBe(17);
    expect(migration017).not.toHaveProperty('nonTransactional');
  });

  it('executes after migration 015 and preserves raw model output separately', () => {
    const db = new DatabaseSync(':memory:');
    for (const stmt of migration015.up) db.exec(stmt);
    for (const stmt of migration017.up) db.exec(stmt);

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
        reason,
        source,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'ev-1',
      'coding',
      '{"baseProfileId":"coding"}',
      'capture',
      'capture-1',
      'typeNodeId',
      'mental_model',
      'pattern',
      'hallucinated_runtime_kind',
      'User corrected model output',
      'user',
      1,
    );

    const row = db.prepare(`
      SELECT previous_type_node_id, corrected_type_node_id, raw_proposed_type_node_id
      FROM ontology_correction_evidence
      WHERE id = ?
    `).get('ev-1') as {
      previous_type_node_id: string;
      corrected_type_node_id: string;
      raw_proposed_type_node_id: string;
    };

    expect(row).toEqual({
      previous_type_node_id: 'mental_model',
      corrected_type_node_id: 'pattern',
      raw_proposed_type_node_id: 'hallucinated_runtime_kind',
    });
  });
});
