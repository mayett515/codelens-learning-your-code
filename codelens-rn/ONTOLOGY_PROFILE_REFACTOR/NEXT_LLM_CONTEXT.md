# Next LLM Context

Use this file as the first read for the next worker/reviewer on `refactor/ontology-profile`.

## Current Branch

```text
repo: C:\Projects\CodeLensApp\CodeLens-v2\codelens-rn
branch: refactor/ontology-profile
```

The latest source slice is ontology correction evidence groundwork. The profile-label sweep is already checkpointed in git. Source changes add domain-only correction evidence types, a pure correction validator, and source-level guards that prevent premature persistence, UI, checker, or automatic profile mutation work.

The latest profile/core source slices add pure profile composition helpers and the first explicit active-profile overlay seam. `composeDomainProfile(base, overlays)` composes branch/project/learning/personal overlays without mutating inputs. `getActiveDomainProfile(overlays?)` still returns `codingProfile` by reference with no overlays or an empty list, and composes supplied overlays only when callers explicitly opt in.

The latest product framing is stronger than "make CodeLens profile-driven": Kortex Core is the reusable ontology/graph/versioned reasoning system, and CodeLens/coding is the first serious child core/wrapper around it. Read `07_KORTEX_CORE_AND_CHILD_CORES.md` before implementing more branch, relationship, graph, or correction semantics.

The agent/subagent idea is preserved as architecture, not current implementation: Kortex can be an agent execution ontology. Tags/subtags, `is`, `is not`, and `extends` may later define agent identity, behavior, Ausfuehrung/execution constraints, allowed/forbidden operations, tool/file scope, and approval gates. Read the `Agent Execution Ontology` section in `07_KORTEX_CORE_AND_CHILD_CORES.md` before proposing orchestration or subagent behavior.

The self-building-app idea is also preserved as architecture, not current implementation: Kortex can become the ontology/coherence framework behind app builders. User intent becomes a project app core; domain entities, workflows, screens, schema/API/UI/test responsibilities become ontology and child/subagent cores; user corrections become evidence and patch suggestions that update the project ontology before more code is generated. Read the `Self-Building App Framework Direction` section in `07_KORTEX_CORE_AND_CHILD_CORES.md` before proposing app-builder features.

There is also a future language-layer direction: keep TypeScript for the current app/core seams, but design protocol-first operations so a later Racket/Kortex DSL can compile into validated core operations. Read `08_KORTEX_LANGUAGE_LAYER_AND_ADAPTERS.md` before proposing language/runtime/adapter changes.

There is also an overlay direction: Kortex can sit over existing systems such as codebases, notes, databases, LLM tools, and project systems. Read `09_KORTEX_OVER_EXISTING_SYSTEMS.md` before proposing adapters, sync, source identity, MCP-over-codebase, or write-back behavior.

Do not stage, commit, push, reset, or checkout unless the user explicitly asks.

## Read These Files

Read in this order:

1. `ONTOLOGY_PROFILE_REFACTOR/implementation_handoff.md` - current durable state and completed work.
2. `ONTOLOGY_PROFILE_REFACTOR/07_KORTEX_CORE_AND_CHILD_CORES.md` - updated product boundary: Kortex Core, child cores, agent execution ontology, self-building app framework direction, graph projections, dynamic relationship semantics.
3. `ONTOLOGY_PROFILE_REFACTOR/08_KORTEX_LANGUAGE_LAYER_AND_ADAPTERS.md` - future Racket/DSL language-layer direction and protocol-first adapter boundary.
4. `ONTOLOGY_PROFILE_REFACTOR/09_KORTEX_OVER_EXISTING_SYSTEMS.md` - non-destructive overlay model for codebases, notes, databases, LLMs, and other systems.
5. `ONTOLOGY_PROFILE_REFACTOR/05_ANTI_REGRESSION_RULES.md` - hard constraints and compatibility boundaries.
6. `ONTOLOGY_PROFILE_REFACTOR/03_CATEGORIZATION_AND_ONTOLOGY_CHECKER.md` - next product direction: correction flow and ontology checker.
7. `ONTOLOGY_PROFILE_REFACTOR/04_REFACTOR_WITHOUT_BREAKING_APP.md` - staged implementation plan and persistence/correction ideas.
8. `ONTOLOGY_PROFILE_REFACTOR/02_DYNAMIC_PROFILE_SCHEMA.md` - proposed future profile/correction/suggestion shapes.
9. `ONTOLOGY_PROFILE_REFACTOR/06_PROFILE_BRANCHING_AND_MERGE.md` - profile inheritance, branching, overlays, and merge semantics.
10. `ONTOLOGY_PROFILE_REFACTOR/README.md` - map of this refactor folder.
11. `ONTOLOGY_PROFILE_REFACTOR/TOMORROW_START.md` - startup prompt and next-slice reminder.
12. Root docs if persistence or architecture is touched: `ARCHITECTURE.md`, `PERSISTENCE.md`.

## Current Changed Files

Expected tracked changes in the current core-framing documentation slice:

