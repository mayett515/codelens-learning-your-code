---
schemaVersion: 1
inspectedOn: "2026-11-09"
id: standalone-core
domain: meaning
summary: Execute portable meaning decisions without application dependencies
state: planned
owners: []
evidence:
  - path: docs/reviews/2026-11-09-core-package-boundary.md
    kind: design
    covers: Proposed package exports, explicit storage and atomic ports, compatibility and isolated-test proof
  - path: docs/reviews/2026-11-09-core-module-inventory.md
    kind: design
    covers: Dated inspection of 69 modules and 52 ontology test files; not an executed standalone package
gaps:
  - The package boundary awaits owner approval; no standalone package or independent build exists.
reason: The owner prioritizes standalone Kordex Core over further app-shell repair.
revisit: Approve the boundary, extract without behavior change and execute tests in an isolated core-only install.
---

# Standalone meaning decisions

First milestone in the [core roadmap](../../progress/2026-11-09-core-roadmap.md).
Move leaves beside their real owners only after extraction. Existing app source
is input, not evidence that a standalone core already runs.
