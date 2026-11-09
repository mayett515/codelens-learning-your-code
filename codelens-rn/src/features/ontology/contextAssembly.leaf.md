---
schemaVersion: 1
inspectedOn: "2026-11-09"
id: context-assembly
domain: context
summary: Assemble explicit scoped facts into a bounded ContextPack
state: implemented
owners:
  - path: codelens-rn/src/features/ontology/contextAssembly.ts
    symbol: assembleContextPack
    role: decision
evidence:
  - path: codelens-rn/src/features/ontology/__tests__/contextAssembly.test.ts
    kind: unit
    covers: Context validation and assembly from supplied facts
gaps: []
reason: ""
revisit: ""
---

# Assemble explicit scoped facts into a bounded ContextPack

The assembler does not fetch facts, mutate ontology or establish complete dependency coverage.
