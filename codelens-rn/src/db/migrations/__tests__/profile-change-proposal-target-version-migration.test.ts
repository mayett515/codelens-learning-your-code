/// <reference types="node" />
import { describe, expect, it } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { migration016 } from '../016-profile-change-proposals';
import { migration022 } from '../022-profile-change-proposal-target-version';

describe('Migration 022 - profile change proposal target version', () => {
  const sql = migration022.up.join('\n');

  it('adds a target base profile version column and lookup index', () => {
    expect(sql).toContain('ALTER TABLE profile_change_proposals ADD COLUMN target_profile_version INTEGER');
    expect(sql).toContain('idx_profile_change_proposals_target_profile_version');
    expect(migration022.version).toBe(22);
    expect(migration022).not.toHaveProperty('nonTransactional');
  });

  it('executes after profile proposal storage and preserves older rows', () => {
    const db = new DatabaseSync(':memory:');
    for (const stmt of migration016.up) db.exec(stmt);

    db.prepare(`
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
    `).run(
      'proposal-1',
      'ontology_node_patch',
      'user',
      'coding',
      null,
      'base_profile',
      'coding',
      null,
      '["ev-1"]',
      '{"addItemTypeNodeIds":["react_hook"]}',
      'Add React hook type',
      'Suggests a new type',
      'User created the type',
      70,
      null,
      1,
      'pending',
      null,
      1,
      2,
      null,
      null,
    );

    for (const stmt of migration022.up) db.exec(stmt);

    const oldRow = db.prepare(`
      SELECT target_profile_version FROM profile_change_proposals WHERE id = ?
    `).get('proposal-1') as { target_profile_version: number | null };
    expect(oldRow.target_profile_version).toBeNull();

    db.prepare(`
      INSERT INTO profile_change_proposals (
        id,
        proposal_kind,
        source_kind,
        base_profile_id,
        source_branch_id,
        target_kind,
        target_profile_id,
        target_branch_id,
        target_profile_version,
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
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'proposal-2',
      'ontology_node_patch',
      'user',
      'coding',
      null,
      'base_profile',
      'coding',
      null,
      3,
      '["ev-2"]',
      '{"addItemTypeNodeIds":["query_key"]}',
      'Add query key type',
      'Suggests another type',
      'User created the type',
      70,
      null,
      1,
      'pending',
      null,
      3,
      4,
      null,
      null,
    );

    const newRow = db.prepare(`
      SELECT target_profile_version FROM profile_change_proposals WHERE id = ?
    `).get('proposal-2') as { target_profile_version: number | null };
    expect(newRow.target_profile_version).toBe(3);
  });
});
