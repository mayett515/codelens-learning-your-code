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
  - path: codelens-rn/src/features/ontology/data/profileChangeProposalRefreshService.ts
    symbol: refreshStaleProfileChangeProposal
    role: orchestration
evidence:
  - path: codelens-rn/src/features/ontology/__tests__/profileChangeProposalLifecycleService.test.ts
    kind: unit
    covers: Replacement validation, conditional lifecycle update and audit intent
  - path: codelens-rn/src/features/ontology/__tests__/profileChangeProposalRefreshService.test.ts
    kind: unit
    covers: Explicit refresh of stale or missing branch snapshots, pending replacement, supersession audit and conflict rejection before writes
  - path: packages/kordex-core/src/__tests__/profileProposalFreshness.test.ts
    kind: unit
    covers: Unknown branch proposals remain ineligible for apply and become refreshable only with a known current revision and validated patch
gaps: []
reason: ""
revisit: ""
---

# Supersede a pending proposal with a linked pending replacement

Replacement retains lineage rather than silently rewriting a historical proposal.
Edit delegates to the lifecycle service; refresh owns its existing transaction
and performs the same insert/conditional supersede/audit protocol directly.
The previous description incorrectly claimed refresh called the lifecycle service.

An explicit refresh may establish a current basis for a branch proposal whose old
snapshot is null or absent. The old proposal remains unknown until superseded;
the replacement remains pending and does not mutate the branch or apply itself.
The tests use injected repositories and prove decisions/calls, not SQLite rollback.
