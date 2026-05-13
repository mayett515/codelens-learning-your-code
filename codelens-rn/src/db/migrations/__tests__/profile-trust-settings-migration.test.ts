/// <reference types="node" />
import { describe, expect, it } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { migration018 } from '../018-profile-trust-settings';

describe('Migration 018 - profile trust settings', () => {
  const sql = migration018.up.join('\n');

  it('creates scoped trust settings without apply or event tables', () => {
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS profile_trust_settings');
    expect(sql).toContain('scope_key TEXT NOT NULL UNIQUE');
    expect(sql).toContain("trust_mode TEXT NOT NULL CHECK(trust_mode IN ('manual_only','suggest_first','trusted_low_risk_auto','adaptive'))");
    expect(sql).toContain('auto_apply_proposal_kinds_json TEXT NOT NULL');
    expect(sql).not.toContain('profile_apply_events');
    expect(sql).not.toContain('auto_apply_jobs');
  });

  it('adds lookup indexes and stays transactional', () => {
    expect(sql).toContain('idx_profile_trust_settings_base_profile');
    expect(sql).toContain('idx_profile_trust_settings_target_branch');
    expect(sql).toContain('idx_profile_trust_settings_mode');
    expect(sql).toContain('idx_profile_trust_settings_updated');
    expect(migration018.version).toBe(18);
    expect(migration018).not.toHaveProperty('nonTransactional');
  });

  it('executes against sqlite and enforces base-profile auto-apply boundary', () => {
    const db = new DatabaseSync(':memory:');
    for (const stmt of migration018.up) db.exec(stmt);

    db.prepare(`
      INSERT INTO profile_trust_settings (
        id,
        scope_key,
        base_profile_id,
        target_kind,
        target_profile_id,
        target_branch_id,
        trust_mode,
        auto_apply_enabled,
        max_auto_apply_risk_score,
        auto_apply_proposal_kinds_json,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'trust-1',
      'profile_branch:coding:personal-1',
      'coding',
      'profile_branch',
      null,
      'personal-1',
      'trusted_low_risk_auto',
      1,
      25,
      '["classification_patch"]',
      1,
      2,
    );

    const row = db.prepare('SELECT trust_mode, max_auto_apply_risk_score FROM profile_trust_settings WHERE id = ?')
      .get('trust-1') as { trust_mode: string; max_auto_apply_risk_score: number };
    expect(row.trust_mode).toBe('trusted_low_risk_auto');
    expect(row.max_auto_apply_risk_score).toBe(25);

    expect(() => db.prepare(`
      INSERT INTO profile_trust_settings (
        id,
        scope_key,
        base_profile_id,
        target_kind,
        target_profile_id,
        target_branch_id,
        trust_mode,
        auto_apply_enabled,
        max_auto_apply_risk_score,
        auto_apply_proposal_kinds_json,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'trust-2',
      'base_profile:coding',
      'coding',
      'base_profile',
      'coding',
      null,
      'adaptive',
      1,
      25,
      '["classification_patch"]',
      1,
      2,
    )).toThrow();
  });
});
