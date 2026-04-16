import type { Migration } from './index';

/**
 * FTS5 virtual table mirroring concepts.name + concepts.summary, auto-synced
 * via triggers on the concepts table.
 *
 * Serves as the "cold tier" safety net: when vectors are evicted from
 * embeddings_vec under memory pressure, keyword search still locates
 * concepts via this index (disk-backed, near-zero RAM).
 */
export const migration002: Migration = {
  version: 2,
  up: [
    `CREATE VIRTUAL TABLE IF NOT EXISTS concepts_fts USING fts5(
      id UNINDEXED,
      name,
      summary,
      tokenize = 'unicode61'
    )`,

    // Backfill existing concepts into the FTS index.
    `INSERT INTO concepts_fts(id, name, summary)
     SELECT id, name, summary FROM concepts`,

    // Auto-sync triggers — keep FTS in lockstep with the base table.
    `CREATE TRIGGER IF NOT EXISTS concepts_fts_ai AFTER INSERT ON concepts BEGIN
       INSERT INTO concepts_fts(id, name, summary)
       VALUES (new.id, new.name, new.summary);
     END`,

    // FTS5 update: explicitly delete the old index entry first, then insert
    // the new one. Using the FTS5 'delete' command ensures the old tokenised
    // data is purged before the new values are indexed — safe even if name or
    // summary changes drastically.
    `CREATE TRIGGER IF NOT EXISTS concepts_fts_au AFTER UPDATE ON concepts BEGIN
       INSERT INTO concepts_fts(concepts_fts, rowid, id, name, summary)
       VALUES ('delete', old.rowid, old.id, old.name, old.summary);
       INSERT INTO concepts_fts(rowid, id, name, summary)
       VALUES (new.rowid, new.id, new.name, new.summary);
     END`,

    `CREATE TRIGGER IF NOT EXISTS concepts_fts_ad AFTER DELETE ON concepts BEGIN
       DELETE FROM concepts_fts WHERE id = old.id;
     END`,
  ],
};
