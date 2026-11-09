---
schemaVersion: 1
inspectedOn: "2026-11-09"
id: capture-save
domain: evolution
summary: Persist a scoped capture and its explicit correction/proposal effects
state: partial
owners:
  - path: codelens-rn/src/features/learning/services/saveCapture.ts
    symbol: saveCapture
    role: orchestration
evidence:
  - path: codelens-rn/src/features/learning/services/__tests__/stage2-saveCapture.test.ts
    kind: unit
    covers: Save decisions and effects with injected persistence
  - path: codelens-rn/src/features/learning/services/__tests__/conceptualizeCorrections.test.ts
    kind: unit
    covers: Correction and proposal integration contracts
gaps:
  - Learning-chat save does not carry its known concept profile through the store/modal into the
    profile-context resolver.
reason: Profile-aware retrieval does not establish profile-aware saving.
revisit: Carry explicit scope through route, store, context resolution, save and read-back with a
  non-coding regression.
---

# Capture save

The save service is an existing owner, not a universal Kordex ingestion contract.
The documented gap spans its caller chain; it is not evidence that this function
alone discards a supplied profile.
