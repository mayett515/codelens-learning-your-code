import type { DB } from '@op-engineering/op-sqlite';
import { migration001 } from './001-initial-schema';
import { migration002 } from './002-concepts-fts';
import { migration003 } from './003-chat-model-overrides';
import { migration004 } from './004-capture-first-model';
import { migration005 } from './005-normalize-legacy-concept-keys';
import { migration006 } from './006-promotion-system';
import { migration007 } from './007-retrieval-engine';
import { migration008 } from './008-dynamic-providers';
import { migration009 } from './009-dynamic-provider-source-url';

export interface Migration {
  version: number;
  up: string[];
  /**
   * If true, skip the BEGIN/COMMIT wrapper and run statements in autocommit mode.
   * Use ONLY for migrations whose statements interact with sqlite-vec virtual
   * tables, where rollback semantics are not guaranteed. See `runMigrations`
   * for the rationale + sources.
   */
  nonTransactional?: boolean;
}

const MIGRATIONS: Migration[] = [
  migration001,
  migration002,
  migration003,
  migration004,
  migration005,
  migration006,
  // 007 reads from `embeddings_vec` (sqlite-vec) inside its UPDATE backfills.
  // Marked non-transactional out of caution — see runMigrations comment below.
  { ...migration007, nonTransactional: true },
  migration008,
  migration009,
];

/*
 * Migration atomicity:
 *
 * Each migration body runs inside BEGIN IMMEDIATE ... COMMIT by default. If any
 * statement throws, we ROLLBACK and rethrow. This prevents the device-wedge
 * failure mode where a partial migration (e.g. one ALTER TABLE applied, the
 * next throws) leaves schema_version stale; the next launch then re-runs the
 * already-applied statements and crashes with "duplicate column".
 *
 * Migrations marked `nonTransactional: true` skip the wrapper. This is reserved
 * for migrations that touch sqlite-vec virtual tables (vec0), which do not
 * provide reliable rollback semantics. FTS5 virtual tables ARE fully
 * transactional and stay inside the wrapper.
 *
 * Sources:
 * - SQLite atomic commit / rollback (DDL is transactional):
 *   https://www.sqlite.org/atomiccommit.html
 * - SQLite FTS5 (transactional virtual table):
 *   https://www.sqlite.org/fts5.html
 * - sqlite-vec known limitations (vec0 + transactions):
 *   https://github.com/asg017/sqlite-vec/blob/main/README.md
 * - Project guidance on sqlite-vec rollback fragility:
 *   current_state.md, Phase 6 "Restore strategy"
 */
export function runMigrations(db: DB): void {
  db.executeSync(`
    CREATE TABLE IF NOT EXISTS schema_version (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      version INTEGER NOT NULL DEFAULT 0
    )
  `);
  db.executeSync('INSERT OR IGNORE INTO schema_version (id, version) VALUES (1, 0)');

  const result = db.executeSync('SELECT version FROM schema_version WHERE id = 1');
  const currentVersion = (result.rows[0]?.version as number | undefined) ?? 0;

  for (const migration of MIGRATIONS) {
    if (migration.version <= currentVersion) continue;

    if (migration.nonTransactional) {
      for (const sql of migration.up) {
        db.executeSync(sql);
      }
      db.executeSync('UPDATE schema_version SET version = ? WHERE id = 1', [migration.version]);
      continue;
    }

    db.executeSync('BEGIN IMMEDIATE');
    try {
      for (const sql of migration.up) {
        db.executeSync(sql);
      }
      db.executeSync('UPDATE schema_version SET version = ? WHERE id = 1', [migration.version]);
      db.executeSync('COMMIT');
    } catch (err) {
      try {
        db.executeSync('ROLLBACK');
      } catch {
        // Rollback can fail if no transaction is active; the original error matters more.
      }
      throw err;
    }
  }
}
