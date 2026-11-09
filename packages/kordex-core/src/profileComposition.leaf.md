---
schemaVersion: 1
inspectedOn: "2026-11-09"
id: profile-composition
domain: meaning
summary: Compose a runtime profile from a base and ordered overlays
state: implemented
owners:
  - path: packages/kordex-core/src/profileComposition.ts
    symbol: composeDomainProfile
    role: decision
evidence:
  - path: packages/kordex-core/src/__tests__/profileComposition.test.ts
    kind: unit
    covers: Composition ordering and merge behavior
gaps: []
reason: ""
revisit: ""
---

# Compose a runtime profile from a base and ordered overlays

Composition returns a derived value; it does not choose persistence authority.
