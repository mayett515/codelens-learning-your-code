---
schemaVersion: 1
inspectedOn: "2026-11-09"
id: proposal-review
domain: evolution
summary: Record explicit reject, postpone and ask-why review actions
state: implemented
owners:
  - path: codelens-rn/src/features/ontology/data/profileChangeProposalReviewService.ts
    symbol: setPendingProfileChangeProposalReviewStatus
    role: orchestration
  - path: codelens-rn/src/features/ontology/data/profileChangeProposalReviewService.ts
    symbol: recordPendingProfileChangeProposalAskedWhy
    role: orchestration
evidence:
  - path: codelens-rn/src/features/ontology/__tests__/profileChangeProposalReviewService.test.ts
    kind: unit
    covers: Pending-state review transitions and audit events
gaps: []
reason: ""
revisit: ""
---

# Record explicit reject, postpone and ask-why review actions

Ask-why is a legitimate audit action without an ontology mutation. Review does not imply apply.
