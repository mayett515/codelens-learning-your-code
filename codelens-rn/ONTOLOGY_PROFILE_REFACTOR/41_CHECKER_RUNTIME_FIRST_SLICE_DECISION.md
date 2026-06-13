# Checker Runtime First Slice Decision

Date: 2026-06-12

Status: locked decision; pure checker prompt/output contract, deterministic mapper, manual checker runtime service, UI trigger/readout, and concrete model adapter seam are implemented. No DB schema, auto-apply, relationship semantics implementation, base/core checker targeting, background checker mode, checker-run table, or operation-vocabulary expansion is added by this document.

## Purpose

This document consolidates the scattered future checker vision and locks the first runtime slice.

It does not re-decide the checker architecture. The main architecture is already locked:

```text
corrections / user-fit / graph context / checker analysis
-> explanation
-> evidence
-> pending proposal
-> user review
-> typed validated apply
-> audit event
```

The first checker runtime must speak through the existing proposal system. It must not become a second mutation path.

## Source Map

The future checker direction is already spread across several docs:

- `03_CATEGORIZATION_AND_ONTOLOGY_CHECKER.md`
  - checker is a periodic or manual ontology-profile review assistant
  - checker looks across captures, items, tags, corrections, confidence history, temporary `x-*` nodes, repeated tags, and promotion clusters
  - future checker suggestions include add/split/merge/move/rename/deprecate/boundary-rule/profile improvements
  - checker suggestions need reasons and evidence
  - checker must not silently apply changes
- `07_KORTEX_CORE_AND_CHILD_CORES.md`
  - long-term Kordex Core includes dynamic relationship labels, `is` / `is not` boundaries, graph projection, maturity, event-driven relationship discovery, and versioned rollback/merge review
  - provisional signals can mature from raw signal to subtag/tag/core tag/ontology node as evidence and boundaries become clearer
  - current `prerequisite` / `related` / `contrast` compatibility names are migration seams, not the final global relationship taxonomy
- `21_CHECKER_PROPOSAL_REVIEW_CONTEXT_AND_APPLY_DECISION.md`
  - Conceptualize, checker runs, graph-selection chat, repeated-mistake review, old-card backfill, and future agent/app-builder flows share one explanation/evidence/proposal/apply architecture
  - explanations never mutate state
  - evidence records facts
  - proposals are reviewable recommendations
  - accepted proposals compile to typed Kordex operations after revalidation
  - checker runtime and detailed implementation choices were intentionally left for later
- `37_USER_FIT_PROJECTION_DECISION.md`
  - correction evidence, near-misses, missing-concept corrections, and proposal events project into bounded user-fit signals
  - user-fit is scoped to the active profile selection where evidence happened
  - checker selectors can consume the same bounded `ContextPack.userFit` section later
  - user-fit is advisory and must not auto-apply or become semantic truth by itself
- `FABLE_STRATEGIC_REVIEW_2026-06-09/05-next-gates.md`
  - recommended order after proposal lifecycle is the first manual checker runtime
  - if checker starts proposing split, merge, rename, deprecate, move, or boundary-rule changes, typed operation vocabulary must be defined first

This document binds those threads into one implementation gate.

## Future Checker Vision

The full checker is eventually a profile-quality and graph-coherence assistant.

It should be able to:

- inspect many captures, items, corrections, proposals, graph areas, branch overlays, and user-fit signals
- explain why a classification, relationship, node boundary, or branch assumption looks weak
- identify repeated mistakes and missing ontology concepts
- notice when a local branch pattern might belong in a broader parent/core layer, without silently promoting it
- notice when a core assumption causes repeated local branch corrections, without silently mutating core
- suggest branch-local, base/core, merge, boundary, relationship, backfill, and graph-cleanup proposals through typed operations
- use rejection, postpone, edit, apply, near-miss, and optional user reasoning as feedback
- let provisional concepts or relationship labels mature only through evidence, review, versioning, and rollback-safe operations

The future checker is not just a tag suggester. It is the review-facing part of Kordex's self-improving ontology loop.

## Future Relationship And Maturity Direction

Dynamic relationship labels, provisional tags, temporary `x-*` nodes, and maturity ladders are real Kordex direction, but they are not part of the first checker runtime.

