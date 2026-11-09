---
schemaVersion: 1
inspectedOn: "2026-11-09"
id: accepted-history
domain: evolution
summary: Compare accepted states and restore content through a new guarded acceptance
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

# Compare accepted states and restore content through a new guarded acceptance

K7 seed: two accepted versions of one scoped rule. Compare exact retained
content and evidence. Propose restoration of the earlier content against the
current revision, review and accept it as a third version. Both earlier states
remain inspectable; a competing stale restoration fails without partial writes.
