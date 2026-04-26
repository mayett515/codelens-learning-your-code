CREATE TABLE IF NOT EXISTS learning_captures (
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
);

CREATE INDEX IF NOT EXISTS idx_captures_state ON learning_captures(state);
CREATE INDEX IF NOT EXISTS idx_captures_linked_concept ON learning_captures(linked_concept_id);
CREATE INDEX IF NOT EXISTS idx_captures_session ON learning_captures(session_id);
CREATE INDEX IF NOT EXISTS idx_captures_created_at ON learning_captures(created_at DESC);