```text
ONTOLOGY_PROFILE_REFACTOR/07_KORTEX_CORE_AND_CHILD_CORES.md
ONTOLOGY_PROFILE_REFACTOR/08_KORTEX_LANGUAGE_LAYER_AND_ADAPTERS.md
ONTOLOGY_PROFILE_REFACTOR/09_KORTEX_OVER_EXISTING_SYSTEMS.md
ONTOLOGY_PROFILE_REFACTOR/README.md
ONTOLOGY_PROFILE_REFACTOR/NEXT_LLM_CONTEXT.md
ONTOLOGY_PROFILE_REFACTOR/TOMORROW_START.md
ONTOLOGY_PROFILE_REFACTOR/00_DOC_SYNC.md
ONTOLOGY_PROFILE_REFACTOR/implementation_handoff.md
src/features/ontology/index.ts
src/features/ontology/types.ts
src/features/ontology/profileComposition.ts
src/features/ontology/__tests__/profileComposition.test.ts
src/features/ontology/__tests__/activeProfile.test.ts
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
- Profile composition helpers exist:
  - `ProfileOverlayKind`
  - `ProfileOverlay<TItemTypeNodeId>`
  - `composeDomainProfile(base, overlays)`
  - project/learning overlays compose before personal overlays
  - later overlays of the same kind win deterministically
  - composition is pure and does not mutate inputs
- Active profile overlay seam exists:
  - `getActiveDomainProfile()` returns `codingProfile` directly
  - `getActiveDomainProfile([])` returns `codingProfile` directly
  - `getActiveDomainProfile(overlays)` composes overlays explicitly
  - no global selector, persistence, UI, or automatic profile mutation has been added

## Verification Already Run

Latest verified commands:

```powershell
node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit
npm test -- --run src/features/ontology/__tests__/codingProfile.test.ts src/features/ontology/__tests__/profileComposition.test.ts src/features/ontology/__tests__/activeProfile.test.ts
npm test -- --run
```

Latest result:

```text
TypeScript clean
ontology targeted tests: 28/28 passed across 3 test files
full suite: 371/371 passed across 52 test files
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

The user also wants Kortex profile branches: a general coding child should be extendable into project, job, learning, or personal branches that can stay separate or later merge selected changes back. "Core" means immutable within a profile lineage; a fork/user can create a different ground-zero base profile later. Read `06_PROFILE_BRANCHING_AND_MERGE.md` before proposing correction/checker storage or UI.

Updated framing: Kortex Core is the ontology/graph/versioned reasoning core. CodeLens/coding is the first child core/wrapper. Do not design future branch, graph, relationship, or correction code as if CodeLens is the boundary of the system.

Important relationship-semantics caution before implementation:

```text
Current compatibility shape: prerequisite / related / contrast.
Newer product direction: is / is not boundary anchors plus dynamic profile/user/LLM-created relationship labels.
Do not hardcode a global final relationship taxonomy until this is reconciled deliberately.
```

Important language/runtime caution before implementation:

```text
Keep TypeScript for the current app and profile composition work.
Do not introduce Racket into this repo now.
Design pure helpers and future operation shapes so a Racket/Kortex DSL can compile to them later.
Self-updating means validated ontology/graph operations, not hidden source-code rewrites.
```

Important overlay caution before implementation:

```text
Kortex may later sit over existing systems through read/write/sync adapters.
It should be non-destructive by default: understand first, write back only by explicit approval/policy.
Do not build source sync, file watchers, static analysis, MCP, or write-back in the current composition slice.
```

Important agent/subagent caution before implementation:

```text
Kortex may later wrap agents/subagents with ontology-backed execution policy.
Tags/subtags can describe behavior, allowed operations, forbidden operations, and approval gates.
This is architecture direction only. Do not add orchestration, agent runtime, MCP policy tools, or permission enforcement in the current branch unless explicitly asked.
```

Important self-building-app caution before implementation:

```text
Kortex may later be the framework behind self-building apps: intent -> project ontology -> constrained subagents -> generated/modified app -> corrections feed ontology.
This is architecture direction only. Do not add app-builder runtime, code-generation orchestration, generated-app persistence, or source write-back in the current branch unless explicitly asked.
```

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
- whether branch/overlay state should be persisted next or whether correction/checker persistence should come first
- whether the next runtime source for overlays should be UI-driven, config-driven, or test-only
- how current `relationshipTypeNodeIds` compatibility maps to future `is` / `is not` and dynamic labels
- whether helper shapes should already look like serializable operations that a future DSL could target
- whether future external-backed nodes need an extension point later, without implementing source adapters now
```

Likely implementation sequence after audit:

1. Reconcile Kortex Core/child-core framing with the next internal composition helper names and tests.
2. Decide product semantics for corrections and first UI surface.
3. Add a UI affordance where users can correct a proposed ontology/type classification.
4. Store corrections as evidence, not as automatic profile mutations.
5. Add a checker/suggestion model that proposes profile patches with evidence IDs.
6. Add an approval UI so the user can accept, edit, reject, or postpone patch suggestions.

## Guardrails For Next Worker

- The model may suggest taxonomy/profile changes; it must not silently apply them.
- User/profile-owner approval is required before ontology suggestions become durable profile changes.
- Prefer improving boundary rules before adding new categories.
- Every checker suggestion must include evidence IDs and a reason.
- Do not rewrite user captures during ontology review.
- Do not invent source evidence.
- Do not make the app generic in a way that weakens the coding product.
- Do not let Kortex Core depend on CodeLens UI or coding-only relationship assumptions.
- Do not introduce a new runtime/language dependency before the TypeScript core seams are stable.
- Do not make Kortex assume it owns every source entity; future overlays may reference external systems.
