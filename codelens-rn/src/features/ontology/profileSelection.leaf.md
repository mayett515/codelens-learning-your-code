---
schemaVersion: 1
inspectedOn: "2026-11-09"
id: profile-selection
domain: meaning
summary: Resolve a base and ordered branch selection
state: partial
owners:
  - path: codelens-rn/src/features/ontology/profileSelection.ts
    symbol: resolveProfileSelection
    role: decision
evidence:
  - path: codelens-rn/src/features/ontology/__tests__/profileSelection.test.ts
    kind: unit
    covers: Selection resolution, missing IDs and branch-kind checks
gaps:
  - Selected branch parentProfileId is not checked against the selected base in the pure resolver.
reason: Concrete integration or validation gap found in the inspected implementation.
revisit: Implement the missing boundary and add a regression that exercises the actual affected path.
---

# Resolve a base and ordered branch selection

UI parent filtering is not resolver enforcement. Preserve valid branch ordering when closing the gap.
