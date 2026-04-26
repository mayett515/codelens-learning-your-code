import { describe, expect, it } from 'vitest';
import { migration004 } from '../004-capture-first-model';
import { migration005 } from '../005-normalize-legacy-concept-keys';

describe('Stage 1 capture-first migration', () => {
  it('creates capture-first storage and verification indexes', () => {
    const sql = migration004.up.join('\n');

    expect(sql).toContain('CREATE TABLE IF NOT EXISTS learning_captures');
    expect(sql).toContain("state TEXT NOT NULL DEFAULT 'unresolved'");
    expect(sql).toContain('linked_concept_id TEXT REFERENCES concepts(id) ON DELETE SET NULL');
    expect(sql).toContain('embedding_status TEXT NOT NULL DEFAULT');
    expect(sql).toContain('idx_captures_created_at');
  });

  it('upgrades concepts with normalized keys, split language fields, and scores', () => {
    const sql = migration004.up.join('\n');

    expect(sql).toContain('ALTER TABLE concepts ADD COLUMN normalized_key');
    expect(sql).toContain("replace(");
    expect(sql).toContain('CREATE UNIQUE INDEX IF NOT EXISTS unique_concepts_normalized_key');
    expect(sql).toContain('language_or_runtime_json');
    expect(sql).toContain('surface_features_json');
    expect(sql).toContain('representative_capture_ids_json');
    expect(sql).toContain('familiarity_score REAL NOT NULL DEFAULT 0');
    expect(sql).toContain('importance_score REAL NOT NULL DEFAULT 0');
  });

  it('normalizes legacy concept keys without unique-index collisions', () => {
    const sql = migration005.up.join('\n');

    expect(sql).toContain('DROP INDEX IF EXISTS unique_concepts_normalized_key');
    expect(sql).toContain("id GLOB 'c_?????????????????????'");
    expect(sql).toContain("'legacy_duplicate'");
    expect(sql).toContain('CREATE UNIQUE INDEX IF NOT EXISTS unique_concepts_normalized_key');
  });
});
