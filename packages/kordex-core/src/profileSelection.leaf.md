---
schemaVersion: 1
inspectedOn: "2026-11-09"
id: profile-selection
domain: meaning
summary: Resolve a base and ordered branch selection
state: implemented
owners:
  - path: packages/kordex-core/src/profileSelection.ts
    symbol: resolveProfileSelection
    role: decision
evidence:
  - path: packages/kordex-core/src/__tests__/profileSelection.test.ts
    kind: unit
    covers: Selection resolution, missing IDs, branch kinds, foreign-parent rejection for every kind and valid ordering with unselected foreign branches
  - path: codelens-rn/src/features/ontology/__tests__/runtimeProfileActivation.test.ts
    kind: unit
    covers: Runtime caller resolution, ordering and immutable inputs with matching parent fixtures
  - path: packages/kordex-core/src/__tests__/headlessProfile.test.ts
    kind: unit
    covers: Bare semantic profile validation, registry, branch selection and composition without learning fields
gaps: []
reason: ""
revisit: ""
---

# Resolve a base and ordered branch selection

The shared resolver rejects selected branches with a foreign parent before runtime
composition. Unselected branches are not rejected, and valid selection order is
preserved. This closes the original 2026-11-09 inspected gap; the tests do not
claim native UI or database verification.
