# Next LLM Context

Use this file as the first read for the next worker/reviewer on `refactor/ontology-profile`.

## Current Branch

```text
repo: C:\Projects\CodeLensApp\CodeLens-v2\codelens-rn
branch: refactor/ontology-profile
```

The current uncommitted slice is ontology correction evidence groundwork. The profile-label sweep is already checkpointed in git. Current changes add domain-only correction evidence types, a pure correction validator, and source-level guards that prevent premature persistence, UI, checker, or automatic profile mutation work.

Do not stage, commit, push, reset, or checkout unless the user explicitly asks.

## Read These Files

Read in this order:

1. `ONTOLOGY_PROFILE_REFACTOR/implementation_handoff.md` - current durable state and completed work.
2. `ONTOLOGY_PROFILE_REFACTOR/05_ANTI_REGRESSION_RULES.md` - hard constraints and compatibility boundaries.
3. `ONTOLOGY_PROFILE_REFACTOR/03_CATEGORIZATION_AND_ONTOLOGY_CHECKER.md` - next product direction: correction flow and ontology checker.
4. `ONTOLOGY_PROFILE_REFACTOR/04_REFACTOR_WITHOUT_BREAKING_APP.md` - staged implementation plan and persistence/correction ideas.
5. `ONTOLOGY_PROFILE_REFACTOR/02_DYNAMIC_PROFILE_SCHEMA.md` - proposed future profile/correction/suggestion shapes.
6. `ONTOLOGY_PROFILE_REFACTOR/06_PROFILE_BRANCHING_AND_MERGE.md` - profile inheritance, branching, overlays, and merge semantics.
7. `ONTOLOGY_PROFILE_REFACTOR/README.md` - map of this refactor folder.
8. `ONTOLOGY_PROFILE_REFACTOR/TOMORROW_START.md` - startup prompt and next-slice reminder.
9. Root docs if persistence or architecture is touched: `ARCHITECTURE.md`, `PERSISTENCE.md`.

## Current Changed Files

Expected tracked changes in the current correction evidence slice:

```text
ONTOLOGY_PROFILE_REFACTOR/implementation_handoff.md
src/features/ontology/types.ts
src/features/ontology/index.ts
src/features/ontology/corrections.ts
src/features/ontology/__tests__/corrections.test.ts
src/__tests__/stage10-architecture-guards.test.ts
```

Expected untracked local tool folders:

```text
.claude/
.pi/
```

Do not include local tool folders in a product commit unless the user explicitly requests it.

## What Was Just Completed

- Review UI labels now read from `ReviewProfile` or existing `profile.labels.reviewModeTitle`.
- Graph screen/mode/status/tooltip/legend labels now read from `GraphProfile`.
- Learning hub, concept list, and session flashback labels now read from `DomainLabels`.
- Flashback labels are nested under `profile.labels.flashback`.
- Graph helper labels are nested under `profile.graph.statusLabels`, `profile.graph.tooltipLabels`, and `profile.graph.legendHelperLabels`.
- Dynamic/fallback strings are profile-owned:
  - `Unknown`
  - concept/capture count templates
  - lowercase count labels: `concept`, `concepts`, `capture`, `captures`
  - day count tooltip labels
- `GraphLegend` title is profile-owned as `profile.graph.legendHelperLabels.title`.
- Correction evidence domain groundwork exists:
  - `OntologyCorrectionEvidence`
  - `OntologyCorrectionSubjectKind`
  - `OntologyCorrectionField`
  - `OntologyCorrectionSource`
  - `validateOntologyCorrection()`
- Correction validation is domain-only. It checks profile id, non-empty ids, valid previous/corrected ontology item type ids, no-op corrections, and input/profile immutability.
- Architecture guards now keep correction evidence narrow for this stage:
  - correction field is only `typeNodeId`
  - correction source is only `user`
  - no forbidden ontology imports from DB, backup, learning, or graph
  - no `ontology_corrections` or `ontology_patch_suggestions` source implementation yet
  - no automatic profile mutation helper in `corrections.ts`

## Verification Already Run

Latest verified commands:

```powershell
node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit
npm test -- --run src/features/ontology/__tests__/codingProfile.test.ts
npm test -- --run src/__tests__/stage10-architecture-guards.test.ts src/features/ontology/__tests__/corrections.test.ts
npm test -- --run
```

Latest result:

```text
TypeScript clean
correction/architecture targeted tests: 30/30 passed
full suite: 356/356 passed across 50 test files
```

## Important Compatibility Boundaries

Do not rename or remove these in this cycle:

- `LearningConcept.conceptType`
- `ConceptHint.proposedConceptType`
- DB columns such as `concept_type`, `proposed_concept_type`, and old coding metadata columns
- structural folder/component names such as `learning`, `ConceptCardFull`, `LearningHubScreen`
- old coding-specific columns: `coreConcept`, `architecturalPattern`, `programmingParadigm`, `conceptType`

Persistence and backup/import compatibility work is already complete for migration 011. Do not touch persistence unless the user explicitly asks and the prompt includes raw-shape tests.

## Next Real Work

The label-profile cleanup is complete. Correction evidence domain groundwork is now in place. The next major product decisions are about where correction happens in the UI and when/how correction evidence is persisted.

The user also wants Kortex profile branches: a general coding profile should be extendable into project, job, learning, or personal branches that can stay separate or later merge selected changes back. "Core" means immutable within a profile lineage; a fork/user can create a different ground-zero base profile later. Read `06_PROFILE_BRANCHING_AND_MERGE.md` before proposing correction/checker storage or UI.

Good next bounded slice:

```text
Decision brief before implementation:
- what exactly counts as a correction in product terms
- whether first correction UI belongs in capture save, promotion review, concept detail, or another surface
- whether internal `subjectKind: 'capture' | 'item'` is the right vocabulary, or whether current app UI should keep saying concept
- whether correction evidence should be persisted next, or whether a UI affordance should come first
- what tests prove correction evidence never mutates the profile automatically
- whether the first branch/overlay implementation should be project overlay, learning lens, or personal correction layer
- whether correction evidence defaults to branch-only or mergeable back into the parent profile
- whether the next implementation should be internal-only profile composition helpers: base + branch/overlay -> composed runtime profile
```

Likely implementation sequence after audit:

1. Decide product semantics for corrections and first UI surface.
2. Add a UI affordance where users can correct a proposed ontology/type classification.
3. Store corrections as evidence, not as automatic profile mutations.
4. Add a checker/suggestion model that proposes profile patches with evidence IDs.
5. Add an approval UI so the user can accept, edit, reject, or postpone patch suggestions.

## Guardrails For Next Worker

- The model may suggest taxonomy/profile changes; it must not silently apply them.
- User/profile-owner approval is required before ontology suggestions become durable profile changes.
- Prefer improving boundary rules before adding new categories.
- Every checker suggestion must include evidence IDs and a reason.
- Do not rewrite user captures during ontology review.
- Do not invent source evidence.
- Do not make the app generic in a way that weakens the coding product.
