/// <reference types="node" />
import { describe, expect, it, beforeEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { migration011 } from '../011-ontology-profile-columns';

// ---------------------------------------------------------------------------
// Schema-string assertions (fast checks that don't require DB execution)
// ---------------------------------------------------------------------------

describe('Migration 011 - schema strings', () => {
  const sql = migration011.up.join('\n');

  it('adds profile_id, type_node_id, metadata_json to concepts', () => {
    expect(sql).toContain("ALTER TABLE concepts ADD COLUMN profile_id TEXT NOT NULL DEFAULT 'coding'");
    expect(sql).toContain("ALTER TABLE concepts ADD COLUMN type_node_id TEXT NOT NULL DEFAULT ''");
    expect(sql).toContain("ALTER TABLE concepts ADD COLUMN metadata_json TEXT NOT NULL DEFAULT '{}'");
  });

  it('adds profile_id and classification_json to learning_captures', () => {
    expect(sql).toContain("ALTER TABLE learning_captures ADD COLUMN profile_id TEXT NOT NULL DEFAULT 'coding'");
    expect(sql).toContain('ALTER TABLE learning_captures ADD COLUMN classification_json TEXT');
  });

  it('escapes control characters with char() - not json_set or json_object', () => {
    expect(sql).toContain('char(10)');
    expect(sql).toContain('char(13)');
    expect(sql).toContain('char(9)');
    expect(sql).not.toContain('json_set');
    expect(sql).not.toContain('json_object');
  });

  it('is version 11 and transactional', () => {
    expect(migration011.version).toBe(11);
    expect(migration011).not.toHaveProperty('nonTransactional');
  });
});

// ---------------------------------------------------------------------------
// Execution tests - run the migration SQL against a real in-memory SQLite DB
// ---------------------------------------------------------------------------

interface ConceptRow {
  id: string;
  concept_type: string;
  core_concept: string | null;
  architectural_pattern: string | null;
  programming_paradigm: string | null;
  type_node_id: string;
  metadata_json: string;
}

function makeDb() {
  const db = new DatabaseSync(':memory:');
  // Minimal pre-migration tables (only the columns that existed before migration011)
  db.exec(`CREATE TABLE concepts (
    id TEXT PRIMARY KEY,
    concept_type TEXT NOT NULL DEFAULT 'mental_model',
    core_concept TEXT,
    architectural_pattern TEXT,
    programming_paradigm TEXT
  )`);
  db.exec(`CREATE TABLE learning_captures (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL DEFAULT ''
  )`);
  return db;
}

function runConceptsMigration(db: InstanceType<typeof DatabaseSync>) {
  // Run only the concepts-related statements from migration011
  for (const stmt of migration011.up) {
    if (!stmt.includes('learning_captures')) {
      db.exec(stmt);
    }
  }
}

function selectConcept(db: InstanceType<typeof DatabaseSync>, id: string): ConceptRow {
  return db.prepare('SELECT * FROM concepts WHERE id = ?').get(id) as unknown as ConceptRow;
}

describe('Migration 011 - backfill execution', () => {
  let db: InstanceType<typeof DatabaseSync>;

  beforeEach(() => {
    db = makeDb();
  });

  it('new column type_node_id copies concept_type for all rows', () => {
    db.prepare('INSERT INTO concepts (id, concept_type) VALUES (?, ?)').run('c1', 'mechanism');
    db.prepare('INSERT INTO concepts (id, concept_type) VALUES (?, ?)').run('c2', 'pattern');
    runConceptsMigration(db);

    expect(selectConcept(db, 'c1').type_node_id).toBe('mechanism');
    expect(selectConcept(db, 'c2').type_node_id).toBe('pattern');
  });

  it('omits null legacy fields from metadata_json', () => {
    db.prepare('INSERT INTO concepts (id, concept_type, core_concept) VALUES (?, ?, ?)').run(
      'c1', 'mechanism', 'lexical scope',
    );
    runConceptsMigration(db);

    const row = selectConcept(db, 'c1');
    const meta = JSON.parse(row.metadata_json) as Record<string, unknown>;
    expect(meta.coreConcept).toBe('lexical scope');
    expect('architecturalPattern' in meta).toBe(false);
    expect('programmingParadigm' in meta).toBe(false);
  });

  it('row with all legacy fields null keeps default metadata_json {}', () => {
    db.prepare('INSERT INTO concepts (id, concept_type) VALUES (?, ?)').run('c1', 'mental_model');
    runConceptsMigration(db);

    expect(selectConcept(db, 'c1').metadata_json).toBe('{}');
  });

  it('metadata_json parses as valid JSON for every combination of null/non-null', () => {
    const cases: Array<[string, string | null, string | null, string | null]> = [
      ['all3',   'core',  'arch',  'paradigm'],
      ['cc_ap',  'core',  'arch',  null],
      ['cc_pp',  'core',  null,    'paradigm'],
      ['ap_pp',  null,    'arch',  'paradigm'],
      ['cc',     'core',  null,    null],
      ['ap',     null,    'arch',  null],
      ['pp',     null,    null,    'paradigm'],
      ['none',   null,    null,    null],
    ];
    const insert = db.prepare(
      'INSERT INTO concepts (id, concept_type, core_concept, architectural_pattern, programming_paradigm) VALUES (?, ?, ?, ?, ?)',
    );
    for (const [id, cc, ap, pp] of cases) insert.run(id, 'mechanism', cc, ap, pp);

    runConceptsMigration(db);

    for (const [id] of cases) {
      const row = selectConcept(db, id);
      expect(() => JSON.parse(row.metadata_json), `${id} JSON.parse`).not.toThrow();
    }
  });

  it('round-trips double quotes in legacy values', () => {
    db.prepare('INSERT INTO concepts (id, concept_type, core_concept) VALUES (?, ?, ?)').run(
      'c1', 'mechanism', 'He said "hello"',
    );
    runConceptsMigration(db);

    const meta = JSON.parse(selectConcept(db, 'c1').metadata_json) as Record<string, unknown>;
    expect(meta.coreConcept).toBe('He said "hello"');
  });

  it('round-trips backslashes in legacy values', () => {
    db.prepare('INSERT INTO concepts (id, concept_type, core_concept) VALUES (?, ?, ?)').run(
      'c1', 'mechanism', 'C:\\path\\file',
    );
    runConceptsMigration(db);

    const meta = JSON.parse(selectConcept(db, 'c1').metadata_json) as Record<string, unknown>;
    expect(meta.coreConcept).toBe('C:\\path\\file');
  });

  it('round-trips newline in legacy values', () => {
    db.prepare('INSERT INTO concepts (id, concept_type, core_concept) VALUES (?, ?, ?)').run(
      'c1', 'mechanism', 'line1\nline2',
    );
    runConceptsMigration(db);

    const meta = JSON.parse(selectConcept(db, 'c1').metadata_json) as Record<string, unknown>;
    expect(meta.coreConcept).toBe('line1\nline2');
  });

  it('round-trips carriage return and tab in legacy values', () => {
    db.prepare('INSERT INTO concepts (id, concept_type, programming_paradigm) VALUES (?, ?, ?)').run(
      'c1', 'mechanism', 'win\r\nline\ttab',
    );
    runConceptsMigration(db);

    const meta = JSON.parse(selectConcept(db, 'c1').metadata_json) as Record<string, unknown>;
    expect(meta.programmingParadigm).toBe('win\r\nline\ttab');
  });
});
