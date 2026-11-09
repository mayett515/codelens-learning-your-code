---
schemaVersion: 1
inspectedOn: "2026-11-09"
id: base-proposal-apply
domain: evolution
summary: Apply a version-guarded pending change to a stored base definition
state: partial
owners:
  - path: codelens-rn/src/features/ontology/data/baseProfileProposalApplyService.ts
    symbol: applyPendingBaseProfileChangeProposal
    role: orchestration
evidence:
  - path: codelens-rn/src/features/ontology/__tests__/baseProfileProposalApplyService.test.ts
    kind: unit
    covers: Version-guarded base apply with injected dependencies
gaps:
  - Default built-in editing/reload is blocked by the registry versus stored-definition ownership
    gap.
  - The installed transaction driver commits before the async callback completes; real SQLite
    reproduction leaves base and proposal changed when audit insertion fails.
reason: Concrete integration or validation gap found in the inspected implementation.
revisit: Implement the missing boundary and add a regression that exercises the actual affected path.
---

# Apply a version-guarded pending change to a stored base definition

The isolated service and a production built-in edit flow are different proof scopes. See the registry bootstrap leaf.

The [real-database finding](../../../../../docs/reviews/2026-11-09-base-apply-rollback-finding.md)
reproduces the rollback gap through this service. Its diagnostic intentionally
fails the rollback assertion; it is evidence of a defect, not a passing guarantee.