Later relationship-semantics work must reconcile:

- current compatibility relationship labels such as `prerequisite`, `related`, and `contrast`
- scoped `is` / `is not` boundary semantics
- dynamic profile-owned relationship labels
- temporary or provisional relationship/tag lifecycle
- maturity from raw signal to durable ontology structure
- rollback, branch-like experiments, and merge review
- typed operations for relationship and boundary changes

Until that gate is locked, the checker may observe relationship or boundary problems only as explanation. It must not emit relationship mutations, temporary-tag mutations, boundary-rule mutations, split/merge/rename/deprecate/move operations, or maturity transitions.

## First Runtime Slice Decision

The first checker runtime is intentionally narrow:

```text
manual-on-demand
branch-local
proposal-only
additive ontology-node / item-type proposals only
existing review/apply/freshness/edit flow
strict output validation
no auto-apply
```

### Trigger

The first checker run is manual only.

User-facing concept:

```text
Run checker now
```

Future event-based, scheduled, idle, reminder, or background checker modes remain allowed by earlier docs, but they are not part of this slice.

This does not mean checker is manual forever. It means the first implementation proves the runtime contract without adding background behavior.

### Inputs

The first checker runtime should reuse existing substrate where possible:

- active composed `DomainProfile`
- active profile selection / branch context
- bounded correction evidence
- bounded proposal event facts
- bounded user-fit projection facts
- selected ontology context through the existing checker selector
- `ContextPack` assembly and validation
- existing proposal review/apply/freshness/edit infrastructure

User-fit can help rank or explain patterns. It cannot alone justify a proposal, and it cannot override typed validation.

### Outputs

The first checker output can contain:

- read-only explanation
- evidence references
- pending branch-local profile-change proposals with `sourceKind: 'checker'`

The first proposal kind is pinned to `proposalKind: 'ontology_node_patch'`.
The patch is limited to additive ontology-node / item-type proposals expressible as the currently supported `ProfilePatch` path.

The checker may say:

```text
This repeated mistake looks like a missing branch-local concept.
```

It may not yet say:

```text
I rewrote this relationship taxonomy.
I changed this boundary rule.
I renamed this node.
I merged these nodes.
I promoted this branch-local concept into core.
```

Those require later typed operation gates.

### Targeting

The first checker-created proposals target only the active branch/local layer.

Base/core checker proposals are deferred even though base/core apply exists. Core changes have a larger blast radius and should wait until checker behavior is proven branch-locally and the relevant target UX is mature.

No silent widening is allowed. The checker must not turn a branch-local observation into a base/core proposal unless a later decision explicitly enables that path.

Created branch proposals must snapshot the target branch revision:

- `target.kind = 'profile_branch'`
- `targetProfileVersion = null`
- `targetBranchUpdatedAt = current target branch updatedAt`

This is required by doc 40 freshness. A checker-created branch proposal without `targetBranchUpdatedAt` would start as `unknown`, stay blocked from Apply, and fail explicit refresh because there is no previous branch revision to rebase from.

If there is no active branch target, the first checker runtime should return explanation only and create zero proposals. Base/core fallback is not allowed in this slice.

### Persistence

Do not add a `checker_runs` table in the first slice.

The first slice should use existing persistence:

- `profile_change_proposals.sourceKind = 'checker'`
- proposal `evidenceIds`
- existing proposal review status
- existing proposal event audit history

A dedicated checker-run log can be added later if product needs prove it, such as run history, run summaries, debugging, or scheduled-run observability.

### Rejection Reason Optionality

The checker must learn from bare review signals.

Rejected and postponed proposals are meaningful even when the user gives no reason. Optional user reasoning can enrich future confidence, boundary understanding, and explanation quality, but the first checker must not require a reason dialog.

### Risk And Confidence

The checker model may supply semantic confidence and explanation, but it does not grade its own blast radius.

Risk is assigned by Kordex policy from target and operation shape. In this first slice, branch-local additive ontology-node/item-type proposals should be treated as low-risk branch-local changes under the existing doc 24 risk/blast-radius meaning. User-fit confidence comes from the bounded user-fit projection, not from the model.

### Per-Run Cap And Deduplication

