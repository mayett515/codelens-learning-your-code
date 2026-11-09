# Conceptualize ContextPack Shadow Wiring Decision

**Status:** Locked and implemented on 2026-05-15.
**Branch:** `refactor/ontology-profile`

## Locked Decision

The next Conceptualize context slice is **A1: shadow wiring**.

Conceptualize should build and validate a real `ContextPack` from the real Conceptualize caller, but it must not change model prompts, extractor behavior, save behavior, suggestion behavior, or ontology/profile state.

In plain terms:

```text
Turn on the context wire.
Validate that the real Conceptualize flow can produce the right briefing packet.
Do not let the model consume it yet.
Do not generate missing concepts yet.
Do not mutate anything.
```

## Why A1 Before Prompt Builder

The earlier A/B discussion separated:

```text
A = wire Conceptualize selector/context into the real flow
B = user-fit projection over accept/reject/edit/postpone/asked-why/manual-create events
```

The decision remains:

```text
A before B
```

But the stronger model review correction is that A must be split:

```text
A1 shadow wiring
  real caller builds ContextSelection -> ContextPack -> validation
  no renderer or behavior change

A2 prompt builder
  later turns a selected ContextPack subset into model-facing text/data

A3 missing-concept allowance
  later decides how Conceptualize may surface "no strong match" and optional new tag/subtag proposals

B user-fit projection
  later uses real proposal/correction events to rank or quiet suggestions
```

Reason: doc 28 deliberately deferred prompt rendering. A prompt renderer can become the de facto contract too early. The first real caller should prove the packet shape and invariants before prompt text is introduced.

## What This Slice Implements

This slice adds a behavior-neutral shadow path:

```text
SaveAsLearningModal
  -> resolveConceptualizeProfileContext()
  -> prepareSaveCandidates()
  -> buildConceptualizeContextPackShadow() for each draft candidate
  -> validateContextPack()
  -> warn only if invalid
```

Implemented source pieces:

- `ConceptualizeProfileContext` now carries the base profile, resolved branches, `compositionStamp`, and `scopeLegend`.
- `createConceptualizeProfileContext()` builds the context identity for fallback/base and project-scoped runtime profile contexts.
- `conceptualizeContextPack.ts` builds a shadow `ContextPack` from:
  - the draft candidate as `focal`
  - the active base/branch composition stamp
  - the active scope legend
  - current base/branch ontology node candidates
  - caller-supplied evidence/proposal/graph candidates when provided
  - the existing Conceptualize selector
  - the existing ContextPack assembler and validator
- `SaveAsLearningModal` calls the shadow builder after extraction succeeds.
- Shadow validation failures are logged with `console.warn`; they do not block extraction, review, save, correction evidence, or proposal creation.
- Stage10 guards enforce that the shadow builder does not render prompts, call models, save captures, insert evidence/proposals, import DB clients, or mutate ontology state.

## What It Does Not Implement

This slice explicitly does **not** add:

- prompt builder
- prompt rendering
- extractor prompt changes
- LLM/model behavior changes
- missing-concept suggestion generation
- passive "no strong match" UI
- user-fit projection
- trust-mode behavior changes
- DB-backed candidate readers
- vector similarity integration
- graph traversal
- proposal revalidation/context integration
- profile/base/core mutation
- branch overlay mutation
- old-card backfill
- checker runtime
- agent/app-builder runtime
- DSL/runtime language changes

## Missing-Concept Direction Remains Future

The future missing-concept UX should stay separate from this slice.

Recommended later shape:

```text
Passive signal:
  "No strong match in current schema."
  Default on. Explanation-only. No proposal yet.

Active suggestion:
  "Help me name this / suggest a missing concept."
  Opt-in per interaction first.
  Later controlled by a separate suggestion-verbosity setting.

Apply:
  Always through guarded proposal/review or reviewed branch-local operation.
  Never silent base/core mutation.
```

Trust mode should control apply authority, not whether Kordex is allowed to speak. Risk remains the veto. User-fit can later rank or quiet suggestions, not make Kordex braver.

## Confidence Direction Remains Future

Keep the signals separate:

```text
vectorSimilarity
  Similar old notes/corrections/proposals. Evidence only, not authority.

semanticConfidence
  How well the item matches the schema. Can rank alternatives and trigger uncertainty.

userFitConfidence
  Whether this matches the user's past behavior. Later reranks/quietens elastic suggestions.

riskScore
  Blast radius if wrong. The only signal that can force review or forbid an action.
```

Do not collapse these into one confidence number.

## Invariants

- ContextPack shadow wiring is behavior-neutral.
- Shadow validation must not block save or extraction.
- ContextPack construction must include `compositionStamp.branchOrder`, even with no active branches.
- ContextPack construction must include a `scopeLegend`.
- Selector output feeds the existing ContextPack assembler.
- No prompt renderer may be introduced in this slice.
- No source in this slice may directly write profile/branch/proposal/evidence state.
- Model-generated or missing ontology ids remain untrusted; future prompt outputs must validate refs against the pack.

## Verification

Latest targeted verification:

```text
node node_modules\typescript\bin\tsc -p tsconfig.json --noEmit
npm.cmd test -- --run src/features/learning/services/__tests__/conceptualizeContextPack.test.ts src/features/learning/services/__tests__/conceptualizeProfileContext.test.ts src/features/ontology/__tests__/contextSelector.test.ts src/features/ontology/__tests__/contextAssembly.test.ts src/__tests__/stage10-architecture-guards.test.ts
```

Result: TypeScript clean; targeted Conceptualize ContextPack shadow/context selector/assembly/guard tests 102/102 passed across 5 files.

Full-suite result: 816/816 passed across 86 files.

## Next Decision

The next decision from this point was:

```text
Conceptualize Prompt Builder
```

Status note: this was later locked and implemented in `31_CONCEPTUALIZE_PROMPT_BUILDER_DECISION.md`.

That decision should define:

- whether the prompt builder consumes `ContextPack` or `ContextSelection` directly
- the first allowed policy modes
- structured output shape
- how unknown node refs are rejected/normalized
- what the model may say versus what the app may apply
- why prompt rendering remains separate from selector/assembly

Do not combine it with user-fit projection, DB-backed candidate readers, vector retrieval, graph traversal, or automatic missing-concept apply.
