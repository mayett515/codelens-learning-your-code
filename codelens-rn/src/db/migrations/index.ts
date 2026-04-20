import type { DB } from '@op-engineering/op-sqlite';
import { migration001 } from './001-initial-schema';
import { migration002 } from './002-concepts-fts';
import { migration003 } from './003-chat-model-overrides';

export interface Migration {
  version: number;
  up: string[];
}

const MIGRATIONS: Migration[] = [migration001, migration002, migration003];

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
    if (migration.version > currentVersion) {
      for (const sql of migration.up) {
        db.executeSync(sql);
      }
      db.executeSync('UPDATE schema_version SET version = ? WHERE id = 1', [migration.version]);
    }
  }
}
