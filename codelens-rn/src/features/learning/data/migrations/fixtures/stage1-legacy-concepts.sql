-- Stage 10 Phase A fixture: legacy pre-capture-first concepts shape.
-- Stage 1 migration tests should copy this snapshot, migrate it, then verify
-- branded IDs, JSON codecs, normalized keys, and language_syntax preservation.

CREATE TABLE schema_version (
  version INTEGER PRIMARY KEY
);

INSERT INTO schema_version (version) VALUES (3);

CREATE TABLE concepts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  summary TEXT NOT NULL,
  taxonomy TEXT NOT NULL DEFAULT '{"tags":[]}',
  session_ids TEXT NOT NULL DEFAULT '[]',
  strength REAL NOT NULL DEFAULT 0.5,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT INTO concepts (
  id,
  name,
  summary,
  taxonomy,
  session_ids,
  strength,
  created_at,
  updated_at
) VALUES
(
  'c_legacy_closure',
  'Closure',
  'A function keeps access to variables from its lexical scope.',
  '{"language":"javascript","tags":["javascript","scope","closure"]}',
  '["session_1"]',
  0.42,
  '2026-04-20T10:00:00.000Z',
  '2026-04-20T10:00:00.000Z'
),
(
  'c_legacy_cache',
  'Memoization',
  'Cache function results by input to avoid repeated expensive work.',
  '{"language":"typescript","tags":["typescript","performance","cache"]}',
  '["session_2"]',
  0.67,
  '2026-04-21T10:00:00.000Z',
  '2026-04-21T10:00:00.000Z'
);
