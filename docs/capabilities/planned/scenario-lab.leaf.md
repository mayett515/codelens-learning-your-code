---
schemaVersion: 1
inspectedOn: "2026-11-09"
id: scenario-lab
domain: evolution
summary: Replay seeded lifecycle cases with explicit expected outcomes
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

# Replay seeded lifecycle cases with explicit expected outcomes

K8 first card: proposal snapshot 10, current branch 20. Replay the stale-apply
case with fixed seed, identifiers and times; acceptance fails and target,
proposal and audit remain unchanged after reopening storage. Repeat with the
same seed for the same result. Later cards cover source mismatch and replacement.
