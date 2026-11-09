# User-Fit Projection Decision

Date: 2026-05-26

## Decision

User-fit learning is a derived projection over already-durable facts, not a new source of truth.

The first slice adds a pure `projectUserFitSignals(input)` helper. Callers pass correction evidence and proposal events that they already loaded. The helper returns bounded node and proposal signals with confidence, score, counts, evidence/event ids, latest timestamp, and omitted counts.

The second slice adds a facts-only DB reader that loads bounded recent correction/proposal history for one base profile. The reader returns those facts to callers; it does not call the projection helper itself and does not persist learned scores.

The third slice feeds the derived projection into the shared `ContextPack` as bounded advisory `userFit` context. Conceptualize can now see relevant user correction history in its prompt payload, but that history is not semantic truth and does not grant mutation permission.

The projection helper does not read the DB, call a model, mutate a profile, update trust settings, create proposals, apply patches, or change Conceptualize save behavior.

## Plain-Language Shape

Kordex now has a small calculator that can say:

> The user often corrects this old tag into that better tag.
> The user usually accepts or rejects this kind of suggestion in this branch.

That is all. It does not change the tag system by itself.

In Conceptualize, Kordex can now also tell the classifier:

> In this exact core/branch selection, this user often corrects toward this node.

The classifier may use that as a preference signal only when the ontology meaning still fits the card.

## Inputs

- `OntologyCorrectionEvidence`
  - existing type corrections
  - missing-concept corrections where the previous type was null
  - near-miss candidates that show the model was close
- `ProfileProposalEvent`
  - applied
  - rejected
  - postponed
  - asked why

The projection helper accepts arrays from the caller. `loadUserFitProjectionFacts(input)` can now load bounded recent correction/proposal facts from the ontology data layer for callers that need DB-backed history.

## Outputs

`UserFitNodeSignal` groups correction facts by base profile, scope, and node id:

- positive correction count
- negative correction count
- missing-concept correction count
- near-miss hit count
- evidence ids
- latest timestamp
- `userFitConfidence`
- signed `score`

The node scope is the active profile selection where the correction happened, not merely the base profile id. That means:

- a correction in plain `coding` produces a different user-fit signal than the same correction in `coding + react-project`
- branch order remains part of the scope key
- project, learning, and personal branch ids are preserved separately

This prevents Kordex from treating "the user prefers this in React" as "the user prefers this everywhere in coding."

Near-miss diagnostics fold back into the active correction scope. If the hidden candidate matched the user's corrected node, that is evidence that Kordex was close in that active branch/core context; it does not create a second signal under the diagnostic candidate's source scope.

`UserFitProposalSignal` groups proposal decisions by base profile, proposal kind, and target:

- applied count
- rejected count
- postponed count
- asked-why count
- event ids
- latest timestamp
- `userFitConfidence`
- signed `score`

The projection is bounded with `maxNodeSignals` and `maxProposalSignals`, defaulting to 20 each. Omitted counts are reported so future callers know when more history exists than was returned.

## Confidence Meaning

This is not semantic truth. It is user-fit evidence.

Semantic confidence asks:

> Is Kordex probably right about the world?

User-fit confidence asks:

> Does this match how this user tends to correct and approve things in this profile or branch?

The first formula is intentionally simple and reviewable: a small beta-style prior turns positive and negative facts into a 0..1 confidence. The signed score maps that confidence to -1..1 for ranking.

Missing-concept corrections and near-miss hits are weak positive signals because they show direction, not a fully approved ontology mutation. Postponed proposals are mild negative signals. Asked-why is neutral; curiosity is not rejection.

## Boundaries

The projection and history-reader slices must not add:

- persistent learned user-fit scores
- trust setting updates
- automatic confidence/ranking updates
- automatic missing-concept apply
- proposal creation
- profile, branch, or ontology mutation
- checker runtime
- graph traversal
- vector retrieval
- UI behavior changes beyond model-facing context
- agent runtime
- app-builder runtime
- DSL runtime

## Why This Shape

Durable facts already exist:

- correction evidence
- near-miss snapshots
- proposal decision events

