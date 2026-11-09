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
  - path: codelens-rn/src/features/learning/services/conceptualizeProfileContext.ts
    symbol: resolveConceptualizeProfileContext
    role: orchestration
  - path: codelens-rn/src/features/learning/services/prepareSaveCandidates.ts
    symbol: prepareSaveCandidates
    role: orchestration
  - path: codelens-rn/src/features/learning/state/save-learning.ts
    symbol: useSaveLearningStore
    role: infrastructure
evidence:
  - path: codelens-rn/src/features/learning/services/__tests__/stage2-saveCapture.test.ts
    kind: unit
    covers: Save decisions and effects with injected persistence
  - path: codelens-rn/src/features/learning/services/__tests__/conceptualizeCorrections.test.ts
    kind: unit
    covers: Correction and proposal integration contracts
  - path: codelens-rn/src/features/learning/services/__tests__/saveLearningProfileFlow.test.ts
    kind: unit
    covers: Store entry through real context resolution, preparation, save and repository codecs with stubbed model replies and in-memory SQL transport; explicit profile failures and colliding node IDs
gaps:
  - Route handover and read-back are not verified in a running app with native SQLite.
reason: The profile transport fix has Node regression evidence, but route and modal components were not exercised on a device or emulator.
revisit: Exercise photography learning-chat save through the actual route and modal, then read the capture back from native SQLite on a device or emulator.
---

# Capture save

The save service is an existing owner, not a universal Kordex ingestion contract.
M1b (2026-11-09) carries the known concept profile through the route, source store
and modal into context resolution. Explicit unknown, blank or conflicting profile
contexts fail instead of becoming coding. Only absent context retains the default.
The source change restarts extraction if a new source arrives while the modal is
already extracting; native component interaction remains unverified.

The Node test starts at store.open with the known concept profile. It manually
calls the same context/preparation/save functions used by the modal, runs the real
capture repository mapping and read codec over an in-memory SQL transport, and
asserts photography despite a deliberately colliding coding node ID. It does not
render route/modal, execute SQL, prove disk durability or prove transaction rollback.
The leaf intentionally remains partial under the user's accepted proof boundary.
