/// <reference types="node" />
import { describe, expect, it, beforeEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { migration014 } from '../014-profile-definitions';

// ---------------------------------------------------------------------------
// Schema-string assertions
// ---------------------------------------------------------------------------

describe('Migration 014 - schema strings', () => {
  const sql = migration014.up.join('\n');

  it('creates profile_definitions with expected columns', () => {
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS profile_definitions');
    expect(sql).toContain("id TEXT PRIMARY KEY");
    expect(sql).toContain("label TEXT NOT NULL");
    expect(sql).toContain("description TEXT NOT NULL");
    expect(sql).toContain("version INTEGER NOT NULL");
    expect(sql).toContain("source_kind TEXT NOT NULL CHECK(source_kind IN ('built_in','user','imported','adapter'))");
    expect(sql).toContain("profile_json TEXT NOT NULL");
    expect(sql).toContain("created_at INTEGER NOT NULL");
    expect(sql).toContain("updated_at INTEGER NOT NULL");
  });

  it('creates expected indexes', () => {
    expect(sql).toContain('idx_profile_definitions_source_kind');
    expect(sql).toContain('idx_profile_definitions_updated');
  });

  it('is version 14 and transactional', () => {
    expect(migration014.version).toBe(14);
    expect(migration014).not.toHaveProperty('nonTransactional');
  });
});

// ---------------------------------------------------------------------------
// Execution tests against real in-memory SQLite
// ---------------------------------------------------------------------------

interface DefinitionRow {
  id: string;
  label: string;
  description: string;
  version: number;
  source_kind: string;
  profile_json: string;
  created_at: number;
  updated_at: number;
}

function makeDb() {
  const db = new DatabaseSync(':memory:');
  for (const stmt of migration014.up) {
    db.exec(stmt);
  }
  return db;
}

function selectDefinition(db: InstanceType<typeof DatabaseSync>, id: string): DefinitionRow | undefined {
  return db.prepare('SELECT * FROM profile_definitions WHERE id = ?').get(id) as unknown as DefinitionRow | undefined;
}

describe('Migration 014 - execution', () => {
  let db: InstanceType<typeof DatabaseSync>;

  beforeEach(() => {
    db = makeDb();
  });

  it('accepts valid source kinds', () => {
    const insert = db.prepare(
      'INSERT INTO profile_definitions (id, label, description, version, source_kind, profile_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    );
    insert.run('d1', 'A', 'Desc A', 1, 'built_in', '{}', 1, 1);
    insert.run('d2', 'B', 'Desc B', 1, 'user', '{}', 1, 1);
    insert.run('d3', 'C', 'Desc C', 1, 'imported', '{}', 1, 1);
    insert.run('d4', 'D', 'Desc D', 1, 'adapter', '{}', 1, 1);

    expect(selectDefinition(db, 'd1')?.source_kind).toBe('built_in');
    expect(selectDefinition(db, 'd2')?.source_kind).toBe('user');
    expect(selectDefinition(db, 'd3')?.source_kind).toBe('imported');
    expect(selectDefinition(db, 'd4')?.source_kind).toBe('adapter');
  });

  it('rejects invalid source kind via CHECK constraint', () => {
    expect(() =>
      db.prepare(
        'INSERT INTO profile_definitions (id, label, description, version, source_kind, profile_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      ).run('d1', 'A', 'Desc', 1, 'invalid', '{}', 1, 1),
    ).toThrow();
  });

  it('stores and retrieves profile_json', () => {
    const profile = JSON.stringify({ id: 'test', label: 'Test', version: 1 });
    db.prepare(
      'INSERT INTO profile_definitions (id, label, description, version, source_kind, profile_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    ).run('d1', 'Test', 'Desc', 1, 'user', profile, 1000, 2000);

    const row = selectDefinition(db, 'd1')!;
    expect(row.profile_json).toBe(profile);
    expect(row.created_at).toBe(1000);
    expect(row.updated_at).toBe(2000);
  });

  it('indexes exist', () => {
    const indexes = db.prepare(
      "SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'profile_definitions'",
    ).all() as Array<{ name: string }>;
    const names = indexes.map((i) => i.name);
    expect(names).toContain('idx_profile_definitions_source_kind');
    expect(names).toContain('idx_profile_definitions_updated');
  });
});