The next safe step is to project those facts into a small, bounded signal that later context builders, checker runs, proposal review screens, and trust-policy code can consume.

Keeping it pure makes the result easy to test and prevents the system from silently teaching itself the wrong ontology.

## Implementation

Added:

- `src/features/ontology/userFitProjection.ts`
- `src/features/ontology/__tests__/userFitProjection.test.ts`
- `src/features/ontology/data/userFitHistoryRepo.ts`
- `src/features/ontology/__tests__/userFitHistoryRepo.test.ts`
- `src/db/migrations/021-user-fit-history-recency-indexes.ts`
- `src/db/migrations/__tests__/user-fit-history-recency-indexes-migration.test.ts`

Updated:

- `src/features/ontology/index.ts`
- `src/features/ontology/data/index.ts`
- `src/features/ontology/contextAssembly.ts`
- `src/features/ontology/contextSelector.ts`
- `src/features/learning/services/conceptualizeProfileContext.ts`
- `src/features/learning/services/conceptualizeContextPack.ts`
- `src/features/learning/services/conceptualizePromptBuilder.ts`
- `src/db/migrations/index.ts`
- `src/db/schema.ts`
- `src/features/backup/format.ts`
- `src/__tests__/stage10-architecture-guards.test.ts`

The helper is exported from the ontology barrel as a pure domain projection. It imports only ontology types.

Branch-scope hardening after model review:

- `userFitActiveSelectionScopeKey(snapshot)` creates deterministic active-selection keys.
- `UserFitNodeSignal.activeSelectionSnapshot` carries normalized base/project/learning/personal branch ids.
- Matching near-miss hits increment the corrected node's active correction scope instead of creating a separate near-miss scope.

DB-backed history reader:

- `loadUserFitProjectionFacts(input)` lives behind the ontology data boundary.
- It loads recent correction evidence and proposal events for one `baseProfileId`.
- Default bounds are 500 correction evidence rows and 200 proposal event rows.
- Queries are newest-first and backed by migration 021 composite recency indexes.
- The reader returns facts only; callers decide whether and when to call `projectUserFitSignals`.

ContextPack/prompt wiring:

- `ContextPack` now has a typed `userFit` section with bounded node and proposal signals.
- `resolveConceptualizeProfileContext()` loads bounded facts for the base profile and projects them into advisory history.
- `buildConceptualizeContextPackShadow()` includes only node signals from the exact active selection scope, so branch-local preferences do not leak into the base/core or sibling branches.
- Matching user-fit node signals pin their existing scoped node refs into the pack so the classifier can only use refs that are still in the current ontology map.
- `buildConceptualizePrompt()` renders `userFit.nodeSignals` and tells the model that user fit is correction history, not semantic truth.
- If user-fit history cannot be loaded, Conceptualize falls back to an empty projection rather than blocking save.

Checker selector seam:

- `contextSelector.ts` now exposes `createCheckerContextSelector()` and `selectCheckerContext()`.
- The checker selector reuses the same pure pinned/elastic/capped selection machinery as Conceptualize and sets `consumer: 'checker'`.
- It can feed bounded advisory `userFit` node/proposal signals into a checker `ContextPack`.
- This is still only a read-only context seam. It does not add a checker runtime, model call, proposal creation, proposal apply, auto-apply, trust-setting update, graph traversal, vector retrieval, learned-score persistence, UI behavior, or ontology/profile mutation.

Missing-concept proposal revalidation hardening:

- `saveConceptualizedCapture.ts` now rejects explicit new-subtype parent ids that are not valid item type nodes in the active composed profile.
- It also rejects new-subtype labels that normalize to an existing non-item ontology node id, so a user-created type cannot collide with a relationship/field/tag node identity.
- This is still the existing manual correction/proposal path only. It does not add automatic missing-concept apply, automatic proposal creation from model suggestions, branch overlay mutation, base/core mutation, checker runtime, learned-score persistence, or UI policy changes.

## Follow-Up Gates

1. Base profile versioning before accepted operations can mutate base profiles.
2. Richer missing-concept edit/apply flows after base/core target safety is versioned.
