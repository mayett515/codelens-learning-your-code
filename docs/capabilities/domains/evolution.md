# Evolution

This domain owns how interpreted meaning can change while keeping scope, intent
and provenance. The existing implementation has correction evidence, inert
proposals, review/replacement and guarded profile application.

- **D1 (P2/G2):** observations/corrections are evidence; proposals identify intended
  changes and targets. One must not be silently rewritten as the other.
- **D2 (P2/G2):** a producer can propose supported changes but cannot grant itself
  authority to apply them. Existing checker behavior is manual and branch-local.
- **D3 (P3/G3):** apply checks current target/status/revision and commits its
  target, conditional lifecycle transition and audit atomically.
- **D4 (P2/G4):** review events and mutation events retain their distinct meaning;
  asking why does not establish that ontology state changed.
- **D5 (P3):** edits and refreshes preserve replacement lineage. New operation
  kinds require implemented validation, application and verification semantics.
  An explicitly requested refresh may establish a current basis for a legacy
  branch proposal without a snapshot; it does not certify the old basis or
  authorize applying the replacement without a separate review/apply.

These are implementation obligations, not an extra approval gate for ordinary
repository work. Evidence references in leaves locate tests but do not certify
that actual database rollback was tested.
