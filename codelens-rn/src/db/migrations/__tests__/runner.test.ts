import { describe, expect, it, vi } from 'vitest';
import type { DB } from '@op-engineering/op-sqlite';
import { runMigrations } from '../index';

interface ExecutedCall {
  sql: string;
  params: unknown[] | undefined;
}

function makeDb(opts: {
  currentVersion: number;
  failOn?: (call: ExecutedCall) => boolean;
}): { db: DB; calls: ExecutedCall[] } {
  const calls: ExecutedCall[] = [];
  let version = opts.currentVersion;

  const executeSync = vi.fn((sql: string, params?: unknown[]) => {
    const call: ExecutedCall = { sql, params };
    calls.push(call);

    if (opts.failOn?.(call)) {
      throw new Error(`forced failure on: ${sql}`);
    }

    if (sql.startsWith('SELECT version FROM schema_version')) {
      return { rows: [{ version }], rowsAffected: 0 };
    }
    if (sql.startsWith('UPDATE schema_version SET version = ?')) {
      version = (params?.[0] as number) ?? version;
      return { rows: [], rowsAffected: 1 };
    }
    return { rows: [], rowsAffected: 0 };
  });

  return {
    db: { executeSync } as unknown as DB,
    calls,
  };
}

describe('runMigrations atomicity', () => {
  it('wraps transactional migrations in BEGIN IMMEDIATE / COMMIT', () => {
    const { db, calls } = makeDb({ currentVersion: 0 });
    runMigrations(db);

    const sqls = calls.map((c) => c.sql);
    expect(sqls).toContain('BEGIN IMMEDIATE');
    expect(sqls).toContain('COMMIT');
    expect(sqls).not.toContain('ROLLBACK');
  });

  it('runs migration 007 outside a transaction (sqlite-vec)', () => {
    const { db, calls } = makeDb({ currentVersion: 6 });
    runMigrations(db);

    const sqls = calls.map((c) => c.sql);
    const bump7Index = calls.findIndex(
      (c) => c.sql.startsWith('UPDATE schema_version SET version = ?') && c.params?.[0] === 7,
    );
    const sqlsThroughV7 = calls.slice(0, bump7Index + 1).map((c) => c.sql);
    // v7 itself must NOT be wrapped; later transactional migrations may be.
    expect(sqlsThroughV7).not.toContain('BEGIN IMMEDIATE');
    expect(sqlsThroughV7).not.toContain('COMMIT');
    // schema_version must still be bumped to 7.
    expect(bump7Index).toBeGreaterThan(-1);
  });

  it('rolls back and rethrows when a transactional migration body fails', () => {
    const { db, calls } = makeDb({
      currentVersion: 0,
      failOn: (c) => c.sql.includes('ALTER TABLE concepts ADD COLUMN normalized_key'),
    });

    expect(() => runMigrations(db)).toThrow(/forced failure/);

    const sqls = calls.map((c) => c.sql);
    expect(sqls).toContain('BEGIN IMMEDIATE');
    expect(sqls).toContain('ROLLBACK');
    // schema_version must NOT have been bumped past the failing migration.
    const bumps = calls.filter((c) => c.sql.startsWith('UPDATE schema_version SET version = ?'));
    expect(bumps.every((c) => (c.params?.[0] as number) < 4)).toBe(true);
  });
});
