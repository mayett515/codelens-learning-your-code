---
schemaVersion: 1
inspectedOn: "2026-11-09"
id: manual-checker
domain: evolution
summary: Run the manual branch-local checker and create supported pending proposals
state: implemented
owners:
  - path: codelens-rn/src/features/ontology/data/checkerRunService.ts
    symbol: runManualOntologyChecker
    role: orchestration
evidence:
  - path: codelens-rn/src/features/ontology/__tests__/checkerRunService.test.ts
    kind: unit
    covers: Injected checker orchestration, caps, validation and insertion behavior
  - path: codelens-rn/src/features/ontology/__tests__/checkerProposalMapper.test.ts
    kind: unit
    covers: Deterministic supported-candidate mapping
gaps: []
reason: ""
revisit: ""
---

# Run the manual branch-local checker and create supported pending proposals

This bounded capability excludes background execution, base proposals and auto-apply. Test references do not certify live model/native wiring.
