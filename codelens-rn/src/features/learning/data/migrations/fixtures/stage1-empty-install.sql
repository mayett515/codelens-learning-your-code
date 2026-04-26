-- Stage 10 Phase A fixture: empty current install before Stage 1 schema work.
-- Stage 1 fresh-install tests should migrate this snapshot and assert the
-- capture-first schema exists with no placeholder captures or concepts.

CREATE TABLE schema_version (
  version INTEGER PRIMARY KEY
);

INSERT INTO schema_version (version) VALUES (3);
