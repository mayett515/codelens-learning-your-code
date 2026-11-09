---
schemaVersion: 1
inspectedOn: "2026-11-09"
id: branch-proposal-apply
domain: evolution
summary: Guard and apply a pending change to its target branch
state: partial
owners:
  - path: codelens-rn/src/features/ontology/data/branchLocalProposalApplyService.ts
    symbol: applyPendingBranchLocalProfileChangeProposal
    role: orchestration
evidence:
  - path: codelens-rn/src/features/ontology/__tests__/branchLocalProposalApplyService.test.ts
    kind: unit
    covers: Service behavior and missing or stale proposal revision rejection before any write with injected persistence dependencies
gaps:
  - Missing-snapshot proposals are now blocked and must be recreated until the separately authorized explicit refresh slice is implemented.
reason: Apply revision enforcement is repaired; recovery for legacy unknown proposals remains pending in slice B.
revisit: Add explicit validated replacement-plus-supersede refresh for missing-snapshot proposals, then close this recovery gap.
---

# Guard and apply a pending change to its target branch

The service owns current target checks and the atomic target/status/event intent. The cited unit suite is not proof of actual SQLite rollback.

The 2026-11-09 regression checks snapshot 10, null and undefined against current
branch 20: no branch/status/audit write is attempted and supplied records remain
unchanged. The service reuses the pure freshness decision after patch validation;
the compiled current revision separately protects the conditional write.
