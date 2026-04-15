import { open, type DB } from '@op-engineering/op-sqlite';
import { drizzle } from 'drizzle-orm/op-sqlite';
import * as schema from './schema';

const DB_NAME = 'codelens.db';

const opsqlite = open({ name: DB_NAME });

// Drizzle's op-sqlite driver was written for an older API.
// op-sqlite v15 renamed executeAsync→execute, executeRawAsync→executeRaw,
// and returns rows as a plain array instead of { _array: [...] }.
function wrapForDrizzle(raw: DB): any {
  const sanitizeParams = (params?: any[]) => {
    if (!params) return params;
    return params.map((p: any) => {
      if (p === undefined) return null;
      // Convert arrays/objects to JSON strings, except for ArrayBuffers (used for vectors)
      if (
        p !== null && 
        typeof p === 'object' && 
        !(p instanceof ArrayBuffer) && 
        !(p instanceof Uint8Array) &&
        !(p instanceof Float32Array)
      ) {
        return JSON.stringify(p);
      }
      return p;
    });
  };

  return new Proxy(raw, {
    get(target, prop) {
      if (prop === 'executeAsync') {
        return async (sql: string, params?: any[]) => target.execute(sql, sanitizeParams(params));
      }
      if (prop === 'executeRawAsync') {
        return async (sql: string, params?: any[]) => target.executeRaw(sql, sanitizeParams(params));
      }
      if (prop === 'execute') {
        return (sql: string, params?: any[]) => {
          const result = target.executeSync(sql, sanitizeParams(params));
          return {
            ...result,
            rows: Object.assign(result.rows ?? [], {
              _array: result.rows ?? [],
            }),
          };
        };
      }
      const val = (target as Record<string | symbol, unknown>)[prop];
      if (typeof val === 'function') return (val as Function).bind(target);
      return val;
    },
  });
}

export const db = drizzle(wrapForDrizzle(opsqlite), { schema });

export function initDatabase() {
  opsqlite.executeSync('PRAGMA journal_mode = WAL;');
  opsqlite.executeSync('PRAGMA foreign_keys = ON;');

  opsqlite.executeSync(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      source TEXT NOT NULL CHECK(source IN ('github', 'paste')),
      github_url TEXT,
      created_at TEXT NOT NULL,
      recent_file_ids TEXT NOT NULL DEFAULT '[]'
    );
  `);

  opsqlite.executeSync(`
    CREATE TABLE IF NOT EXISTS files (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      path TEXT NOT NULL,
      content TEXT NOT NULL,
      marks TEXT NOT NULL DEFAULT '[]',
      ranges TEXT NOT NULL DEFAULT '[]'
    );
  `);

  opsqlite.executeSync(`
    CREATE TABLE IF NOT EXISTS chats (
      id TEXT PRIMARY KEY,
      scope TEXT NOT NULL CHECK(scope IN ('section', 'general', 'learning')),
      project_id TEXT,
      file_id TEXT,
      start_line INTEGER,
      end_line INTEGER,
      folder_id TEXT,
      concept_id TEXT,
      title TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  opsqlite.executeSync(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      chat_id TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
      content TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  opsqlite.executeSync(`
    CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_created
    ON chat_messages(chat_id, created_at);
  `);

  opsqlite.executeSync(`
    CREATE TABLE IF NOT EXISTS learning_sessions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      source TEXT NOT NULL CHECK(source IN ('chat', 'bubble')),
      source_chat_id TEXT NOT NULL,
      concept_ids TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      raw_snippet TEXT NOT NULL
    );
  `);

  opsqlite.executeSync(`
    CREATE TABLE IF NOT EXISTS concepts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      summary TEXT NOT NULL,
      taxonomy TEXT NOT NULL DEFAULT '{"tags":[]}',
      session_ids TEXT NOT NULL DEFAULT '[]',
      strength REAL NOT NULL DEFAULT 0.5,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  opsqlite.executeSync(`
    CREATE TABLE IF NOT EXISTS concept_links (
      from_id TEXT NOT NULL,
      to_id TEXT NOT NULL,
      kind TEXT NOT NULL CHECK(kind IN ('related', 'prereq', 'example-of')),
      weight REAL NOT NULL DEFAULT 0.5,
      PRIMARY KEY (from_id, to_id)
    );
  `);

  opsqlite.executeSync(`
    CREATE TABLE IF NOT EXISTS embeddings_meta (
      concept_id TEXT PRIMARY KEY,
      model TEXT NOT NULL,
      api TEXT NOT NULL,
      signature TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  initVec0();
}

function initVec0() {
  try {
    opsqlite.executeSync(`
      CREATE VIRTUAL TABLE IF NOT EXISTS embeddings_vec USING vec0(
        concept_id TEXT,
        embedding FLOAT[384]
      );
    `);
  } catch (error) {
    console.warn(
      'sqlite-vec extension not available or failed to initialize — vector search disabled.',
      error
    );
  }
}

export function getRawDb() {
  return opsqlite;
}
