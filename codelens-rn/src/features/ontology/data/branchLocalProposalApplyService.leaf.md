---
schemaVersion: 1
inspectedOn: "2026-11-09"
id: branch-proposal-apply
domain: evolution
summary: Guard and apply a pending change to its target branch
state: implemented
owners:
  - path: codelens-rn/src/features/ontology/data/branchLocalProposalApplyService.ts
    symbol: applyPendingBranchLocalProfileChangeProposal
    role: orchestration
evidence:
  - path: codelens-rn/src/features/ontology/__tests__/branchLocalProposalApplyService.test.ts
    kind: unit
    covers: Service behavior with injected persistence dependencies
gaps: []
reason: ""
revisit: ""
---

# Guard and apply a pending change to its target branch

The service owns current target checks and the atomic target/status/event intent. The cited unit suite is not proof of actual SQLite rollback.
