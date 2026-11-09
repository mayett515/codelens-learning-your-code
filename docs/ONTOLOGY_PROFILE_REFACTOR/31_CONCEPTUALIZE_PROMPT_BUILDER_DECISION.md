# Conceptualize Prompt Builder Decision

**Status:** Locked and implemented on 2026-05-16.
**Branch:** `refactor/ontology-profile`

**Follow-up:** `32_CONCEPTUALIZE_SINGULAR_OUTPUT_AND_DIAGNOSTICS_DECISION.md` updates the output contract. Public `additionalNodeRefs` are removed; hidden `diagnostics.candidateRefs` are internal calibration data only.

**Follow-up:** `37_USER_FIT_PROJECTION_DECISION.md` adds bounded `userFit` payload rendering. User-fit is advisory correction history, not semantic truth and not mutation authority.

## Locked Decision

The next Conceptualize context slice is **A2: pure prompt builder and output validator**.

The prompt builder consumes a validated `ContextPack` and renders:

```text
stable instruction shell
+ compact Kordex context payload JSON
+ strict output schema contract
+ output validator against the original pack refs
```

It does **not** call a model and it does **not** change the live extractor prompt yet.

In plain terms:

```text
The ContextPack is the map.
The prompt builder turns the map into the readable briefing and data file the model will later receive.
The model must answer with refs from that map.
Unknown refs are rejected, not guessed.
New tags/subtags are suggestions only.
```

## Why This Comes After Shadow Wiring

Doc 30 proved that the real Conceptualize flow can build and validate a `ContextPack` in shadow mode.

The prompt builder is the next boundary, but it must not become a second selector or a hidden mutation layer.

Correct split:

```text
ContextPack
  authoritative selected context, scopes, policy, and caps

Prompt builder
  deterministic view over a validated ContextPack
  instruction shell + compact payload

Model output schema
  expected answer shape

Output validator
  trust boundary that checks returned refs against the ContextPack

Proposal/apply/evidence systems
  later layers; not wired in this slice
```

## Why Hybrid Prompt Data

The model needs both:

- strict scoped refs such as `coding:mechanism` or `night-photo:sensor_noise`
- compact meanings, use rules, "do not use when" boundaries, examples, and same-label disambiguation
- bounded user-fit history when present, so prior user corrections can bias a close call without becoming ontology truth

Refs alone are too opaque. Prose alone causes category drift. Hybrid prompt data gives the model a readable map while keeping scoped refs as the only contract.

## What This Slice Implements

Implemented source pieces:

- `src/features/learning/services/conceptualizePromptBuilder.ts`
  - `buildConceptualizePrompt({ pack })`
  - `ConceptualizePromptOutputSchema`
  - `validateConceptualizePromptOutput(rawOutput, pack)`
  - prompt version constants and payload/output types
- `src/features/learning/services/__tests__/conceptualizePromptBuilder.test.ts`
  - deterministic prompt payload rendering
  - same-label scoped meaning preservation
  - known-ref validation
  - unknown-ref rejection with no label coercion
  - missing-concept suggestion representation
  - invalid-pack rejection before rendering
- `src/__tests__/stage10-architecture-guards.test.ts`
  - guard proving the prompt builder does not fetch context, select context, call models, run extraction, save captures, insert proposals/evidence, or import DB/UI/AI runtime dependencies
- `src/features/learning/index.ts`
  - exports the pure builder/schema/validator seam

## Output Contract

The first output schema is intentionally narrow:

```text
schemaVersion: conceptualize-output-v1
classification:
  primaryNodeRef: ScopedNodeRef | null
  noStrongMatch: boolean
  suggestedNewConcept: null | {
    label
    kind
    parentNodeRef?
    meaning
    reason
  }
  confidence: number
  rationale: string
diagnostics:
  candidateRefs: Array<{
    ref: ScopedNodeRef
    rank: number
    score?: number
  }>
```

Rules:

- If `noStrongMatch` is `false`, `primaryNodeRef` is required.
- If `noStrongMatch` is `true`, `primaryNodeRef` must be `null`.
- Public extra tags are not part of the Conceptualize classification contract.
- `diagnostics.candidateRefs` are internal calibration candidates, not visible tags.
- Diagnostic candidate refs must exist in the pack, must not duplicate the primary ref, and must fit the dynamic ContextPack diagnostic policy.
- `suggestedNewConcept` is allowed only with `noStrongMatch: true` in this first slice.
- `suggestedNewConcept.parentNodeRef`, when present, must exist in the pack.
- Unknown refs are rejected. They are not pluralized, normalized, renamed, or coerced into near matches.

## What It Does Not Implement

This slice explicitly does **not** add:

- live extractor prompt change
- model call
- model routing
- DB-backed candidate readers
- vector retrieval
- graph traversal
- persistent learned user-fit scores
- missing-concept apply
- proposal creation
- correction evidence writes
- save behavior change
- branch overlay mutation
- base/core mutation
- old-card backfill
- checker runtime
- auto-apply
- agent/app-builder runtime
- DSL/runtime language changes

## Future Gates

Next gates remain separate:

```text
Extractor flip
  decide when the real extractor consumes this prompt

Missing-concept UX
  decide how noStrongMatch and suggestedNewConcept appear to the user

User-fit projection
  learn ranking/quieting from accept/reject/edit/postpone/asked-why events

Base profile versioning
  safely target accepted base/core changes
```

## Verification

Latest targeted verification:

```text
node node_modules\typescript\bin\tsc -p tsconfig.json --noEmit
npm.cmd test -- --run src/features/learning/services/__tests__/conceptualizePromptBuilder.test.ts src/features/learning/services/__tests__/conceptualizeContextPack.test.ts src/features/ontology/__tests__/contextSelector.test.ts src/features/ontology/__tests__/contextAssembly.test.ts src/__tests__/stage10-architecture-guards.test.ts
```

Result: TypeScript clean; targeted Conceptualize prompt/context selector/assembly/guard tests 107/107 passed across 5 files.

Full-suite result: 824/824 passed across 87 files.
