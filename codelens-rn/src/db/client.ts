import { open, type DB } from '@op-engineering/op-sqlite';
import { drizzle } from 'drizzle-orm/op-sqlite';
import * as schema from './schema';
import { runMigrations } from './migrations';

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
  runMigrations(opsqlite);
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
