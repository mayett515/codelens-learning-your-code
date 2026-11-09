---
schemaVersion: 1
inspectedOn: "2026-11-09"
id: profile-registry-bootstrap
domain: meaning
summary: Load built-in and stored profile sources into the default registry
state: partial
owners:
  - path: codelens-rn/src/features/ontology/data/profileRegistryBootstrap.ts
    symbol: loadDefaultProfileRegistry
    role: orchestration
evidence:
  - path: codelens-rn/src/features/ontology/__tests__/profileRegistryBootstrap.test.ts
    kind: unit
    covers: Registry source assembly and duplicate ID rejection
gaps:
  - Built-in and stored definitions with the same ID conflict, while editable built-in base apply
    requires a stored definition.
reason: Concrete integration or validation gap found in the inspected implementation.
revisit: Implement the missing boundary and add a regression that exercises the actual affected path.
---

# Load built-in and stored profile sources into the default registry

Define source ownership/materialization before claiming default bootstrap, base editing and reload work together.