The first checker runtime must cap proposal creation per manual run.

Recommended cap: at most five pending proposals per run after validation and deduplication.

Repeated manual runs must not enqueue duplicate pending proposals for the same target branch and same proposed node id. The first implementation should skip the duplicate and include the existing pending proposal in the read-only run explanation.

### Mapper Contract Pins

The deterministic mapper owns the durable proposal shape. The checker model may suggest findings, labels, meaning, rationale, and semantic confidence, but the mapper decides persistence-safe fields.

Mapper pins:

- `sourceKind = 'checker'`
- `sourceBranchId = null`
- `proposalKind = 'ontology_node_patch'`
- one proposed concept per proposal
- one checker-minted ontology node per proposal
- minted node `createdBy = 'model'`
- minted node `status = 'active'`
- `target.kind = 'profile_branch'`
- `targetProfileVersion = null`
- `targetBranchUpdatedAt = current target branch updatedAt`

`sourceBranchId` stays null so the existing proposal codec requires evidence ids for checker-origin proposals. Checker V0 must not use `sourceBranchId` as a way to create evidence-less proposals.

Checker-minted nodes use `status: 'active'` because a reviewed and applied proposal creates a real branch-local ontology node. `status: 'suggested'` and `status: 'deprecated'` are reserved for later maturity/provisional lifecycle work and must fail closed in checker V0.

One concept per proposal keeps review, edit, deduplication, and apply independent. A checker output with multiple valid findings should be split into separate proposals before the per-run cap is applied.

Deduplication must not rewrite existing pending proposals. If a matching pending proposal already exists, the checker should skip creating a duplicate and mention the existing pending proposal in the read-only run explanation. If the existing proposal ever needs different content, doc 39's replacement-plus-supersede model applies; in-place rewrite is not allowed.

The checker must insert new proposals only. It must not update, upsert, delete, or clean up pending proposals as part of this first runtime.

## Why The First Slice Is Narrow

The broad checker vision references proposal kinds that are not all supported by the current typed apply vocabulary.

Examples:

- split node
- merge nodes
- rename node
- move node
- deprecate node
- add boundary rule
- relationship taxonomy rewrite
- temporary/provisional node lifecycle
- maturity promotion

The current safest path is additive branch-local node/item-type proposals because:

- the proposal table already supports checker-origin proposals
- the review surface already handles pending proposals
- edit/supersede/freshness/apply paths are already implemented
- branch-local apply is isolated to the target branch overlay
- parent ids are now validated by the shared branch/base compile boundary
- user review remains explicit

The narrow first runtime proves the checker can produce useful reviewable work without expanding mutation semantics.

## What Not To Implement In This Slice

Do not implement:

- background, scheduled, event-triggered, or idle checker runs
- checker-created base/core proposals
- checker-created relationship changes
- checker-created boundary-rule edits
- checker-created split/merge/rename/deprecate/move operations
- temporary/provisional relationship or tag lifecycle
- maturity promotion/demotion operations
- automatic proposal apply
- automatic branch-to-core promotion
- old-card backfill mutation
- checker-run persistence table
- vector retrieval or graph traversal as a new runtime dependency
- agent runtime, app-builder runtime, MCP adapter behavior, or DSL/Racket runtime

## First Implementation Shape

Recommended first implementation sequence:

1. Add a pure checker prompt/output contract over a validated checker `ContextPack`.
2. Add strict output validation that rejects unknown refs and unsupported proposal kinds.
3. Add a pure deterministic mapper from validated checker output to candidate `ProfileChangeProposal` values. The mapper must pin `sourceKind: 'checker'`, `sourceBranchId: null`, `proposalKind: 'ontology_node_patch'`, one node per proposal, checker-minted node `createdBy: 'model'` / `status: 'active'`, branch target fields, target branch revision snapshot, risk policy, per-run cap, and duplicate-pending behavior.
4. Add a small manual runtime service that loads bounded facts, assembles checker context, calls the checker model seam, validates output, maps supported output to branch-local proposals, dry-runs those proposals through the existing branch-local compile path, and inserts only proposals that pass.
5. Reuse existing proposal review, edit, freshness, refresh, and apply screens/services.

