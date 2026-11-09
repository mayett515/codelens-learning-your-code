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
  - path: packages/kordex-core/src/extensions/learningProfileComposition.ts
    symbol: composeLearningProfileFields
    role: decision
evidence:
  - path: packages/kordex-core/src/__tests__/profileComposition.test.ts
    kind: unit
    covers: Composition ordering and merge behavior
  - path: packages/kordex-core/src/__tests__/headlessProfile.test.ts
    kind: unit
    covers: Bare semantic profile validation, registry, branch selection and composition without learning fields
gaps: []
reason: ""
revisit: ""
---

# Compose a runtime profile from a base and ordered overlays

Composition returns a derived value; it does not choose persistence authority.

A bare profile contains identity, description and ontology only. The explicit
learning extension retains the existing label, metadata and graph merge policy
for CodeLens profiles. Legacy learning overrides on a bare profile are rejected,
not silently dropped. Composition still chooses no storage authority.
