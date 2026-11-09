---
schemaVersion: 1
inspectedOn: "2026-11-09"
id: user-fit-projection
domain: context
summary: Derive bounded scoped interpretation signals from supplied history
state: implemented
owners:
  - path: packages/kordex-core/src/userFitProjection.ts
    symbol: projectUserFitSignals
    role: decision
evidence:
  - path: packages/kordex-core/src/__tests__/userFitProjection.test.ts
    kind: unit
    covers: Scoped projection from correction and proposal event history
gaps: []
reason: ""
revisit: ""
---

# Derive bounded scoped interpretation signals from supplied history

Signals are derived hints, not permission, accepted facts or model-weight training.
