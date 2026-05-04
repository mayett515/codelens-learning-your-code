# Next LLM Context

Use this file as the first read for the next worker/reviewer on `refactor/ontology-profile`.

## Current Branch

```text
repo: C:\Projects\CodeLensApp\CodeLens-v2\codelens-rn
branch: refactor/ontology-profile
```

The current uncommitted slice is the profile-label sweep. It moves remaining hardcoded review, graph, and learning UI labels into the active ontology profile while preserving the current coding wording.

Do not stage, commit, push, reset, or checkout unless the user explicitly asks.

## Read These Files

Read in this order:

1. `ONTOLOGY_PROFILE_REFACTOR/implementation_handoff.md` - current durable state and completed work.
2. `ONTOLOGY_PROFILE_REFACTOR/05_ANTI_REGRESSION_RULES.md` - hard constraints and compatibility boundaries.
3. `ONTOLOGY_PROFILE_REFACTOR/03_CATEGORIZATION_AND_ONTOLOGY_CHECKER.md` - next product direction: correction flow and ontology checker.
4. `ONTOLOGY_PROFILE_REFACTOR/04_REFACTOR_WITHOUT_BREAKING_APP.md` - staged implementation plan and persistence/correction ideas.
5. `ONTOLOGY_PROFILE_REFACTOR/02_DYNAMIC_PROFILE_SCHEMA.md` - proposed future profile/correction/suggestion shapes.
6. `ONTOLOGY_PROFILE_REFACTOR/README.md` - map of this refactor folder.
7. Root docs if persistence or architecture is touched: `ARCHITECTURE.md`, `PERSISTENCE.md`.

## Current Changed Files

Expected tracked changes in the current label-profile sweep:

```text
ONTOLOGY_PROFILE_REFACTOR/implementation_handoff.md
src/features/ontology/types.ts
src/features/ontology/profiles/codingProfile.ts
src/features/ontology/__tests__/codingProfile.test.ts
src/features/learning/review/ui/ReflectionInput.tsx
src/features/learning/review/ui/ReviewResultScreen.tsx
src/features/learning/review/ui/ReviewSessionScreen.tsx
src/features/learning/review/ui/ReviewThresholdScreen.tsx
src/features/learning/review/ui/SelfRatingPrompt.tsx
src/features/learning/review/ui/ShowSavedReveal.tsx
src/features/learning/ui/ConceptListSection.tsx
src/features/learning/ui/LearningHubScreen.tsx
src/features/learning/ui/SessionFlashbackScreen.tsx
src/features/graph/ui/GraphLegend.tsx
src/features/graph/ui/GraphModeBar.tsx
src/features/graph/ui/GraphScreen.tsx
src/features/graph/ui/NodePreviewTooltip.tsx
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

## Verification Already Run

Latest verified commands:

```powershell
node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit
npm test -- --run src/features/ontology/__tests__/codingProfile.test.ts
npm test -- --run
```

Latest result:

```text
TypeScript clean
codingProfile.test.ts: 13/13 passed
full suite: 336/336 passed across 49 test files
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

The label-profile cleanup is now effectively complete. The next major product slice should be ontology correction/checker work.

Good next bounded slice:

```text
Read-only or test-first design audit for ontology corrections:
- find current capture/concept correction UI surfaces
- find existing classification/confidence data available to store correction evidence
- propose the smallest implementation slice for storing user correction evidence
- do not edit production code unless explicitly asked
```

Likely implementation sequence after audit:

1. Define correction evidence types and storage boundary.
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