No apply code should be checker-specific.

Dry-run-before-insert is required. The checker must not persist proposals that are already conflicted against the current target profile. The runtime service should fail closed or skip the invalid proposal with explanation; it must not create queue clutter that the existing compile path could have rejected before write.

## Acceptance Criteria

The first checker runtime is acceptable only if:

- it can be triggered manually
- it creates no durable ontology/profile mutation by itself
- it creates only pending branch-local additive proposals
- created proposals use `proposalKind: 'ontology_node_patch'`
- created proposals use `sourceKind: 'checker'`
- created proposals use `sourceBranchId = null`
- created proposals set `target.kind = 'profile_branch'`, `targetProfileVersion = null`, and `targetBranchUpdatedAt` from the current branch
- checker-minted nodes use `createdBy = 'model'` and `status = 'active'`
- checker-created proposals contain one proposed concept / one minted node each
- no active branch produces explanation only and zero proposal writes
- unsupported future proposal kinds fail closed
- checker output references only ids present in the provided context
- created proposals carry evidence references and explanation/reason text
- risk is assigned by deterministic Kordex policy, not model self-grading
- per-run proposal count is capped
- duplicate pending proposals for the same target branch and proposed node id are not enqueued
- duplicate handling does not update, upsert, delete, or rewrite existing pending proposals
- proposals are dry-run through the existing branch-local compile path before insert
- proposal review/apply/freshness/edit remains the only mutation path
- tests prove no auto-apply, no base/core target, no relationship/boundary operation, and no separate mutation path

## Implementation Update - Pure Prompt Contract And Mapper

The first pure source slice is implemented.

Implemented files:

- `src/features/ontology/checkerPromptBuilder.ts`
- `src/features/ontology/checkerProposalMapper.ts`
- `src/features/ontology/__tests__/checkerPromptBuilder.test.ts`
- `src/features/ontology/__tests__/checkerProposalMapper.test.ts`
- `src/__tests__/stage10-architecture-guards.test.ts`

What this implements:

- `buildCheckerPrompt(input)` renders a checker-only instruction shell and bounded payload from a validated checker `ContextPack`.
- `CheckerPromptOutputSchema` accepts only read-only explanation plus `missing_branch_item_type` findings.
- `validateCheckerPromptOutput(raw, pack)` rejects non-checker packs, unsupported output shapes, unknown parent refs, unknown evidence ids, duplicate findings, and model-supplied persistence metadata.
- `mapCheckerOutputToProfileChangeProposals(input)` maps validated findings into pending branch-local `ProfileChangeProposal` values with the mapper pins above.
- The mapper uses the existing proposal codec to keep checker proposals evidence-backed by pinning `sourceBranchId: null`.
- The mapper returns explanation only when no active branch target is supplied.
- Duplicate pending checker proposals for the same branch/node are skipped and surfaced in the read-only explanation instead of rewritten.
- Valid findings are split into one proposal per concept before cap enforcement.

This implements steps 1 through 3 of the First Implementation Shape. Step 4 is implemented by the manual runtime service below, and step 5 is implemented by the UI trigger/readout slice below.

Verification:

- TypeScript clean
- focused checker prompt/mapper/stage10 guard tests: 88/88 passed across 3 files

## Implementation Update - Manual Runtime Service

The first manual runtime service is implemented behind the ontology data boundary.

Implemented files:

- `src/features/ontology/data/checkerRunService.ts`
- `src/features/ontology/data/index.ts`
- `src/features/ontology/__tests__/checkerRunService.test.ts`
- `src/features/ontology/__tests__/checkerProposalMapper.test.ts`
- `src/__tests__/stage10-architecture-guards.test.ts`

What this implements:

- `runManualOntologyChecker(input)` is the first manual checker runtime seam.
- No active branch returns explanation only and creates zero proposals.
- The service loads bounded user-fit facts, resolves the base profile and target branch, assembles a checker `ContextPack`, builds the checker prompt, calls an injected checker model seam, validates the output, maps supported findings to branch-local proposal candidates, dry-runs each candidate through `compileBranchLocalProposalApplyOperation`, and inserts only dry-run-valid proposals.
- The model call happens outside the write transaction.
- The write transaction re-reads the target branch, uses the fresh `branch.updatedAt` snapshot, deduplicates against current pending checker proposals, dry-runs candidates, and inserts survivors only.
- Patch conflicts are skipped with read-only explanation instead of being persisted as already-conflicted proposals.
- The service exports through `src/features/ontology/data/index.ts` only. It is not exported from the root ontology barrel.
- Creation does not write proposal events, mutate ontology/profile state, auto-apply, target base/core, schedule background work, update trust settings, or add checker-run persistence.

