import type { Migration } from './index';

export const migration007: Migration = {
  version: 7,
  up: [
    `ALTER TABLE concepts ADD COLUMN embedding_tier TEXT NOT NULL DEFAULT 'cold' CHECK(embedding_tier IN ('hot', 'cold'))`,
    `ALTER TABLE concepts ADD COLUMN last_accessed_at INTEGER`,
    `ALTER TABLE learning_captures ADD COLUMN embedding_tier TEXT NOT NULL DEFAULT 'cold' CHECK(embedding_tier IN ('hot', 'cold'))`,
    `ALTER TABLE learning_captures ADD COLUMN last_accessed_at INTEGER`,
    `CREATE INDEX IF NOT EXISTS idx_concepts_tier ON concepts(embedding_tier)`,
    `CREATE INDEX IF NOT EXISTS idx_concepts_last_accessed ON concepts(last_accessed_at)`,
    `CREATE INDEX IF NOT EXISTS idx_captures_tier ON learning_captures(embedding_tier)`,
    `CREATE INDEX IF NOT EXISTS idx_captures_last_accessed ON learning_captures(last_accessed_at)`,
    `UPDATE concepts
     SET embedding_tier = 'hot'
     WHERE id IN (SELECT concept_id FROM embeddings_vec)`,
    `UPDATE learning_captures
     SET embedding_tier = 'hot'
     WHERE id IN (SELECT concept_id FROM embeddings_vec)`,

    `DROP TRIGGER IF EXISTS concepts_fts_ai`,
    `DROP TRIGGER IF EXISTS concepts_fts_au`,
    `DROP TRIGGER IF EXISTS concepts_fts_ad`,
    `DROP TABLE IF EXISTS concepts_fts`,

    `CREATE VIRTUAL TABLE IF NOT EXISTS captures_fts USING fts5(
      title,
      what_clicked,
      why_it_mattered,
      raw_snippet,
      keywords,
      capture_id UNINDEXED,
      tokenize = 'porter unicode61'
    )`,
    `CREATE VIRTUAL TABLE IF NOT EXISTS concepts_fts USING fts5(
      name,
      canonical_summary,
      core_concept,
      surface_features,
      language_or_runtime,
      concept_id UNINDEXED,
      tokenize = 'porter unicode61'
    )`,

    `INSERT INTO captures_fts(rowid, title, what_clicked, why_it_mattered, raw_snippet, keywords, capture_id)
     SELECT rowid, title, what_clicked, COALESCE(why_it_mattered, ''), raw_snippet,
       COALESCE((SELECT group_concat(value, ' ') FROM json_each(learning_captures.keywords_json)), ''),
       id
     FROM learning_captures`,
    `INSERT INTO concepts_fts(rowid, name, canonical_summary, core_concept, surface_features, language_or_runtime, concept_id)
     SELECT rowid, name, COALESCE(canonical_summary, summary, ''), COALESCE(core_concept, ''),
       COALESCE((SELECT group_concat(value, ' ') FROM json_each(concepts.surface_features_json)), ''),
       COALESCE((SELECT group_concat(value, ' ') FROM json_each(concepts.language_or_runtime_json)), ''),
       id
     FROM concepts`,

    `CREATE TRIGGER IF NOT EXISTS captures_fts_ai AFTER INSERT ON learning_captures BEGIN
       INSERT INTO captures_fts(rowid, title, what_clicked, why_it_mattered, raw_snippet, keywords, capture_id)
       VALUES (
         new.rowid,
         new.title,
         new.what_clicked,
         COALESCE(new.why_it_mattered, ''),
         new.raw_snippet,
         COALESCE((SELECT group_concat(value, ' ') FROM json_each(new.keywords_json)), ''),
         new.id
       );
     END`,
    `CREATE TRIGGER IF NOT EXISTS captures_fts_au AFTER UPDATE ON learning_captures BEGIN
       INSERT INTO captures_fts(captures_fts, rowid, title, what_clicked, why_it_mattered, raw_snippet, keywords, capture_id)
       VALUES ('delete', old.rowid, old.title, old.what_clicked, COALESCE(old.why_it_mattered, ''), old.raw_snippet, COALESCE((SELECT group_concat(value, ' ') FROM json_each(old.keywords_json)), ''), old.id);
       INSERT INTO captures_fts(rowid, title, what_clicked, why_it_mattered, raw_snippet, keywords, capture_id)
       VALUES (
         new.rowid,
         new.title,
         new.what_clicked,
         COALESCE(new.why_it_mattered, ''),
         new.raw_snippet,
         COALESCE((SELECT group_concat(value, ' ') FROM json_each(new.keywords_json)), ''),
         new.id
       );
     END`,
    `CREATE TRIGGER IF NOT EXISTS captures_fts_ad AFTER DELETE ON learning_captures BEGIN
       INSERT INTO captures_fts(captures_fts, rowid, title, what_clicked, why_it_mattered, raw_snippet, keywords, capture_id)
       VALUES ('delete', old.rowid, old.title, old.what_clicked, COALESCE(old.why_it_mattered, ''), old.raw_snippet, COALESCE((SELECT group_concat(value, ' ') FROM json_each(old.keywords_json)), ''), old.id);
     END`,

    `CREATE TRIGGER IF NOT EXISTS concepts_fts_ai AFTER INSERT ON concepts BEGIN
       INSERT INTO concepts_fts(rowid, name, canonical_summary, core_concept, surface_features, language_or_runtime, concept_id)
       VALUES (
         new.rowid,
         new.name,
         COALESCE(new.canonical_summary, new.summary, ''),
         COALESCE(new.core_concept, ''),
         COALESCE((SELECT group_concat(value, ' ') FROM json_each(new.surface_features_json)), ''),
         COALESCE((SELECT group_concat(value, ' ') FROM json_each(new.language_or_runtime_json)), ''),
         new.id
       );
     END`,
    `CREATE TRIGGER IF NOT EXISTS concepts_fts_au AFTER UPDATE ON concepts BEGIN
       INSERT INTO concepts_fts(concepts_fts, rowid, name, canonical_summary, core_concept, surface_features, language_or_runtime, concept_id)
       VALUES ('delete', old.rowid, old.name, COALESCE(old.canonical_summary, old.summary, ''), COALESCE(old.core_concept, ''), COALESCE((SELECT group_concat(value, ' ') FROM json_each(old.surface_features_json)), ''), COALESCE((SELECT group_concat(value, ' ') FROM json_each(old.language_or_runtime_json)), ''), old.id);
       INSERT INTO concepts_fts(rowid, name, canonical_summary, core_concept, surface_features, language_or_runtime, concept_id)
       VALUES (
         new.rowid,
         new.name,
         COALESCE(new.canonical_summary, new.summary, ''),
         COALESCE(new.core_concept, ''),
         COALESCE((SELECT group_concat(value, ' ') FROM json_each(new.surface_features_json)), ''),
         COALESCE((SELECT group_concat(value, ' ') FROM json_each(new.language_or_runtime_json)), ''),
         new.id
       );
     END`,
    `CREATE TRIGGER IF NOT EXISTS concepts_fts_ad AFTER DELETE ON concepts BEGIN
       INSERT INTO concepts_fts(concepts_fts, rowid, name, canonical_summary, core_concept, surface_features, language_or_runtime, concept_id)
       VALUES ('delete', old.rowid, old.name, COALESCE(old.canonical_summary, old.summary, ''), COALESCE(old.core_concept, ''), COALESCE((SELECT group_concat(value, ' ') FROM json_each(old.surface_features_json)), ''), COALESCE((SELECT group_concat(value, ' ') FROM json_each(old.language_or_runtime_json)), ''), old.id);
     END`,
  ],
};
