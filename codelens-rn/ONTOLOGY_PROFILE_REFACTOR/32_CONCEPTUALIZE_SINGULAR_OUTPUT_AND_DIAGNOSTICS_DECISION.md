# Conceptualize Singular Output And Diagnostics Decision

**Status:** Locked and implemented on 2026-05-18.
**Branch:** `refactor/ontology-profile`

## Locked Decision

Conceptualize has a singular public output:

```text
one primary placement
+ confidence
+ noStrongMatch / suggestedNewConcept when needed
+ rationale
```

It must not expose visible extra tags or alternate placements as a normal polished product surface.

The model may still return hidden diagnostic candidates, but they are not public tags. They are internal calibration data for future correction learning:

```text
diagnostics.candidateRefs
  internal only
  dynamic policy-driven budget
  close decision-relevant refs only
  no rationale
  no chain-of-thought
  not persisted unless a later correction-evidence flow deliberately snapshots factual near-miss data
```

In plain terms:

```text
Conceptualize should say:
  "This belongs under star_trails."

It should not say:
  "This belongs under star_trails, but maybe also long_exposure, night_photography, and rule_of_500."
```

Hidden candidates can still help later:

```text
Kordex chose star_trails.
Internally it had long_exposure as a close candidate.
The user corrected star_trails -> long_exposure.
That is a near-miss signal, not a public extra-tag choice.
```

## Why This Decision Exists

Visible `additionalNodeRefs` made Conceptualize feel like a classifier that is allowed to be wrong in several directions.

That is not the target product behavior. Kordex should:

- make one intended placement when it can
- ask a focused question or suggest a new concept when it cannot
- learn from corrections
- become more confident over time

Medium/low confidence should trigger learning actions, not permanent nervous UI.

Correct loop:

```text
uncertainty
  -> focused question or correction
  -> factual evidence
  -> checker/proposal/user-fit learning later
  -> better future ranking
  -> higher confidence and fewer questions
```

## Dynamic Diagnostic Policy

Hidden candidates are not hardcoded as "always return four extra tags".

The implemented prompt builder derives a diagnostic candidate policy from the `ContextPack`:

- ontology node count
- same-label ambiguity
- correction evidence pressure
- proposal snapshot pressure
- active branch depth
- trust mode

This policy is a prompt/output guardrail, not an ontology rule.

The semantic rule is:

```text
Capture close alternatives only when they help future correction learning.
Use fewer or none when the decision is clear.
```

## Implemented Source Pieces

Updated:

- `src/features/learning/services/conceptualizePromptBuilder.ts`
  - removed public `additionalNodeRefs`
  - removed caller-supplied prompt limits
  - added `diagnostics.candidateRefs`
  - added `deriveConceptualizeDiagnosticCandidatePolicy(pack)`
  - added `getConceptualizePublicClassification(output)`
  - validator checks hidden candidate refs against the original `ContextPack`
  - validator rejects hidden candidates that duplicate the public primary placement
  - validator rejects hidden candidates above the derived dynamic policy budget
  - validator rejects non-increasing hidden candidate ranks
- `src/features/learning/services/__tests__/conceptualizePromptBuilder.test.ts`
  - covers singular public output
  - covers dynamic diagnostic policy derivation
  - covers unknown/duplicate/over-budget/rank-order diagnostic candidates
  - covers missing-concept suggestions
  - covers no-strong-match primary rejection
  - covers unknown suggested-concept parent refs
- `src/__tests__/stage10-architecture-guards.test.ts`
  - guards that the prompt builder still has no DB/AI/UI/model/extractor/save/proposal/evidence/mutation dependency
  - guards that old public extra-tag contract names do not remain in the prompt builder
- `src/features/learning/index.ts`
  - exports the new diagnostic policy and public-classification seam

## What This Does Not Implement

This slice explicitly does **not** add:

- live extractor prompt flip
- model call
- correction UI changes
- correction evidence schema migration
- storing diagnostic candidates
- near-miss persistence
- user-fit projection
- checker runtime
- proposal creation
- automatic confidence/ranking updates
- save behavior change
- DB reader
- vector retrieval
- graph traversal
- branch overlay mutation
- base/core mutation
- old-card backfill
- auto-apply
- agent/app-builder runtime
- DSL/runtime language changes

## Future Near-Miss Evidence Shape

When correction evidence wiring deliberately supports this later, the factual shape should be narrow:

```text
previousTypeNodeId
correctedTypeNodeId
wasHiddenCandidate
hiddenCandidateRank
hiddenCandidateScore?      optional, if the model supplied it
confidenceAtDecision
promptVersion
contextPackVersion / pack id
```

Do not store chain-of-thought, raw hidden rationale, or freeform thought traces.

Near-miss and blind-spot corrections should feed different later learning paths:

```text
near miss:
  Kordex knew the neighborhood but ranked wrong.
  Mainly user-fit / boundary calibration.

blind spot:
  Kordex did not consider the right node.
  Mainly semantic coverage / ontology gap signal.
```

Both remain evidence first. They do not mutate ontology, branches, trust settings, or ranking weights by existing.

## Future Gates

The Extractor Flip moved into doc 33. Remaining gates stay separate:

```text
Correction evidence near-miss wiring
  decide whether/how to snapshot hidden diagnostic candidates when the user corrects

Missing-concept UX
  decide how noStrongMatch and suggestedNewConcept appear to the user

User-fit projection
  learn ranking/quieting from accepted/rejected/edited/postponed/asked-why events and future near-miss evidence
```

## Verification

Latest targeted verification:

```text
node node_modules\typescript\bin\tsc -p tsconfig.json --noEmit
npm.cmd test -- --run src/features/learning/services/__tests__/conceptualizePromptBuilder.test.ts src/features/learning/services/__tests__/conceptualizeContextPack.test.ts src/features/ontology/__tests__/contextSelector.test.ts src/features/ontology/__tests__/contextAssembly.test.ts src/__tests__/stage10-architecture-guards.test.ts
```

Result: TypeScript clean; targeted Conceptualize prompt/context selector/assembly/guard tests 115/115 passed across 5 files.

Full-suite result: 832/832 passed across 87 files. `git diff --check -- ONTOLOGY_PROFILE_REFACTOR src` was clean with CRLF warnings only.
