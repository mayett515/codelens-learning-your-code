import { describe, it, expect } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { migration013 } from '../013-profile-selections';

function testDb(): DatabaseSync {
  return new DatabaseSync(':memory:');
}

describe('Migration 013 - profile_selections', () => {
  it('creates profile_selections table with correct columns', () => {
    const db = testDb();

    // Prerequisites: projects table (FK target)
    db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        source TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `);

    for (const sql of migration013.up) {
      db.exec(sql);
    }

    // Insert a project row first (FK target)
    db.prepare(`INSERT INTO projects (id, name, source, created_at) VALUES (?, ?, ?, ?)`)
      .run('proj-1', 'My Project', 'paste', '2026-01-01');

    // Verify columns exist by inserting a row
    db.prepare(`
      INSERT INTO profile_selections (
        id, project_id, base_profile_id,
        project_branch_ids_json, learning_branch_ids_json, personal_branch_ids_json,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('sel-1', 'proj-1', 'coding', '[]', '[]', '[]', 1000, 2000);

    const rows = db.prepare('SELECT * FROM profile_selections WHERE id = ?').all('sel-1') as Record<string, unknown>[];
    expect(rows).toHaveLength(1);
    const row = rows[0]!;
    expect(row['id']).toBe('sel-1');
    expect(row['project_id']).toBe('proj-1');
    expect(row['base_profile_id']).toBe('coding');
    expect(row['project_branch_ids_json']).toBe('[]');
    expect(row['learning_branch_ids_json']).toBe('[]');
    expect(row['personal_branch_ids_json']).toBe('[]');
    expect(row['created_at']).toBe(1000);
    expect(row['updated_at']).toBe(2000);
  });

  it('enforces unique project constraint', () => {
    const db = testDb();
    db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        source TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `);

    for (const sql of migration013.up) {
      db.exec(sql);
    }

    // Insert a project row first (FK target)
    db.prepare(`INSERT INTO projects (id, name, source, created_at) VALUES (?, ?, ?, ?)`)
      .run('proj-1', 'My Project', 'paste', '2026-01-01');

    db.prepare(`
      INSERT INTO profile_selections (
        id, project_id, base_profile_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?)
    `).run('sel-1', 'proj-1', 'coding', 1000, 2000);

    // Second selection for same project should fail due to unique index
    expect(() => {
      db.prepare(`
        INSERT INTO profile_selections (
          id, project_id, base_profile_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?)
      `).run('sel-2', 'proj-1', 'photography', 1000, 2000);
    }).toThrow();
  });

  it('supports non-empty branch id arrays', () => {
    const db = testDb();
    db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        source TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `);

    for (const sql of migration013.up) {
      db.exec(sql);
    }

    // Insert a project row first (FK target)
    db.prepare(`INSERT INTO projects (id, name, source, created_at) VALUES (?, ?, ?, ?)`)
      .run('proj-1', 'My Project', 'paste', '2026-01-01');

    db.prepare(`
      INSERT INTO profile_selections (
        id, project_id, base_profile_id,
        project_branch_ids_json, learning_branch_ids_json, personal_branch_ids_json,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'sel-1',
      'proj-1',
      'coding',
      JSON.stringify(['pb-1', 'pb-2']),
      JSON.stringify(['lb-1']),
      JSON.stringify(['ps-1']),
      1000,
      2000,
    );

    const rows = db.prepare('SELECT * FROM profile_selections WHERE id = ?').all('sel-1') as Record<string, unknown>[];
    expect(rows).toHaveLength(1);
    const row = rows[0]!;
    expect(row['project_branch_ids_json']).toBe('["pb-1","pb-2"]');
    expect(row['learning_branch_ids_json']).toBe('["lb-1"]');
    expect(row['personal_branch_ids_json']).toBe('["ps-1"]');
  });

  it('creates the expected indexes', () => {
    const db = testDb();
    db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        source TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `);

    for (const sql of migration013.up) {
      db.exec(sql);
    }

    const indexRows = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='profile_selections'",
    ).all() as Record<string, unknown>[];

    const indexNames = indexRows.map((r) => r['name'] as string);
    expect(indexNames).toContain('unique_profile_selections_project');
    expect(indexNames).toContain('idx_profile_selections_base_profile');
    expect(indexNames).toContain('idx_profile_selections_updated');
  });

  it('CASCADE deletes selections when project is deleted', () => {
    const db = testDb();
    db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        source TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `);

    for (const sql of migration013.up) {
      db.exec(sql);
    }

    db.prepare(`INSERT INTO projects (id, name, source, created_at) VALUES (?, ?, ?, ?)`).run(
      'proj-1', 'My Project', 'paste', '2026-01-01',
    );

    db.prepare(`
      INSERT INTO profile_selections (
        id, project_id, base_profile_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?)
    `).run('sel-1', 'proj-1', 'coding', 1000, 2000);

    db.prepare('DELETE FROM projects WHERE id = ?').run('proj-1');

    const remaining = db.prepare('SELECT COUNT(*) AS cnt FROM profile_selections').get() as { cnt: number };
    expect(remaining.cnt).toBe(0);
  });
});
