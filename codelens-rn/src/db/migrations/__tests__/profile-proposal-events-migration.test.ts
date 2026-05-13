/// <reference types="node" />
import { describe, expect, it } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { migration019 } from '../019-profile-proposal-events';

describe('Migration 019 - profile proposal events', () => {
  const sql = migration019.up.join('\n');

  it('creates an append-only proposal event table without projections or runtime profiles', () => {
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS profile_proposal_events');
    expect(sql).toContain('proposal_id TEXT NOT NULL');
    expect(sql).toContain("action TEXT NOT NULL CHECK(action IN ('applied','rejected','postponed','asked_why'))");
    expect(sql).toContain('details_json TEXT');
    expect(sql).not.toContain('user_fit_score');
    expect(sql).not.toContain('runtime_profile_json');
    expect(sql).not.toContain('composed_profile_json');
  });

  it('adds lookup indexes and stays transactional', () => {
    expect(sql).toContain('idx_profile_proposal_events_proposal');
    expect(sql).toContain('idx_profile_proposal_events_base_profile');
    expect(sql).toContain('idx_profile_proposal_events_target_branch');
    expect(sql).toContain('idx_profile_proposal_events_action');
    expect(sql).toContain('idx_profile_proposal_events_created');
    expect(migration019.version).toBe(19);
    expect(migration019).not.toHaveProperty('nonTransactional');
  });

  it('executes against sqlite and enforces event action enums', () => {
    const db = new DatabaseSync(':memory:');
    for (const stmt of migration019.up) db.exec(stmt);

    db.prepare(`
      INSERT INTO profile_proposal_events (
        id,
        proposal_id,
        action,
        actor_kind,
        actor_id,
        base_profile_id,
        proposal_kind,
        target_kind,
        target_profile_id,
        target_branch_id,
        status_before,
        status_after,
        proposal_updated_at_before,
        proposal_updated_at_after,
        branch_updated_at_before,
        branch_updated_at_after,
        reason,
        details_json,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'event-1',
      'proposal-1',
      'applied',
      'user',
      null,
      'coding',
      'ontology_node_patch',
      'profile_branch',
      null,
      'branch-1',
      'pending',
      'accepted',
      2,
      3,
      2,
      3,
      null,
      '{"operationKind":"apply_profile_patch_to_branch_overlay"}',
      3,
    );

    const row = db.prepare('SELECT action, details_json FROM profile_proposal_events WHERE id = ?')
      .get('event-1') as { action: string; details_json: string };
    expect(row.action).toBe('applied');
    expect(JSON.parse(row.details_json)).toEqual({
      operationKind: 'apply_profile_patch_to_branch_overlay',
    });

    expect(() => db.prepare(`
      INSERT INTO profile_proposal_events (
        id,
        proposal_id,
        action,
        actor_kind,
        actor_id,
        base_profile_id,
        proposal_kind,
        target_kind,
        target_profile_id,
        target_branch_id,
        status_before,
        status_after,
        proposal_updated_at_before,
        proposal_updated_at_after,
        branch_updated_at_before,
        branch_updated_at_after,
        reason,
        details_json,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'event-2',
      'proposal-1',
      'auto_accepted',
      'user',
      null,
      'coding',
      'ontology_node_patch',
      'profile_branch',
      null,
      'branch-1',
      'pending',
      'accepted',
      2,
      3,
      2,
      3,
      null,
      null,
      3,
    )).toThrow();
  });
});
