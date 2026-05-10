/// <reference types="node" />
import { describe, expect, it, beforeEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { migration012 } from '../012-profile-branches';

// ---------------------------------------------------------------------------
// Schema-string assertions
// ---------------------------------------------------------------------------

describe('Migration 012 - schema strings', () => {
  const sql = migration012.up.join('\n');

  it('creates profile_branches with expected columns', () => {
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS profile_branches');
    expect(sql).toContain("id TEXT PRIMARY KEY");
    expect(sql).toContain("parent_profile_id TEXT NOT NULL");
    expect(sql).toContain("branch_kind TEXT NOT NULL CHECK(branch_kind IN ('project','learning','personal'))");
    expect(sql).toContain("name TEXT NOT NULL");
    expect(sql).toContain("overlay_json TEXT NOT NULL");
    expect(sql).toContain("created_at INTEGER NOT NULL");
    expect(sql).toContain("updated_at INTEGER NOT NULL");
  });

  it('creates expected indexes', () => {
    expect(sql).toContain('idx_profile_branches_parent');
    expect(sql).toContain('idx_profile_branches_kind');
    expect(sql).toContain('idx_profile_branches_updated');
  });

  it('is version 12 and transactional', () => {
    expect(migration012.version).toBe(12);
    expect(migration012).not.toHaveProperty('nonTransactional');
  });
});

// ---------------------------------------------------------------------------
// Execution tests against real in-memory SQLite
// ---------------------------------------------------------------------------

interface BranchRow {
  id: string;
  parent_profile_id: string;
  branch_kind: string;
  name: string;
  overlay_json: string;
  created_at: number;
  updated_at: number;
}

function makeDb() {
  const db = new DatabaseSync(':memory:');
  for (const stmt of migration012.up) {
    db.exec(stmt);
  }
  return db;
}

function selectBranch(db: InstanceType<typeof DatabaseSync>, id: string): BranchRow | undefined {
  return db.prepare('SELECT * FROM profile_branches WHERE id = ?').get(id) as unknown as BranchRow | undefined;
}

describe('Migration 012 - execution', () => {
  let db: InstanceType<typeof DatabaseSync>;

  beforeEach(() => {
    db = makeDb();
  });

  it('accepts valid branch kinds', () => {
    const insert = db.prepare(
      'INSERT INTO profile_branches (id, parent_profile_id, branch_kind, name, overlay_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    );
    insert.run('b1', 'coding', 'project', 'Project A', '{}', 1, 1);
    insert.run('b2', 'coding', 'learning', 'Learning A', '{}', 1, 1);
    insert.run('b3', 'coding', 'personal', 'Personal A', '{}', 1, 1);

    expect(selectBranch(db, 'b1')?.branch_kind).toBe('project');
    expect(selectBranch(db, 'b2')?.branch_kind).toBe('learning');
    expect(selectBranch(db, 'b3')?.branch_kind).toBe('personal');
  });

  it('rejects invalid branch kind via CHECK constraint', () => {
    expect(() =>
      db.prepare(
        'INSERT INTO profile_branches (id, parent_profile_id, branch_kind, name, overlay_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ).run('b1', 'coding', 'invalid', 'Bad', '{}', 1, 1),
    ).toThrow();
  });

  it('stores and retrieves overlay_json', () => {
    const overlay = JSON.stringify({ kind: 'project', id: 'o1' });
    db.prepare(
      'INSERT INTO profile_branches (id, parent_profile_id, branch_kind, name, overlay_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ).run('b1', 'coding', 'project', 'P', overlay, 1000, 2000);

    const row = selectBranch(db, 'b1')!;
    expect(row.overlay_json).toBe(overlay);
    expect(row.created_at).toBe(1000);
    expect(row.updated_at).toBe(2000);
  });

  it('indexes exist', () => {
    const indexes = db.prepare(
      "SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'profile_branches'",
    ).all() as Array<{ name: string }>;
    const names = indexes.map((i) => i.name);
    expect(names).toContain('idx_profile_branches_parent');
    expect(names).toContain('idx_profile_branches_kind');
    expect(names).toContain('idx_profile_branches_updated');
  });
});