This implements step 4 of the First Implementation Shape. Step 5's user-facing trigger/readout wiring is implemented by the UI slice below.

Still not implemented:

- checker-run history table
- background/event/scheduled checker modes
- base/core checker proposal targeting
- relationship/boundary/split/merge/rename/deprecate/move/maturity operation vocabulary

Verification:

- TypeScript clean
- focused checker prompt/mapper/runtime/stage10 guard tests: 96/96 passed across 4 files

## Implementation Note - UI Trigger And Model Adapter Seam

The first-runtime product slice includes a user-facing `Run checker now` trigger/readout plus a concrete model adapter. This is implementation wiring, not a new checker architecture.

The UI/model seam is locked this way:

- The checker model adapter should mirror the Conceptualize live-wiring pattern from doc 33.
- The adapter should use the existing AI completion port shape, not introduce a second provider path.
- The adapter may concatenate `prompt.instructionShell` and `prompt.dataPayloadJson` into provider input, but it must not change `buildCheckerPrompt()` or widen the checker output schema.
- The adapter owns raw JSON parsing from the provider response.
- `validateCheckerPromptOutput(raw, pack)` remains the only semantic gate from model output to checker findings.
- Invalid JSON or invalid checker output should surface as a checker-output error; it must not fall back to unvalidated prose or create proposals from partial output.
- The first UI adapter should not retry model calls automatically. A failed manual run should surface its error and let the user explicitly run the checker again.
- The adapter should accept an `AbortSignal` from the UI/hook layer and pass it to the completion port so screen unmount or user cancellation can stop the model call.
- The UI trigger calls `runManualOntologyChecker()` and passes the model adapter through the service dependency seam.
- The UI trigger must keep the existing manual-only behavior. It must not schedule background runs, subscribe to events, or auto-run on screen load.
- The UI trigger should be disabled while a checker run is pending. This is a UX guard; data-layer deduplication remains the correctness guard for concurrent runs.
- The UI trigger must show the read-only checker explanation and skipped findings, not only created proposals.
- Created proposals should route into the existing proposal review/edit/freshness/apply surface instead of adding a checker-specific apply path.
- Error copy should map `ManualCheckerRunServiceError` codes and checker skip reasons with the same presentation discipline as proposal review errors: specific, user-readable, and fail-closed.
- Query invalidation after a successful run should refresh pending proposal lists and proposal freshness queries. It should not invalidate branch/profile state as if the checker had mutated a profile.

The first UI slice should not add a checker-run table. The readout can be transient until a later observability/run-history gate proves durable run history is needed.

## Implementation Update - UI Trigger, Readout, And Adapter

The first UI/model wiring slice is implemented.

Implemented files:

- `src/features/ontology/hooks/manualCheckerReviewAdapter.ts`
- `src/features/ontology/hooks/useRunManualOntologyChecker.ts`
- `src/features/ontology/ui/ProfileProposalReviewScreen.tsx`
- `src/features/ontology/ui/profileProposalReviewPresentation.ts`
- `src/features/learning/ui/SaveAsLearningModal.tsx`
- `src/features/ontology/__tests__/useRunManualOntologyChecker.test.ts`
- `src/features/ontology/__tests__/profileProposalReviewPresentation.test.ts`
- `src/features/ontology/__tests__/checkerPromptBuilder.test.ts`
- `src/__tests__/stage10-architecture-guards.test.ts`

What this implements:

