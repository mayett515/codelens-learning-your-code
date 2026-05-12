/// <reference types="node" />
import { describe, expect, it } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { migration015 } from '../015-ontology-correction-evidence';

describe('Migration 015 - ontology correction evidence', () => {
  const sql = migration015.up.join('\n');

  it('creates an append-only correction evidence table with active selection context', () => {
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS ontology_correction_evidence');
    expect(sql).toContain('profile_id TEXT NOT NULL');
    expect(sql).toContain('active_selection_snapshot_json TEXT NOT NULL');
    expect(sql).toContain("subject_kind TEXT NOT NULL CHECK(subject_kind IN ('capture','item'))");
    expect(sql).toContain("field TEXT NOT NULL CHECK(field IN ('typeNodeId'))");
    expect(sql).toContain("source TEXT NOT NULL CHECK(source IN ('user'))");
    expect(sql).not.toContain('target_layer');
    expect(sql).not.toContain('apply_to_branch');
    expect(sql).not.toContain('patch_suggestion');
  });

  it('adds profile, subject, and created-at lookup indexes', () => {
    expect(sql).toContain('idx_ontology_correction_evidence_profile');
    expect(sql).toContain('idx_ontology_correction_evidence_subject');
    expect(sql).toContain('idx_ontology_correction_evidence_created');
    expect(migration015.version).toBe(15);
    expect(migration015).not.toHaveProperty('nonTransactional');
  });

  it('executes against sqlite and enforces v1 enum boundaries', () => {
    const db = new DatabaseSync(':memory:');
    for (const stmt of migration015.up) db.exec(stmt);

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
        reason,
        source,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'ev-1',
      'coding',
      '{"baseProfileId":"coding","projectBranchIds":["project-1"]}',
      'item',
      'concept-1',
      'typeNodeId',
      'mechanism',
      'pattern',
      'Reviewed by user',
      'user',
      1,
    );

    const row = db.prepare('SELECT profile_id, active_selection_snapshot_json FROM ontology_correction_evidence WHERE id = ?')
      .get('ev-1') as { profile_id: string; active_selection_snapshot_json: string };
    expect(row.profile_id).toBe('coding');
    expect(JSON.parse(row.active_selection_snapshot_json)).toEqual({
      baseProfileId: 'coding',
      projectBranchIds: ['project-1'],
    });

    expect(() => db.prepare(`
      INSERT INTO ontology_correction_evidence (
        id,
        profile_id,
        active_selection_snapshot_json,
        subject_kind,
        subject_id,
        field,
        previous_type_node_id,
        corrected_type_node_id,
        reason,
        source,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'ev-2',
      'coding',
      '{"baseProfileId":"coding"}',
      'branch',
      'concept-1',
      'targetLayerId',
      'mechanism',
      'pattern',
      null,
      'model',
      1,
    )).toThrow();
  });
});
