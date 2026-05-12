/// <reference types="node" />
import { describe, expect, it } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { migration016 } from '../016-profile-change-proposals';

describe('Migration 016 - profile change proposals', () => {
  const sql = migration016.up.join('\n');

  it('creates the unified patch and merge proposal table', () => {
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS profile_change_proposals');
    expect(sql).toContain("proposal_kind TEXT NOT NULL CHECK(proposal_kind IN ('classification_patch','ontology_node_patch','relationship_patch','branch_merge','manual_draft'))");
    expect(sql).toContain('evidence_ids_json TEXT NOT NULL');
    expect(sql).toContain('patch_json TEXT NOT NULL');
    expect(sql).toContain('risk_score REAL NOT NULL CHECK(risk_score >= 0 AND risk_score <= 100)');
    expect(sql).not.toContain('ontology_patch_suggestions');
    expect(sql).not.toContain('profile_merge_proposals');
    expect(sql).not.toContain('composed_profile_json');
  });

  it('adds lookup indexes and remains transactional', () => {
    expect(sql).toContain('idx_profile_change_proposals_base_profile');
    expect(sql).toContain('idx_profile_change_proposals_source_branch');
    expect(sql).toContain('idx_profile_change_proposals_target_branch');
    expect(sql).toContain('idx_profile_change_proposals_status');
    expect(sql).toContain('idx_profile_change_proposals_updated');
    expect(migration016.version).toBe(16);
    expect(migration016).not.toHaveProperty('nonTransactional');
  });

  it('executes against sqlite and enforces risk and target shape checks', () => {
    const db = new DatabaseSync(':memory:');
    for (const stmt of migration016.up) db.exec(stmt);

    const insert = db.prepare(`
      INSERT INTO profile_change_proposals (
        id,
        proposal_kind,
        source_kind,
        base_profile_id,
        source_branch_id,
        target_kind,
        target_profile_id,
        target_branch_id,
        evidence_ids_json,
        patch_json,
        title,
        summary,
        reason,
        risk_score,
        semantic_confidence,
        user_fit_confidence,
        status,
        superseded_by_proposal_id,
        created_at,
        updated_at,
        reviewed_at,
        applied_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insert.run(
      'proposal-1',
      'classification_patch',
      'checker',
      'coding',
      null,
      'profile_branch',
      null,
      'branch-1',
      '["ev-1"]',
      '{"addItemTypeNodeIds":["react_hook"]}',
      'Add React hook type',
      'Suggests a new type',
      'User corrected several captures',
      35,
      0.8,
      0.7,
      'pending',
      null,
      1,
      2,
      null,
      null,
    );

    const row = db.prepare('SELECT target_kind, target_branch_id FROM profile_change_proposals WHERE id = ?')
      .get('proposal-1') as { target_kind: string; target_branch_id: string };
    expect(row.target_kind).toBe('profile_branch');
    expect(row.target_branch_id).toBe('branch-1');

    expect(() => insert.run(
      'proposal-2',
      'classification_patch',
      'checker',
      'coding',
      null,
      'base_profile',
      null,
      'branch-1',
      '["ev-1"]',
      '{"addItemTypeNodeIds":["react_hook"]}',
      'Broken target',
      '',
      '',
      35,
      null,
      null,
      'pending',
      null,
      1,
      2,
      null,
      null,
    )).toThrow();

    expect(() => insert.run(
      'proposal-3',
      'classification_patch',
      'checker',
      'coding',
      null,
      'profile_branch',
      null,
      'branch-1',
      '["ev-1"]',
      '{"addItemTypeNodeIds":["react_hook"]}',
      'Broken risk',
      '',
      '',
      101,
      null,
      null,
      'pending',
      null,
      1,
      2,
      null,
      null,
    )).toThrow();
  });
});
