import { describe, expect, it } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import {
  mapBackupRow,
  PROJECTS_COLUMN_MAP,
  FILES_COLUMN_MAP,
  CHATS_COLUMN_MAP,
  CHAT_MESSAGES_COLUMN_MAP,
  LEARNING_SESSIONS_COLUMN_MAP,
  LEARNING_CAPTURES_COLUMN_MAP,
  CONCEPTS_COLUMN_MAP,
  CONCEPT_LINKS_COLUMN_MAP,
  PROFILE_BRANCHES_COLUMN_MAP,
  TABLE_COLUMN_MAPS,
  TABLE_JSON_COLUMNS,
} from '../columnMaps';
import { conceptRowToDomain } from '../../learning/codecs/concept';
import { captureRowToDomain, buildCaptureClassificationJson, parseClassificationJsonToConceptHint } from '../../learning/codecs/capture';
import { CONCEPT_TYPES } from '../../learning/types/learning';
import { newConceptId, newLearningCaptureId } from '../../learning/types/ids';
import type { ConceptHint } from '../../learning/types/learning';

// Cast helpers --- mapBackupRow returns Record<string, unknown> which is 
// shape-compatible with the codec row types (made Partial for new columns).
// The `as never` matches the pattern used in import.ts insertBatch.
function asConceptRow(r: Record<string, unknown>) { return r as Parameters<typeof conceptRowToDomain>[0]; }
function asCaptureRow(r: Record<string, unknown>) { return r as Parameters<typeof captureRowToDomain>[0]; }

// Valid test IDs
const VALID_CONCEPT_ID = newConceptId();
const VALID_CAPTURE_ID = newLearningCaptureId();

// ---------------------------------------------------------------------------
// Row builders --- use snake_case DB column names exactly as they appear in
// raw `SELECT *` output (the actual export shape).
// ---------------------------------------------------------------------------

