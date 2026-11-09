---
schemaVersion: 1
inspectedOn: "2026-11-09"
id: standalone-core
domain: meaning
summary: Resolve explicit profile sources through a standalone domain package
state: implemented
owners:
  - path: packages/kordex-core/src/profileRegistry.ts
    symbol: createProfileRegistry
    role: decision
evidence:
  - path: packages/kordex-core/src/__tests__/profileRegistry.test.ts
    kind: unit
    covers: Explicit source lookup and duplicate or missing profile rejection
  - path: packages/kordex-core/scripts/verify-isolation.mjs
    kind: scenario
    covers: Independent locked install, compilation, domain tests and packed consumer without app dependencies
  - path: packages/kordex-core/src/__tests__/headlessProfile.test.ts
    kind: unit
    covers: Bare semantic profile validation, registry, branch selection and composition without learning fields
gaps: []
reason: ""
revisit: ""
---

# Standalone profile resolution

The registry resolves supplied sources. The package entry initializes no registry
and selects no default profile. Coding and photography are optional exports.
This narrows the former planned package leaf to its concrete profile-resolution
owner; composition, selection and context retain their own adjacent leaves.

Independent compilation and execution do not establish durable storage, guarded
transactional acceptance, the rule lifecycle, MCP or native bundling. Those are
separate steps in the [core roadmap](../../../docs/progress/2026-11-09-core-roadmap.md).
