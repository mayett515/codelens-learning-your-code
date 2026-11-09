---
schemaVersion: 1
inspectedOn: "2026-11-09"
id: source-adapters
domain: integrations
summary: Read a repository revision into sourced and scoped nodes
state: planned
owners: []
evidence:
  - path: docs/progress/2026-11-09-core-roadmap.md
    kind: design
    covers: Planned acceptance scenario and roadmap order
gaps:
  - No executable owner or runtime proof exists for this scenario.
reason: Owner-approved future direction after the first headless rule lifecycle.
revisit: Implement the bounded scenario after its required history and persistence boundaries exist.
---

# Read a repository revision into sourced and scoped nodes

K5 seed: two repositories with the same symbol name. Read a fixed revision of
one into observations with repository scope, file and revision provenance. A
second read preserves identity and reports changed input without accepting a
new interpretation. The other repository remains separate. No source write.
