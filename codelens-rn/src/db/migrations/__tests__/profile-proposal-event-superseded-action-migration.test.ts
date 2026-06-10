/// <reference types="node" />
import { describe, expect, it } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { migration019 } from '../019-profile-proposal-events';
import { migration023 } from '../023-profile-proposal-event-superseded-action';

describe('Migration 023 - profile proposal superseded events', () => {
  const sql = migration023.up.join('\n');

  it('rebuilds proposal events with superseded as an auditable action', () => {
    expect(sql).toContain("action TEXT NOT NULL CHECK(action IN ('applied','rejected','postponed','asked_why','superseded'))");
    expect(sql).toContain('profile_proposal_events_next');
    expect(sql).toContain('idx_profile_proposal_events_base_profile_created');
    expect(migration023.version).toBe(23);
    expect(migration023).not.toHaveProperty('nonTransactional');
  });

  it('preserves existing rows and accepts superseded events', () => {
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
      'postponed',
      'user',
      null,
      'coding',
      'ontology_node_patch',
      'profile_branch',
      null,
      'branch-1',
      'pending',
      'postponed',
      2,
      3,
      null,
      null,
      null,
      null,
      3,
    );

    for (const stmt of migration023.up) db.exec(stmt);

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
      'event-2',
      'proposal-1',
      'superseded',
      'user',
      null,
      'coding',
      'ontology_node_patch',
      'profile_branch',
      null,
      'branch-1',
      'pending',
      'superseded',
      3,
      4,
      null,
      null,
      'Edited into a better proposal',
      '{"supersededByProposalId":"proposal-2"}',
      4,
    );

    const rows = db.prepare('SELECT action FROM profile_proposal_events ORDER BY id').all() as { action: string }[];
    expect(rows.map((row) => row.action)).toEqual(['postponed', 'superseded']);
  });
});