function legacyConceptRaw(overrides: Record<string, unknown> = {}) {
  return {
    id: VALID_CONCEPT_ID,
    name: 'Closure',
    summary: 'A closure retains lexical scope.',
    normalized_key: 'closure',
    canonical_summary: 'A function retains lexical scope.',
    concept_type: 'mechanism',
    core_concept: 'lexical scope',
    architectural_pattern: null,
    programming_paradigm: null,
    language_or_runtime_json: '["javascript"]',
    surface_features_json: '["closures"]',
    prerequisites_json: '[]',
    related_concepts_json: '[]',
    contrast_concepts_json: '[]',
    representative_capture_ids_json: '[]',
    familiarity_score: 0.5,
    importance_score: 0.5,
    embedding_tier: 'cold',
    last_accessed_at: null,
    language_syntax_legacy: null,
    taxonomy: '{"tags":[]}',
    session_ids: '[]',
    strength: 0.5,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function profileConceptRaw(overrides: Record<string, unknown> = {}) {
  return {
    ...legacyConceptRaw(),
    profile_id: 'coding',
    type_node_id: 'pattern',
    metadata_json: '{"coreConcept":"json-core","architecturalPattern":"json-arch"}',
    ...overrides,
  };
}

function legacyCaptureRaw(overrides: Record<string, unknown> = {}) {
  return {
    id: VALID_CAPTURE_ID,
    title: 'Closure in for-loop',
    what_clicked: 'Observation about closures',
    why_it_mattered: null,
    raw_snippet: 'const x = 1;',
    snippet_lang: null,
    snippet_source_path: null,
    snippet_start_line: null,
    snippet_end_line: null,
    chat_message_id: null,
    session_id: null,
    state: 'unresolved',
    linked_concept_id: null,
    editable_until: 0,
    extraction_confidence: null,
    derived_from_capture_id: null,
    embedding_status: 'pending',
    embedding_retry_count: 0,
    embedding_tier: 'cold',
    last_accessed_at: null,
    concept_hint_json: null,
    keywords_json: '[]',
    created_at: 1_771_900_000_000,
    updated_at: 1_771_900_000_000,
    ...overrides,
  };
}

function profileCaptureRaw(overrides: Record<string, unknown> = {}) {
  const cj = buildCaptureClassificationJson({
    proposedName: 'Lexical Closure',
    proposedNormalizedKey: 'lexical closure',
    proposedConceptType: 'mental_model',
    extractionConfidence: 0.9,
    linkedConceptId: null,
    linkedConceptName: null,
    linkedConceptLanguages: ['javascript'],
    isNewLanguageForExistingConcept: false,
  });
  return {
    ...legacyCaptureRaw(),
    profile_id: 'coding',
    classification_json: JSON.stringify(cj),
    ...overrides,
  };
}

function makeHint(overrides: Partial<ConceptHint> = {}): ConceptHint {
  return {
    proposedName: 'Closure',
    proposedNormalizedKey: 'closure',
    proposedConceptType: 'mechanism',
    extractionConfidence: 0.9,
    linkedConceptId: null,
    linkedConceptName: null,
    linkedConceptLanguages: ['javascript'],
    isNewLanguageForExistingConcept: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Helper: creates an in-memory SQLite DB, runs DDL, returns raw db handle
// ---------------------------------------------------------------------------

function testDb() {
  const db = new DatabaseSync(':memory:');
  return db;
}

// ---------------------------------------------------------------------------
// Section 0 - Raw export rows need import mapping
// ---------------------------------------------------------------------------

describe('Raw export rows use snake_case and need mapping', () => {
  // Establish ground truth: raw SELECT * returns snake_case columns.
  it('raw SQL table stores and returns snake_case column names', () => {
    const db = testDb();
    db.exec(`
      CREATE TABLE IF NOT EXISTS proof_test (
        id TEXT PRIMARY KEY,
        concept_type TEXT NOT NULL,
        core_concept TEXT,
        metadata_json TEXT NOT NULL DEFAULT '{}'
      )
    `);

    // Insert via raw SQL with snake_case columns. This matches export shape.
    db.prepare(`INSERT INTO proof_test (id, concept_type, core_concept, metadata_json) VALUES (?, ?, ?, ?)`)
      .run('p1', 'mechanism', 'lexical scope', '{"x":1}');

    const rows = db.prepare(`SELECT * FROM proof_test WHERE id = ?`).all('p1') as Record<string, unknown>[];
    const row = rows[0]!;

    // Raw rows have snake_case keys.
    expect(row['concept_type']).toBe('mechanism');
    expect(row['core_concept']).toBe('lexical scope');
    expect(row['metadata_json']).toBe('{"x":1}');

    // They do NOT have camelCase keys.
    expect('conceptType' in row).toBe(false);
    expect('coreConcept' in row).toBe(false);
    expect('metadataJson' in row).toBe(false);
  });

  it('mapping converts raw DB column names to Drizzle JS property names', () => {
    // A row coming from raw SELECT * only has snake_case keys.
    const rawRow: Record<string, unknown> = {
      id: 'c1',
      concept_type: 'mechanism',
      core_concept: 'lexical scope',
      metadata_json: '{"coreConcept":"x"}',
    };

    // The Drizzle schema expects these JS keys:
    const expectedJavascriptKeys = ['id', 'conceptType', 'coreConcept', 'metadataJson'];

    // The raw row does not have the JS keys Drizzle needs.
    for (const key of expectedJavascriptKeys) {
      if (key === 'id') continue; // 'id' is same in both
      expect(key in rawRow).toBe(false);
    }

    // After mapping, all expected JS keys are present.
    const mapped = mapBackupRow(rawRow, CONCEPTS_COLUMN_MAP);
    for (const key of expectedJavascriptKeys) {
      expect(key in mapped).toBe(true);
    }
    expect(mapped['conceptType']).toBe('mechanism');
    expect(mapped['coreConcept']).toBe('lexical scope');
    expect(mapped['metadataJson']).toBe('{"coreConcept":"x"}');
  });

  // Smoke: round-trip via real SQLite using mapped data.
  it('mapped data round-trips through real SQLite', () => {
    const db = testDb();
    db.exec(`
      CREATE TABLE concepts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        concept_type TEXT NOT NULL DEFAULT 'mental_model',
        core_concept TEXT,
        metadata_json TEXT NOT NULL DEFAULT '{}',
        profile_id TEXT NOT NULL DEFAULT 'coding',
        type_node_id TEXT NOT NULL DEFAULT ''
      )
    `);

    const rawRow: Record<string, unknown> = {
      id: 'c1',
      name: 'Closure',
      concept_type: 'pattern',
      core_concept: 'lexical scope',
      metadata_json: '{"coreConcept":"json-val"}',
      profile_id: 'coding',
      type_node_id: 'data_structure',
    };

    // Map to Drizzle shape, then insert via raw SQL using the mapped keys.
    const mapped = mapBackupRow(rawRow, {
      'id': 'id',
      'name': 'name',
      'concept_type': 'conceptType',
      'core_concept': 'coreConcept',
      'metadata_json': 'metadataJson',
      'profile_id': 'profileId',
      'type_node_id': 'typeNodeId',
    });

    // Insert using Drizzle-style keys, simulating the values Drizzle would read.
    const cols = ['id', 'name', 'concept_type', 'core_concept', 'metadata_json', 'profile_id', 'type_node_id'];
    const values = cols.map(c => {
      // Drizzle internally maps JS prop to DB col. Here we simulate by using
      // the reverse of our map: for each DB col, find the JS prop and its value.
      // This is intentionally not a Drizzle integration test. The real Drizzle generates:
      // INSERT INTO concepts (id, name, concept_type, core_concept, metadata_json, profile_id, type_node_id)
      // VALUES ($1, $2, $3, $4, $5, $6, $7)
      // where $N = row.conceptType (JS prop name)
      //
      // If unmapped, row.conceptType is undefined. With mapping, it is present.

      // Simulate Drizzle's property lookup:
      const jsKey = (CONCEPTS_COLUMN_MAP as Record<string, string>)[c]!;
      return mapped[jsKey];
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    db.prepare(`INSERT INTO concepts (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`)
      .run(...values as any[]);

    const rows = db.prepare('SELECT * FROM concepts WHERE id = ?').all('c1') as Record<string, unknown>[];
    const row = rows[0]!;
    expect(row['concept_type']).toBe('pattern');
    expect(row['core_concept']).toBe('lexical scope');
    expect(row['metadata_json']).toBe('{"coreConcept":"json-val"}');
    expect(row['type_node_id']).toBe('data_structure');
    expect(row['profile_id']).toBe('coding');
  });
});

// ---------------------------------------------------------------------------
// Section 1 --- Per-table column map correctness
// ---------------------------------------------------------------------------

describe('Column map: projects', () => {
  it('maps all exported columns with correct types', () => {
    const raw = {
      id: 'p1', name: 'My Project', source: 'paste',
      github_url: null, created_at: '2026-01-01T00:00:00.000Z',
      recent_file_ids: '["f1","f2"]',
    };
    const m = mapBackupRow(raw, PROJECTS_COLUMN_MAP);
    expect(m['id']).toBe('p1');
    expect(m['name']).toBe('My Project');
    expect(m['source']).toBe('paste');
    expect(m['githubUrl']).toBeNull();
    expect(m['createdAt']).toBe('2026-01-01T00:00:00.000Z');
    expect(m['recentFileIds']).toBe('["f1","f2"]');
    // Unknown keys dropped
    expect(Object.keys(m).length).toBe(6);
  });

  it('drops unknown keys', () => {
    const raw = { id: 'p1', name: 'X', source: 'github', github_url: null,
      created_at: '2026-01-01', recent_file_ids: '[]', unknown_field: 42, foo: 'bar' };
    const m = mapBackupRow(raw, PROJECTS_COLUMN_MAP);
    expect('unknown_field' in m).toBe(false);
    expect('foo' in m).toBe(false);
    expect(Object.keys(m).length).toBe(6);
  });
});

describe('Column map: files', () => {
  it('maps all columns', () => {
    const raw = {
      id: 'f1', project_id: 'p1', path: '/src/index.ts',
      content: 'export {}', marks: '[]', ranges: '[]',
    };
    const m = mapBackupRow(raw, FILES_COLUMN_MAP);
    expect(m['id']).toBe('f1');
    expect(m['projectId']).toBe('p1');
    expect(m['path']).toBe('/src/index.ts');
    expect(m['content']).toBe('export {}');
    expect(Object.keys(m).length).toBe(6);
  });
});

describe('Column map: chats', () => {
  it('maps all columns including nullable FK and JSON columns', () => {
    const raw = {
      id: 'ch1', scope: 'general', project_id: 'p1',
      file_id: null, start_line: null, end_line: null,
      folder_id: null, concept_id: null, persona_id: null,
      model_override_id: null,
      model_override: null as string | null,
      title: 'Chat 1', created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    };
    const m = mapBackupRow(raw, CHATS_COLUMN_MAP);
    expect(m['id']).toBe('ch1');
    expect(m['scope']).toBe('general');
    expect(m['projectId']).toBe('p1');
    expect(m['fileId']).toBeNull();
    expect(m['startLine']).toBeNull();
    expect(m['endLine']).toBeNull();
    expect(m['folderId']).toBeNull();
    expect(m['conceptId']).toBeNull();
    expect(m['personaId']).toBeNull();
    expect(m['modelOverrideId']).toBeNull();
    expect(m['modelOverride']).toBeNull();
    expect(m['title']).toBe('Chat 1');
    expect(m['createdAt']).toBe('2026-01-01T00:00:00.000Z');
    expect(m['updatedAt']).toBe('2026-01-01T00:00:00.000Z');
  });
});

describe('Column map: chat_messages', () => {
  it('maps all columns', () => {
    const raw = { id: 'm1', chat_id: 'ch1', role: 'user',
      content: 'Hello', created_at: '2026-01-01T00:00:00.000Z' };
    const m = mapBackupRow(raw, CHAT_MESSAGES_COLUMN_MAP);
    expect(m['id']).toBe('m1');
    expect(m['chatId']).toBe('ch1');
    expect(m['role']).toBe('user');
    expect(m['content']).toBe('Hello');
    expect(m['createdAt']).toBe('2026-01-01T00:00:00.000Z');
  });
});

describe('Column map: learning_sessions', () => {
  it('maps all columns', () => {
    const raw = {
      id: 's1', title: 'Session 1', source: 'chat',
      source_chat_id: 'ch1', concept_ids: '["c1"]',
      created_at: '2026-01-01T00:00:00.000Z',
      raw_snippet: 'snippet',
    };
    const m = mapBackupRow(raw, LEARNING_SESSIONS_COLUMN_MAP);
    expect(m['id']).toBe('s1');
    expect(m['title']).toBe('Session 1');
    expect(m['source']).toBe('chat');
    expect(m['sourceChatId']).toBe('ch1');
    expect(m['conceptIds']).toBe('["c1"]');
    expect(m['createdAt']).toBe('2026-01-01T00:00:00.000Z');
    expect(m['rawSnippet']).toBe('snippet');
  });
});

describe('Column map: concept_links', () => {
  it('maps all columns', () => {
    const raw = { from_id: 'c1', to_id: 'c2', kind: 'related', weight: 0.8 };
    const m = mapBackupRow(raw, CONCEPT_LINKS_COLUMN_MAP);
    expect(m['fromId']).toBe('c1');
    expect(m['toId']).toBe('c2');
    expect(m['kind']).toBe('related');
    expect(m['weight']).toBe(0.8);
  });
});

describe('Column map: profile_branches', () => {
  it('maps all columns including overlay_json', () => {
    const raw = {
      id: 'b1',
      parent_profile_id: 'coding',
      branch_kind: 'project',
      name: 'Project A',
      overlay_json: '{"kind":"project","id":"o1"}',
      created_at: 1000,
      updated_at: 2000,
    };
    const m = mapBackupRow(raw, PROFILE_BRANCHES_COLUMN_MAP);
    expect(m['id']).toBe('b1');
    expect(m['parentProfileId']).toBe('coding');
    expect(m['branchKind']).toBe('project');
    expect(m['name']).toBe('Project A');
    expect(m['overlayJson']).toBe('{"kind":"project","id":"o1"}');
    expect(m['createdAt']).toBe(1000);
    expect(m['updatedAt']).toBe(2000);
    expect(Object.keys(m).length).toBe(7);
  });

  it('drops unknown keys', () => {
    const raw = {
      id: 'b1',
      parent_profile_id: 'coding',
      branch_kind: 'project',
      name: 'Project A',
      overlay_json: '{}',
      created_at: 1000,
      updated_at: 2000,
      unknown_field: 42,
    };
    const m = mapBackupRow(raw, PROFILE_BRANCHES_COLUMN_MAP);
    expect('unknown_field' in m).toBe(false);
    expect(Object.keys(m).length).toBe(7);
  });
});

describe('JSON decoding for Drizzle insert shape', () => {
  it('decodes project JSON columns', () => {
    const mapped = mapBackupRow(
      { id: 'p1', recent_file_ids: '["f1","f2"]' },
      PROJECTS_COLUMN_MAP,
      TABLE_JSON_COLUMNS['projects']!,
    );
    expect(mapped['recentFileIds']).toEqual(['f1', 'f2']);
  });

  it('decodes concept JSON columns into arrays and objects', () => {
    const mapped = mapBackupRow(
      profileConceptRaw({
        language_or_runtime_json: '["javascript"]',
        surface_features_json: '["closure"]',
        metadata_json: '{"coreConcept":"x"}',
      }),
      CONCEPTS_COLUMN_MAP,
      TABLE_JSON_COLUMNS['concepts']!,
    );

    expect(mapped['languageOrRuntime']).toEqual(['javascript']);
    expect(mapped['surfaceFeatures']).toEqual(['closure']);
    expect(mapped['metadataJson']).toEqual({ coreConcept: 'x' });
  });

  it('decodes capture JSON columns into objects, arrays, and null', () => {
    const hint = makeHint();
    const classification = buildCaptureClassificationJson(hint);
    const mapped = mapBackupRow(
      legacyCaptureRaw({
        concept_hint_json: JSON.stringify(hint),
        classification_json: JSON.stringify(classification),
        keywords_json: '["react","hooks"]',
      }),
      LEARNING_CAPTURES_COLUMN_MAP,
      TABLE_JSON_COLUMNS['learning_captures']!,
    );

    expect(mapped['conceptHint']).toEqual(hint);
    expect(mapped['classificationJson']).toEqual(classification);
    expect(mapped['keywords']).toEqual(['react', 'hooks']);

    const nullMapped = mapBackupRow(
      legacyCaptureRaw({ concept_hint_json: null, classification_json: null }),
      LEARNING_CAPTURES_COLUMN_MAP,
      TABLE_JSON_COLUMNS['learning_captures']!,
    );
    expect(nullMapped['conceptHint']).toBeNull();
    expect(nullMapped['classificationJson']).toBeNull();
  });

  it('decodes profile_branches overlay_json', () => {
    const mapped = mapBackupRow(
      { id: 'b1', parent_profile_id: 'coding', branch_kind: 'project', name: 'P', overlay_json: '{"kind":"project"}', created_at: 1, updated_at: 1 },
      PROFILE_BRANCHES_COLUMN_MAP,
      TABLE_JSON_COLUMNS['profile_branches']!,
    );
    expect(mapped['overlayJson']).toEqual({ kind: 'project' });
  });

  it('throws on malformed JSON before import insert', () => {
    expect(() => mapBackupRow(
      { id: 'p1', recent_file_ids: '{bad json' },
      PROJECTS_COLUMN_MAP,
      TABLE_JSON_COLUMNS['projects']!,
    )).toThrow(/Invalid JSON in backup column recent_file_ids/);
  });
});

// ---------------------------------------------------------------------------
// Section 2 --- Concepts: old backups without profile columns
// ---------------------------------------------------------------------------

describe('Old concept backup row (snake_case, no profile columns)', () => {
  it('maps safely --- profile columns absent from raw input', () => {
    const raw = legacyConceptRaw();
    expect('profile_id' in raw).toBe(false);
    expect('type_node_id' in raw).toBe(false);
    expect('metadata_json' in raw).toBe(false);

    const mapped = mapBackupRow(raw, CONCEPTS_COLUMN_MAP, TABLE_JSON_COLUMNS['concepts']!);
    // profileId, typeNodeId, metadataJson are absent from mapped output
    // (not in the raw row --- not included by mapper)
    expect('profileId' in mapped).toBe(false);
    expect('typeNodeId' in mapped).toBe(false);
    expect('metadataJson' in mapped).toBe(false);
  });

  it('mapped row parses via conceptRowToDomain', () => {
    const raw = legacyConceptRaw();
    const mapped = mapBackupRow(raw, CONCEPTS_COLUMN_MAP, TABLE_JSON_COLUMNS['concepts']!);
    // conceptRowToDomain accepts Partial<...> for profile columns.
    const domain = conceptRowToDomain(asConceptRow(mapped));
    expect(domain.id).toBe(VALID_CONCEPT_ID);
    expect(domain.name).toBe('Closure');
    expect(domain.conceptType).toBe('mechanism');
    expect(domain.coreConcept).toBe('lexical scope');
  });

  it('all known concept_type values survive mapping + parse', () => {
    for (const ct of CONCEPT_TYPES) {
      const raw = legacyConceptRaw({ concept_type: ct });
      const mapped = mapBackupRow(raw, CONCEPTS_COLUMN_MAP, TABLE_JSON_COLUMNS['concepts']!);
      expect(conceptRowToDomain(asConceptRow(mapped)).conceptType).toBe(ct);
    }
  });

  it('legacy metadata columns populate domain correctly after mapping', () => {
    const raw = legacyConceptRaw({
      core_concept: 'lexical scope',
      architectural_pattern: 'event-driven',
      programming_paradigm: null,
    });
    const mapped = mapBackupRow(raw, CONCEPTS_COLUMN_MAP, TABLE_JSON_COLUMNS['concepts']!);
    expect(mapped['coreConcept']).toBe('lexical scope');
    expect(mapped['architecturalPattern']).toBe('event-driven');
    expect(mapped['programmingParadigm']).toBeNull();

    const domain = conceptRowToDomain(asConceptRow(mapped));
    expect(domain.coreConcept).toBe('lexical scope');
    expect(domain.architecturalPattern).toBe('event-driven');
    expect(domain.programmingParadigm).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Section 3 --- Concepts: new backups with profile columns
// ---------------------------------------------------------------------------

describe('New concept backup row (snake_case, with profile columns)', () => {
  it('maps profile columns to Drizzle keys', () => {
    const raw = profileConceptRaw();
    const mapped = mapBackupRow(raw, CONCEPTS_COLUMN_MAP, TABLE_JSON_COLUMNS['concepts']!);
    expect(mapped['profileId']).toBe('coding');
    expect(mapped['typeNodeId']).toBe('pattern');
    expect(mapped['metadataJson']).toEqual({ coreConcept: 'json-core', architecturalPattern: 'json-arch' });
  });

  it('typeNodeId wins over conceptType after mapping + parse', () => {
    const raw = profileConceptRaw({ type_node_id: 'data_structure', concept_type: 'mechanism' });
    const mapped = mapBackupRow(raw, CONCEPTS_COLUMN_MAP, TABLE_JSON_COLUMNS['concepts']!);
    expect(mapped['typeNodeId']).toBe('data_structure');
    expect(mapped['conceptType']).toBe('mechanism');
    const domain = conceptRowToDomain(asConceptRow(mapped));
    expect(domain.conceptType).toBe('data_structure');
  });

  it('metadata_json (as string) correctly feeds metadata fields', () => {
    const raw = profileConceptRaw({
      metadata_json: '{"coreConcept":"string-val","architecturalPattern":"string-arch"}',
      core_concept: 'legacy-core',
      architectural_pattern: 'legacy-arch',
    });
    const mapped = mapBackupRow(raw, CONCEPTS_COLUMN_MAP, TABLE_JSON_COLUMNS['concepts']!);
    const domain = conceptRowToDomain(asConceptRow(mapped));
    expect(domain.coreConcept).toBe('string-val');
    expect(domain.architecturalPattern).toBe('string-arch');
  });

  it('round-trips all concept_type values through type_node_id', () => {
    for (const ct of CONCEPT_TYPES) {
      const raw = profileConceptRaw({ type_node_id: ct, concept_type: ct });
      const mapped = mapBackupRow(raw, CONCEPTS_COLUMN_MAP, TABLE_JSON_COLUMNS['concepts']!);
      expect(conceptRowToDomain(asConceptRow(mapped)).conceptType).toBe(ct);
    }
  });

  it('drops embedding key (not a DB column)', () => {
    const raw = { ...profileConceptRaw(), embedding: { vectorBase64: 'AAAA' } };
    const mapped = mapBackupRow(raw, CONCEPTS_COLUMN_MAP, TABLE_JSON_COLUMNS['concepts']!);
    // embedding is not in the column map --- dropped
    expect('embedding' in mapped).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Section 4 --- Captures: old backups without profile columns
// ---------------------------------------------------------------------------

describe('Old capture backup row (snake_case, no profile columns)', () => {
  it('maps safely --- profile columns absent from raw input', () => {
    const raw = legacyCaptureRaw();
    expect('profile_id' in raw).toBe(false);
    expect('classification_json' in raw).toBe(false);

    const mapped = mapBackupRow(raw, LEARNING_CAPTURES_COLUMN_MAP, TABLE_JSON_COLUMNS['learning_captures']!);
    expect('profileId' in mapped).toBe(false);
    expect('classificationJson' in mapped).toBe(false);
  });

  it('maps concept_hint_json --- conceptHint', () => {
    const hint = makeHint();
    const raw = legacyCaptureRaw({ concept_hint_json: JSON.stringify(hint) });
    const mapped = mapBackupRow(raw, LEARNING_CAPTURES_COLUMN_MAP, TABLE_JSON_COLUMNS['learning_captures']!);
    expect(mapped['conceptHint']).toEqual(hint);
  });

  it('mapped row parses via captureRowToDomain', () => {
    const raw = legacyCaptureRaw({
      concept_hint_json: JSON.stringify(makeHint()),
    });
    const mapped = mapBackupRow(raw, LEARNING_CAPTURES_COLUMN_MAP, TABLE_JSON_COLUMNS['learning_captures']!);
    const capture = captureRowToDomain(asCaptureRow(mapped));
    expect(capture.title).toBe('Closure in for-loop');
    expect(capture.state).toBe('unresolved');
    expect(capture.conceptHint).not.toBeNull();
    expect(capture.conceptHint!.proposedName).toBe('Closure');
  });

  it('maps what_clicked, keywords_json, and other nontrivial fields', () => {
    const raw = legacyCaptureRaw({
      what_clicked: 'Clicked on something',
      keywords_json: '["react","hooks"]',
      raw_snippet: 'useEffect(() => {}, [])',
      chat_message_id: 'msg1',
      session_id: 's1',
    });
    const mapped = mapBackupRow(raw, LEARNING_CAPTURES_COLUMN_MAP, TABLE_JSON_COLUMNS['learning_captures']!);
    expect(mapped['whatClicked']).toBe('Clicked on something');
    expect(mapped['keywords']).toEqual(['react', 'hooks']);
    expect(mapped['rawSnippet']).toBe('useEffect(() => {}, [])');
    expect(mapped['chatMessageId']).toBe('msg1');
    expect(mapped['sessionId']).toBe('s1');
  });
});

// ---------------------------------------------------------------------------
// Section 5 --- Captures: new backups with profile columns
// ---------------------------------------------------------------------------

describe('New capture backup row (snake_case, with profile columns)', () => {
  it('maps profile_id and classification_json to Drizzle keys', () => {
    const raw = profileCaptureRaw();
    const mapped = mapBackupRow(raw, LEARNING_CAPTURES_COLUMN_MAP, TABLE_JSON_COLUMNS['learning_captures']!);
    expect(mapped['profileId']).toBe('coding');
    expect(typeof mapped['classificationJson']).toBe('object');
  });

  it('classificationJson reconstructs conceptHint when conceptHint is null', () => {
    const raw = profileCaptureRaw();
    raw['concept_hint_json'] = null;
    const mapped = mapBackupRow(raw, LEARNING_CAPTURES_COLUMN_MAP, TABLE_JSON_COLUMNS['learning_captures']!);
    const capture = captureRowToDomain(asCaptureRow(mapped));
    expect(capture.conceptHint).not.toBeNull();
    expect(capture.conceptHint!.proposedConceptType).toBe('mental_model');
    expect(capture.conceptHint!.proposedName).toBe('Lexical Closure');
  });

  it('invalid classification_json throws before import insert', () => {
    const raw = {
      ...legacyCaptureRaw(),
      profile_id: 'coding',
      classification_json: '{not valid',
      concept_hint_json: null,
    };
    expect(() => mapBackupRow(
      raw,
      LEARNING_CAPTURES_COLUMN_MAP,
      TABLE_JSON_COLUMNS['learning_captures']!,
    )).toThrow(/Invalid JSON in backup column classification_json/);
  });

  it('conceptHint column wins over classificationJson when both present', () => {
    const primaryHint = makeHint({ proposedConceptType: 'mechanism' });
    const fallbackCj = buildCaptureClassificationJson(makeHint({ proposedConceptType: 'pattern' }));
    const raw = {
      ...legacyCaptureRaw(),
      profile_id: 'coding',
      concept_hint_json: JSON.stringify(primaryHint),
      classification_json: JSON.stringify(fallbackCj),
    };
    const mapped = mapBackupRow(raw, LEARNING_CAPTURES_COLUMN_MAP, TABLE_JSON_COLUMNS['learning_captures']!);
    const capture = captureRowToDomain(asCaptureRow(mapped));
    expect(capture.conceptHint!.proposedConceptType).toBe('mechanism');
  });
});

// ---------------------------------------------------------------------------
// Section 6 --- Post-mapping codec round-trip verification
// ---------------------------------------------------------------------------

describe('Post-mapping codec round-trip', () => {
  it('concept: old backup (no new cols) --- map --- conceptRowToDomain', () => {
    const raw = legacyConceptRaw();
    const mapped = mapBackupRow(raw, CONCEPTS_COLUMN_MAP, TABLE_JSON_COLUMNS['concepts']!);
    const domain = conceptRowToDomain(asConceptRow(mapped));
    expect(domain.id).toBe(VALID_CONCEPT_ID);
    expect(domain.conceptType).toBe('mechanism');
    expect(domain.coreConcept).toBe('lexical scope');
    expect(domain.architecturalPattern).toBeNull();
    expect(domain.programmingParadigm).toBeNull();
  });

  it('concept: new backup (all cols) --- map --- conceptRowToDomain', () => {
    const raw = profileConceptRaw({
      type_node_id: 'api_idiom',
      metadata_json: '{"coreConcept":"promises","programmingParadigm":"async"}',
    });
    const mapped = mapBackupRow(raw, CONCEPTS_COLUMN_MAP, TABLE_JSON_COLUMNS['concepts']!);
    const domain = conceptRowToDomain(asConceptRow(mapped));
    expect(domain.conceptType).toBe('api_idiom');
    expect(domain.coreConcept).toBe('promises');
    expect(domain.programmingParadigm).toBe('async');
  });

  it('capture: old backup (no new cols) --- map --- captureRowToDomain', () => {
    const raw = legacyCaptureRaw();
    const mapped = mapBackupRow(raw, LEARNING_CAPTURES_COLUMN_MAP, TABLE_JSON_COLUMNS['learning_captures']!);
    const capture = captureRowToDomain(asCaptureRow(mapped));
    expect(capture.id).toBe(VALID_CAPTURE_ID);
    expect(capture.title).toBe('Closure in for-loop');
    expect(capture.conceptHint).toBeNull();
  });

  it('capture: new backup (all cols) --- map --- captureRowToDomain', () => {
    const raw = profileCaptureRaw();
    const mapped = mapBackupRow(raw, LEARNING_CAPTURES_COLUMN_MAP, TABLE_JSON_COLUMNS['learning_captures']!);
    const capture = captureRowToDomain(asCaptureRow(mapped));
    expect(capture.id).toBe(VALID_CAPTURE_ID);
    expect(capture.conceptHint).not.toBeNull();
    expect(capture.conceptHint!.proposedConceptType).toBe('mental_model');
    expect(capture.title).toBe('Closure in for-loop');
  });
});

// ---------------------------------------------------------------------------
// Section 7 --- TABLE_COLUMN_MAPS consistency
// ---------------------------------------------------------------------------

describe('TABLE_COLUMN_MAPS index', () => {
  const exportedTables = [
    'projects', 'files', 'chats', 'chat_messages',
    'learning_sessions', 'learning_captures', 'concepts', 'concept_links',
    'profile_branches',
  ];

  it('contains an entry for every exported table', () => {
    for (const t of exportedTables) {
      expect(TABLE_COLUMN_MAPS[t]).toBeDefined();
    }
  });

  it('every map key is the output of the dedicated export', () => {
    expect(TABLE_COLUMN_MAPS['projects']).toBe(PROJECTS_COLUMN_MAP);
    expect(TABLE_COLUMN_MAPS['files']).toBe(FILES_COLUMN_MAP);
    expect(TABLE_COLUMN_MAPS['chats']).toBe(CHATS_COLUMN_MAP);
    expect(TABLE_COLUMN_MAPS['chat_messages']).toBe(CHAT_MESSAGES_COLUMN_MAP);
    expect(TABLE_COLUMN_MAPS['learning_sessions']).toBe(LEARNING_SESSIONS_COLUMN_MAP);
    expect(TABLE_COLUMN_MAPS['learning_captures']).toBe(LEARNING_CAPTURES_COLUMN_MAP);
    expect(TABLE_COLUMN_MAPS['concepts']).toBe(CONCEPTS_COLUMN_MAP);
    expect(TABLE_COLUMN_MAPS['concept_links']).toBe(CONCEPT_LINKS_COLUMN_MAP);
    expect(TABLE_COLUMN_MAPS['profile_branches']).toBe(PROFILE_BRANCHES_COLUMN_MAP);
  });

  it('every map has the expected number of columns', () => {
    expect(Object.keys(PROJECTS_COLUMN_MAP).length).toBe(6);
    expect(Object.keys(FILES_COLUMN_MAP).length).toBe(6);
    expect(Object.keys(CHATS_COLUMN_MAP).length).toBe(14);
    expect(Object.keys(CHAT_MESSAGES_COLUMN_MAP).length).toBe(5);
    expect(Object.keys(LEARNING_SESSIONS_COLUMN_MAP).length).toBe(7);
    expect(Object.keys(LEARNING_CAPTURES_COLUMN_MAP).length).toBe(26);
    expect(Object.keys(CONCEPTS_COLUMN_MAP).length).toBe(28);
    expect(Object.keys(CONCEPT_LINKS_COLUMN_MAP).length).toBe(4);
    expect(Object.keys(PROFILE_BRANCHES_COLUMN_MAP).length).toBe(7);
  });
});