- `completeManualCheckerPrompt()` adapts the checker prompt to the existing AI queue lane and parses raw JSON before handing output to the service validator.
- Invalid JSON becomes `ManualCheckerRunServiceError('checker_output_invalid')`; the adapter does not fall back to prose or partial proposals.
- The hook passes an `AbortSignal`, disables React Query automatic retries with `retry: false`, aborts in-flight runs on unmount, and invalidates pending proposal and freshness queries only.
- `ProfileProposalReviewScreen` shows `Run checker now`, the read-only checker summary, relationship/boundary observations, and skipped finding explanations.
- Created proposals route into the existing proposal review/edit/freshness/apply surface with the first created proposal selected.
- `SaveAsLearningModal` passes the Conceptualize branch target into the review surface only when the active proposal target is branch-local.
- The checker prompt explicitly tells the model not to include markdown fences or prose outside the JSON object.
- The review screen's branch-target fallback is marked as Gate 3 scaffolding; explicit branch/profile selection should replace it when branch/profile selection UI lands.

This completes the first checker gate end to end:

```text
bounded facts -> checker ContextPack -> validated model output -> branch-local pending proposals -> review/edit/freshness/apply
```

Verification:

- TypeScript clean
- full suite: 1031/1031 tests passed across 112 files

## Implementation Update - Checker Quality Hardening

The first checker runtime now carries two quality improvements inside the same locked V0 scope.

Implemented files:

- `src/features/ontology/contextAssembly.ts`
- `src/features/ontology/contextSelector.ts`
- `src/features/ontology/checkerPromptBuilder.ts`
- `src/features/ontology/checkerProposalMapper.ts`
- `src/features/ontology/data/checkerRunService.ts`
- `src/features/ontology/__tests__/checkerPromptBuilder.test.ts`
- `src/features/ontology/__tests__/checkerRunService.test.ts`
- `src/__tests__/stage10-architecture-guards.test.ts`

What this implements:

- Repeated correction evidence for the same active-branch correction pattern is aggregated before checker ContextPack assembly.
- Aggregated claims use the newest concrete correction row as the primary `evidenceId`, preserve all backing correction rows in `sourceEvidenceIds`, preserve source subject ids in `sourceIds`, and expose the real repetition count through `patternFrequency`.
- Checker output validation and the deterministic mapper accept evidence references from either the aggregate claim `evidenceId` or its concrete `sourceEvidenceIds`, so proposals can still carry real correction evidence ids.
- When the checker cites an aggregate claim `evidenceId`, the mapper expands the persisted proposal `evidenceIds` to the aggregate claim's concrete `sourceEvidenceIds`; when the checker cites a concrete source evidence id directly, that specific citation remains specific.
- Ontology nodes in checker ContextPacks and prompt payloads now carry `isItemType`.
- The prompt tells the checker to use `parentNodeRef` only for ontology nodes with `isItemType: true`.
- Checker output validation rejects existing-but-non-item parents with `invalid-parent-ref` before proposal mapping; final dry-run validation still remains the write-boundary guard.

This does not add new checker finding kinds, boundary/relationship operations, base/core targeting, maturity semantics, persistence tables, background runs, or auto-apply.

Verification:

- TypeScript clean
- focused checker prompt/mapper/runtime/stage10 guard tests: 103/103 passed across 4 files

## Later Gates

After the first checker runtime is proven, later docs should separately lock:

- event/scheduled/idle checker run policy
- base/core checker proposal targeting
- richer typed operation vocabulary for boundary, relationship, split, merge, rename, deprecate, move, and maturity operations
- relationship semantics and maturity lifecycle
- checker-run observability or run-history persistence
- graph selection chat over checker context
- old-card backfill as proposal jobs
- historical reversal and impact-reviewed undo

## Relationship To Existing Decisions

This document is subordinate to the numbered decision spine and clarifies the next implementation gate.

It preserves:

- doc 03's checker vision
- doc 07's dynamic relationship and maturity direction
- doc 21's shared explanation/evidence/proposal/apply architecture
- doc 24's branch-local apply semantics
- doc 25's proposal event audit model
- doc 37's advisory user-fit projection
- doc 38's explicit base/core apply path, while deferring checker-created base/core proposals
- doc 39's edit-then-apply and superseding model
- doc 40's freshness/refresh model
- Fable's next-gate ordering and typed-operation warning

It narrows only the first checker runtime slice so implementation cannot accidentally expand into future relationship, operation-vocabulary, or auto-apply work.
