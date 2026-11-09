---
schemaVersion: 1
inspectedOn: "2026-11-09"
id: proposal-replacement
domain: evolution
summary: Supersede a pending proposal with a linked pending replacement
state: implemented
owners:
  - path: codelens-rn/src/features/ontology/data/profileChangeProposalLifecycleService.ts
    symbol: supersedePendingProfileChangeProposal
    role: orchestration
evidence:
  - path: codelens-rn/src/features/ontology/__tests__/profileChangeProposalLifecycleService.test.ts
    kind: unit
    covers: Replacement validation, conditional lifecycle update and audit intent
gaps: []
reason: ""
revisit: ""
---

# Supersede a pending proposal with a linked pending replacement

Edit/refresh workflows call this lifecycle boundary; replacement retains lineage rather than silently rewriting a historical proposal.
