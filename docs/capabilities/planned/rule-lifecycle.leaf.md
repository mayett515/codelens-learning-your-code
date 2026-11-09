---
schemaVersion: 1
inspectedOn: "2026-11-09"
id: rule-lifecycle
domain: evolution
summary: Turn a sourced experience into accepted scoped knowledge with traceable replacement
state: planned
owners: []
evidence:
  - path: docs/progress/2026-11-09-core-roadmap.md
    kind: design
    covers: Seeded headless experience-to-rule scenario including restart, replacement and stale rejection
  - path: docs/reviews/2026-11-09-rule-model-interview.md
    kind: design
    covers: Decided shared profile lifecycle, seven limited compatibility probes and accepted R1-R4 semantics
gaps:
  - Rule-kind, provenance, accepted history and reconsideration are approved but not implemented; R3 and A1 must share one history basis.
  - Portable source validation, atomic lifecycle and desktop persistence are not implemented.
  - Atomicity and restart retrieval have no standalone runtime proof.
reason: Former M5 is now the first product proof after extraction and local storage.
revisit: After the separate headless profile slice and storage decision, implement the shared lifecycle CLI scenario and prove rollback after each write against actual persistence.
---

# Experience to accepted rule

An observation does not become a rule merely by being captured. Acceptance checks
source, scope and current revision; accepted knowledge retains history when
replaced. A leaf reader or model-generated summary cannot satisfy this capability.
