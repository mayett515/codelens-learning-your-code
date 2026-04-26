import type { Migration } from './index';

const conceptTypeCheck = `concept_type IN (
  'mechanism',
  'mental_model',
  'pattern',
  'architecture_principle',
  'language_feature',
  'api_idiom',
  'data_structure',
  'algorithmic_idea',
  'performance_principle',
  'debugging_heuristic',
  'failure_mode',
  'testing_principle'
)`;

function normalizedConceptNameSql(column: string): string {
  let expr = `replace(replace(replace(${column}, char(9), ' '), char(10), ' '), char(13), ' ')`;
  for (let index = 0; index < 8; index += 1) {
    expr = `replace(${expr}, '  ', ' ')`;
  }
  return `lower(trim(${expr}))`;
}

export const migration004: Migration = {
  version: 4,
  up: [
    `CREATE TABLE IF NOT EXISTS learning_captures (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      what_clicked TEXT NOT NULL,
      why_it_mattered TEXT,
      raw_snippet TEXT NOT NULL,
      snippet_lang TEXT,
      snippet_source_path TEXT,
      snippet_start_line INTEGER,
      snippet_end_line INTEGER,
      chat_message_id TEXT,
      session_id TEXT,
      state TEXT NOT NULL DEFAULT 'unresolved' CHECK(state IN ('unresolved', 'linked', 'proposed_new')),
      linked_concept_id TEXT REFERENCES concepts(id) ON DELETE SET NULL,
      editable_until INTEGER NOT NULL,
      extraction_confidence REAL CHECK(extraction_confidence IS NULL OR (extraction_confidence >= 0 AND extraction_confidence <= 1)),
      derived_from_capture_id TEXT REFERENCES learning_captures(id) ON DELETE SET NULL,
      embedding_status TEXT NOT NULL DEFAULT 'pending' CHECK(embedding_status IN ('pending', 'ready', 'failed')),
      embedding_retry_count INTEGER NOT NULL DEFAULT 0,
      concept_hint_json TEXT,
      keywords_json TEXT NOT NULL DEFAULT '[]',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      CHECK(state = 'linked' OR linked_concept_id IS NULL)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_captures_state ON learning_captures(state)`,
    `CREATE INDEX IF NOT EXISTS idx_captures_linked_concept ON learning_captures(linked_concept_id)`,
    `CREATE INDEX IF NOT EXISTS idx_captures_session ON learning_captures(session_id)`,
    `CREATE INDEX IF NOT EXISTS idx_captures_created_at ON learning_captures(created_at DESC)`,

    `ALTER TABLE concepts ADD COLUMN normalized_key TEXT NOT NULL DEFAULT ''`,
    `UPDATE concepts SET normalized_key = ${normalizedConceptNameSql('name')} WHERE normalized_key = ''`,
    `ALTER TABLE concepts ADD COLUMN canonical_summary TEXT`,
    `UPDATE concepts SET canonical_summary = summary WHERE canonical_summary IS NULL`,
    `ALTER TABLE concepts ADD COLUMN concept_type TEXT NOT NULL DEFAULT 'mental_model' CHECK(${conceptTypeCheck})`,
    `ALTER TABLE concepts ADD COLUMN core_concept TEXT`,
    `ALTER TABLE concepts ADD COLUMN architectural_pattern TEXT`,
    `ALTER TABLE concepts ADD COLUMN programming_paradigm TEXT`,
    `ALTER TABLE concepts ADD COLUMN language_or_runtime_json TEXT NOT NULL DEFAULT '[]'`,
    `ALTER TABLE concepts ADD COLUMN surface_features_json TEXT NOT NULL DEFAULT '[]'`,
    `ALTER TABLE concepts ADD COLUMN prerequisites_json TEXT NOT NULL DEFAULT '[]'`,
    `ALTER TABLE concepts ADD COLUMN related_concepts_json TEXT NOT NULL DEFAULT '[]'`,
    `ALTER TABLE concepts ADD COLUMN contrast_concepts_json TEXT NOT NULL DEFAULT '[]'`,
    `ALTER TABLE concepts ADD COLUMN representative_capture_ids_json TEXT NOT NULL DEFAULT '[]'`,
    `ALTER TABLE concepts ADD COLUMN familiarity_score REAL NOT NULL DEFAULT 0 CHECK(familiarity_score >= 0 AND familiarity_score <= 1)`,
    `ALTER TABLE concepts ADD COLUMN importance_score REAL NOT NULL DEFAULT 0 CHECK(importance_score >= 0 AND importance_score <= 1)`,
    `ALTER TABLE concepts ADD COLUMN language_syntax_legacy TEXT`,
    `CREATE UNIQUE INDEX IF NOT EXISTS unique_concepts_normalized_key ON concepts(normalized_key)`,
    `CREATE INDEX IF NOT EXISTS idx_concepts_concept_type ON concepts(concept_type)`,
    `CREATE TRIGGER IF NOT EXISTS concepts_capture_unlink_bd
      BEFORE DELETE ON concepts
      BEGIN
        UPDATE learning_captures
        SET state = 'unresolved',
            linked_concept_id = NULL,
            updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000
        WHERE linked_concept_id = old.id;
      END`,
  ],
};
