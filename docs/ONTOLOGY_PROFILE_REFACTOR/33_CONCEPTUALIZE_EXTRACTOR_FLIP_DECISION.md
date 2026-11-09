# Conceptualize Extractor Flip Decision

**Status:** Locked and implemented on 2026-05-24.
**Branch:** `refactor/ontology-profile`

## Locked Decision

The first Extractor Flip is classification-only.

The old extractor still owns capture text extraction:

```text
title
whatClicked
whyItMattered
rawSnippet
keywords
existing concept/link hint
```

The new Conceptualize path owns ontology placement:

```text
ContextPack
  -> Conceptualize prompt builder
  -> model call
  -> strict ConceptualizePromptOutput validator
  -> adapter into the existing SaveModalCandidateData shape
```

This keeps the blast radius small. Kordex starts using the new scoped ontology classifier in the real save flow without redesigning the whole extraction prompt.

## User-Facing Meaning

In plain terms:

```text
Old extractor:
  "Here is the learning card text."

New Conceptualize classifier:
  "This card belongs under this one tag/subtag/node."
```

The user should still see one primary classification, not visible extra tags. If Kordex cannot find a strong match, it must not fake certainty by defaulting to a generic category.

## Implemented Shape

Added `src/features/learning/services/conceptualizeClassification.ts`:

- `runConceptualizeClassification()`
  - builds a Conceptualize ContextPack for one prepared candidate
  - renders the prompt with `buildConceptualizePrompt()`
  - calls the model through the learning queue by default
  - validates with `validateConceptualizePromptOutput()`
  - retries once with validation feedback
- `applyConceptualizeClassificationToCandidate()`
  - maps a validated `ScopedNodeRef` into the existing `conceptHint.proposedConceptType`
  - stores the full scoped ref key in `rawProposedTypeNodeId` for future correction-evidence fidelity
  - clears stale linked-concept metadata when the new classification changes the type
  - sets `conceptHint` to null on `noStrongMatch`
- `classifySaveCandidateWithConceptualize()`
  - convenience pipeline: candidate + context -> validated classification -> save candidate

Updated `prepareSaveCandidates()`:

- callers may pass `conceptualizeContext`
- old extractor runs first and prepares card candidates
- when context is present, each candidate is classified through the new Conceptualize classifier
- if Conceptualize validation/model output fails, the candidate keeps the old extractor placement and logs a warning

Updated `SaveAsLearningModal.tsx`:

- resolves `ConceptualizeProfileContext`
- passes that context into `prepareSaveCandidates()`
- removes the old behavior-neutral shadow-only call from the modal

## Guarded Fallback

The live flip is guarded:

```text
Conceptualize validates:
  use new scoped classification

Conceptualize fails:
  keep old extractor placement
  warn
  do not block the save flow
```

This is not a silent ontology mutation and not a proposal write.

`AbortError` is not treated as a Conceptualize quality failure. If the user closes
or cancels the save flow while Conceptualize is running, the abort propagates
instead of falling back to the old extractor placement. This prevents stale
classification results from appearing after cancellation.

## No-Strong-Match Rule

When the classifier returns:

```text
noStrongMatch: true
primaryNodeRef: null
```

the adapter produces:

```text
conceptHint: null
rawProposedTypeNodeId: null
```

It does not default to `general`, `mechanism`, or the active profile default.

## Suggested-New-Concept Rule

`suggestedNewConcept` remains a suggestion only.

It must not be mapped into:

```text
conceptHint.proposedConceptType
```

because that field expects an existing ontology node id. Mapping a suggested new node into it would either crash later validation or create the impression that the ontology changed.

Missing-concept UX and explicit apply/proposal behavior remain later gates.

## Scoped Ref Rule

The validator checks scoped refs against the ContextPack. The adapter then verifies the selected node id is an item type in the active profile before flattening to the legacy save shape.

The full scoped ref key is preserved in:

```text
rawProposedTypeNodeId
```

This keeps future correction evidence able to distinguish:

```text
coding:mechanism
react-branch:mechanism
night-photo:long_exposure
```

while keeping the current save path compatible with existing `conceptHint.proposedConceptType`.

## What This Does Not Implement

This slice explicitly does **not** add:

- diagnostic candidate persistence
- near-miss correction-evidence snapshots
- missing-concept UI
- automatic ontology mutation
- automatic branch overlay mutation
- automatic base/core mutation
- proposal creation from `suggestedNewConcept`
- checker runtime
- persistent learned user-fit scores
- vector retrieval for classification context
- graph traversal
- old-card backfill
- auto-apply
- agent/app-builder runtime
- DSL/runtime language changes

## Tests And Guards

Added:

- `src/features/learning/services/__tests__/conceptualizeClassification.test.ts`
  - scoped primary ref maps into the existing save candidate shape
  - null extractor hints can still receive a strong Conceptualize placement
  - same-type classifications preserve linked concept metadata
  - no-strong-match removes the proposed type instead of defaulting
  - non-JSON model output retries with validation feedback
  - aborts are not retried by the classifier
  - classifier retry works with validation feedback
  - suggested-new-concept does not become a proposed type
  - diagnostics and suggestions do not leak onto save candidates
  - repeated scoped-ref violations throw a classifier error
- `stage2-prepareSaveCandidates.test.ts`
  - real candidate preparation uses Conceptualize classification when context is supplied
  - no-strong-match remains an explicit missing placement
  - caller abort signals reach the Conceptualize model-call seam
  - Conceptualize aborts propagate instead of falling back
  - invalid Conceptualize output falls back to old extractor placement
- `stage10-architecture-guards.test.ts`
  - the Extractor Flip classifier is a model/adapter seam
  - it does not import persistence, UI frameworks, backup, or save/mutation services
  - the modal no longer owns the shadow-only ContextPack call

## Verification

Latest targeted verification:

```text
node node_modules\typescript\bin\tsc -p tsconfig.json --noEmit
npm.cmd test -- --run src/features/learning/services/__tests__/conceptualizeClassification.test.ts src/features/learning/services/__tests__/stage2-prepareSaveCandidates.test.ts src/__tests__/stage10-architecture-guards.test.ts
npm.cmd test -- --run
git diff --check -- ONTOLOGY_PROFILE_REFACTOR src
```

Result:

```text
TypeScript clean
focused classifier/prepare tests: 19/19 passed across 2 files
full suite: 848/848 passed across 88 files
diff check clean with CRLF warnings only
```

## Next Gates

The remaining Conceptualize gates are still separate:

```text
Correction-evidence near-miss wiring
  snapshot hidden diagnostic candidates only when a user correction happens

Missing-concept UX
  decide how noStrongMatch and suggestedNewConcept appear to the user

User-fit ContextPack consumption
  doc 37 now supplies bounded advisory user-fit history to Conceptualize; checker consumption remains separate
```

Do not fold those into the Extractor Flip retroactively.
