# Next LLM Context

Use this file as the first read for the next worker/reviewer on `refactor/ontology-profile`.

## Current Branch

```text
repo: C:\Projects\CodeLensApp\CodeLens-v2\codelens-rn
branch: refactor/ontology-profile
```

The latest source slice is the A2 decision implemented: `prepareSaveCandidates` now accepts an optional `profile?: DomainProfile` through its options parameter. The service receives the finished/composed brain, not branch ingredients. Default behavior stays `getActiveDomainProfile()` with the coding profile. When a caller supplies a composed profile, it flows through to `buildExtractorSystemPrompt`. A1 (passing `ActiveDomainProfileActivationInput` into `prepareSaveCandidates`) was explicitly rejected; composition still belongs elsewhere.

The runtime profile coordinator decision is now locked (doc 11). The brain mixer is an explicit separate layer above runtime services. Services receive a composed `DomainProfile` and do not know branch groups, do not call activation input resolvers, and do not read hidden global active-profile state. Alternatives rejected: service-owned mixing, UI-screen-owned mixing, hidden global `getRuntimeProfile()` / active-profile store, and persistence-owned composed profile as the current shape. The coordinator can later grow into the Kortex Runtime, but not in this slice.

The correction evidence persistence decision is now locked (doc 12). Evidence-first persistence: correction evidence is stored as a fact, not a mutation. Patch suggestions come later and require user approval before any ontology or profile change. No automatic ontology/profile mutation. Direct user-authored ontology changes are allowed. Model/checker suggestions require approval. No `branchId` or `targetLayerId` until branch persistence exists. No checker runtime/UI, no DB/migration/source implementation, no auto-apply, no agent/app-builder runtime in this slice.

The branch/overlay persistence decision is now locked (doc 13). Persist branch layers separately, not composed runtime profiles. Overlays are the durable source; the composed runtime profile is derived. Merging upward requires approval. Sibling branches do not affect each other. Parent profiles stay clean. This locks the persistence model that backs the product model in doc 06 and is consistent with the runtime composition decisions in docs 10 and 11. No DB, UI, storage API, automatic merge, checker runtime, patch suggestion table, correction storage, agent/subagent runtime, app-builder runtime, Racket/DSL implementation, or MCP/adapters is implemented in this slice.

The profile selection and branch resolution decision is now locked (doc 14). Branch persistence, active selection, branch resolution, and runtime composition are separate boundaries. `ProfileSelection` is per-context and id-based: it selects one base profile id plus ordered project/learning/personal branch ids. A resolver later turns ids into branch values; the Runtime Profile Coordinator composes resolved values into a runtime `DomainProfile`. There is no global active selection singleton, no composed runtime profile as canonical truth, no DB/UI/MCP/agent/app-builder/DSL runtime in this slice, and no multi-base composition in v1.

The domain-only ProfileBranch model is now implemented and tested. `ProfileBranchKind` and `ProfileBranch<TItemTypeNodeId>` live in `types.ts`. `profileBranches.ts` provides pure helpers: `profileBranchToOverlay`, `groupProfileBranchesByKind`, `createActiveDomainProfileSourceFromBranches`, and `composeRuntimeDomainProfileFromBranches`. These helpers convert branch layers into existing grouped overlay/runtime coordinator inputs without duplicating composition logic. This is TypeScript domain groundwork only; no DB, migration, storage API, UI selector, automatic merge, correction branch fields, MCP/adapters, agent runtime, app-builder runtime, or DSL runtime was added.

The domain-only ProfileSelection helper slice is now implemented and tested. `ProfileSelection` lives in `types.ts`. `profileSelection.ts` provides pure helpers: `resolveProfileSelection` and `composeRuntimeDomainProfileFromSelection`. The resolver requires base id match, resolves selected branch ids from caller-provided branch values, throws on missing ids and wrong-kind ids, preserves selection order within each kind, normalizes kind order project -> learning -> personal, and delegates runtime composition through `composeRuntimeDomainProfileFromBranches`. No DB, migration, storage API, profile registry, UI selector, global active selection, MCP/adapters, agent runtime, app-builder runtime, DSL runtime, multi-base composition, merge, or promotion logic was added.

The ProfileRegistry/ProfileSource direction is documented and the v1 static source helper is implemented (doc 15). Base profiles resolve through a source-based `ProfileRegistry`, separate from `ProfileBranchStore`. The interface leaves room for future built-in/file/DB/adapter sources. V1 implements only static/in-memory profile source helpers: `DomainProfileSummary`, `ProfileSource`, `ProfileRegistry`, `DuplicateProfileIdError`, `ProfileNotFoundError`, `toDomainProfileSummary`, `createStaticProfileSource`, and `createProfileRegistry`. Duplicate profile ids throw structured errors across all sources. No DB, migration, storage API, profile persistence, file source, adapter source, profile editor UI, global active registry, MCP, agent runtime, app-builder runtime, DSL runtime, branch persistence, active selection changes, service changes, multi-base composition, or automatic versioning was added.

The ProfileBranchStore v1 seam is now implemented by Kimi Code CLI and accepted after Codex review. `ProfileBranchStore<TItemTypeNodeId>` lives in `types.ts`, and `profileBranchStore.ts` exposes `createStaticProfileBranchStore({ branches })`. This is static/in-memory only: it snapshots the branch array at construction, returns branch objects by reference, preserves requested id order, skips missing ids, preserves duplicate requested ids, and lists branches by `parentProfileId` in constructor order. No DB, migration, backup, UI, global active selection, automatic merge, MCP/adapters, agent runtime, app-builder runtime, or DSL runtime was added. The CLI run ended with a Windows console Unicode/charmap final-report crash, but Codex verification passed.

The coordinator helper is now implemented and tested: `runtimeProfileCoordinator.ts` is the explicit above-services coordinator boundary. `composeRuntimeDomainProfile(input)` delegates to `resolveActiveDomainProfileFromActivationInput(input)`. `RuntimeProfileCoordinatorInput` aliases `ActiveDomainProfileActivationInput`. Services still receive composed `DomainProfile`; they do not call this helper directly unless their caller passes the result. No DB, UI, persistence, global store, service hidden lookup, agent runtime, app-builder runtime, or DSL runtime was added.

The latest profile/core source slices add pure profile composition helpers, the first explicit active-profile overlay seam, and an explicit active-profile source resolver. `composeDomainProfile(base, overlays)` composes branch/project/learning/personal overlays without mutating inputs. `ActiveDomainProfileSource` packages a caller-owned `baseProfile` plus optional overlays, and `resolveActiveDomainProfile(source)` returns the base profile by reference when overlays are omitted/null/empty or composes explicit overlays when supplied. `getActiveDomainProfile(overlays?)` still returns `codingProfile` by reference with no overlays or an empty list, and now delegates through the resolver for explicit overlays. The latest guard batch added deeper immutability tests, active-profile no-cache/no-hidden-state tests, future runtime source guards, future architecture anti-regression rules, and durable doc-anchor guards.

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
5. `ONTOLOGY_PROFILE_REFACTOR/10_ACTIVE_PROFILE_RUNTIME_SOURCE_DECISION.md` - locked decision (A2): save/extraction receives composed DomainProfile via options.profile, not activation input.
6. `ONTOLOGY_PROFILE_REFACTOR/11_RUNTIME_PROFILE_COORDINATOR_DECISION.md` - locked decision: explicit Runtime Profile Coordinator / Brain Mixer layer above services.
7. `ONTOLOGY_PROFILE_REFACTOR/12_CORRECTION_EVIDENCE_PERSISTENCE_DECISION.md` - locked decision: evidence-first persistence, patch suggestions later, no automatic ontology/profile mutation.
8. `ONTOLOGY_PROFILE_REFACTOR/13_BRANCH_OVERLAY_PERSISTENCE_DECISION.md` - locked decision: persist branch layers separately, not composed runtime profiles. Overlays are the durable source; composition is derived. Merging upward requires approval.
9. `ONTOLOGY_PROFILE_REFACTOR/14_PROFILE_SELECTION_AND_BRANCH_RESOLUTION_DECISION.md` - locked decision: branch persistence, active selection, branch resolution, and runtime composition are separate boundaries. Selection is per-context, id-based, single-base in v1, and resolved before composition.
10. `ONTOLOGY_PROFILE_REFACTOR/15_PROFILE_REGISTRY_AND_PROFILE_SOURCES_DECISION.md` - decision + implementation: source-based ProfileRegistry, static/in-memory source v1, future built-in/file/DB/adapter sources, duplicate profile ids throw structured errors.
11. `ONTOLOGY_PROFILE_REFACTOR/05_ANTI_REGRESSION_RULES.md` - hard constraints and compatibility boundaries.
12. `ONTOLOGY_PROFILE_REFACTOR/03_CATEGORIZATION_AND_ONTOLOGY_CHECKER.md` - next product direction: correction flow and ontology checker.
13. `ONTOLOGY_PROFILE_REFACTOR/04_REFACTOR_WITHOUT_BREAKING_APP.md` - staged implementation plan and persistence/correction ideas.
14. `ONTOLOGY_PROFILE_REFACTOR/02_DYNAMIC_PROFILE_SCHEMA.md` - proposed future profile/correction/suggestion shapes.
15. `ONTOLOGY_PROFILE_REFACTOR/06_PROFILE_BRANCHING_AND_MERGE.md` - profile inheritance, branching, overlays, and merge semantics.
16. `ONTOLOGY_PROFILE_REFACTOR/README.md` - map of this refactor folder.
17. `ONTOLOGY_PROFILE_REFACTOR/TOMORROW_START.md` - startup prompt and next-slice reminder.
18. Root docs if persistence or architecture is touched: `ARCHITECTURE.md`, `PERSISTENCE.md`.

## Current Changed Files

Expected tracked changes in the current post-Kimi-Code-CLI-Slice-1 state:

```text
ONTOLOGY_PROFILE_REFACTOR/13_BRANCH_OVERLAY_PERSISTENCE_DECISION.md
ONTOLOGY_PROFILE_REFACTOR/14_PROFILE_SELECTION_AND_BRANCH_RESOLUTION_DECISION.md
ONTOLOGY_PROFILE_REFACTOR/15_PROFILE_REGISTRY_AND_PROFILE_SOURCES_DECISION.md
ONTOLOGY_PROFILE_REFACTOR/12_CORRECTION_EVIDENCE_PERSISTENCE_DECISION.md
ONTOLOGY_PROFILE_REFACTOR/11_RUNTIME_PROFILE_COORDINATOR_DECISION.md
ONTOLOGY_PROFILE_REFACTOR/NEXT_LLM_CONTEXT.md
ONTOLOGY_PROFILE_REFACTOR/README.md
ONTOLOGY_PROFILE_REFACTOR/TOMORROW_START.md
ONTOLOGY_PROFILE_REFACTOR/implementation_handoff.md
ONTOLOGY_PROFILE_REFACTOR/WHERE_WE_STAND.md
ONTOLOGY_PROFILE_REFACTOR/10_ACTIVE_PROFILE_RUNTIME_SOURCE_DECISION.md
ONTOLOGY_PROFILE_REFACTOR/06_PROFILE_BRANCHING_AND_MERGE.md
ONTOLOGY_PROFILE_REFACTOR/KORTEX_DEVELOPER_EXPLAINER.md
src/__tests__/stage10-architecture-guards.test.ts
src/features/learning/services/prepareSaveCandidates.ts
src/features/learning/services/__tests__/stage2-prepareSaveCandidates.test.ts
src/features/ontology/types.ts
src/features/ontology/profileBranches.ts
src/features/ontology/__tests__/profileBranches.test.ts
src/features/ontology/profileSelection.ts
src/features/ontology/__tests__/profileSelection.test.ts
src/features/ontology/profileRegistry.ts
src/features/ontology/__tests__/profileRegistry.test.ts
src/features/ontology/profileBranchStore.ts
src/features/ontology/__tests__/profileBranchStore.test.ts
src/features/ontology/runtimeProfileCoordinator.ts
src/features/ontology/__tests__/runtimeProfileCoordinator.test.ts
src/features/ontology/index.ts
src/features/ontology/profileActivation.ts
src/features/ontology/__tests__/profileActivation.test.ts
```

Expected untracked local tool folders:

```text
.claude/
```

Worker prompts/logs for the HR/KR workflow live under `C:\pi-stuff`, not in this repo. Do not include local tool folders in a product commit unless the user explicitly requests it.

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
  - `ActiveDomainProfileSource` and `resolveActiveDomainProfile(source)` provide a structured, caller-owned base+overlays source without global state
  - no global selector, persistence, UI, or automatic profile mutation has been added
- The five-slice ontology guard batch hardened this seam and the future architecture boundaries:
  - profile composition output does not share mutable nested graph, ontology, or metadata references with base profiles or overlays
  - active-profile overlay composition has no cache/global state and does not mutate overlay inputs
  - stage10 guards block hidden active overlay/profile state names in ontology source
  - stage10 guards block future agent/app operation names and profile overlay persistence table names from production source
  - `05_ANTI_REGRESSION_RULES.md` now preserves Kortex Core boundary rules and future architecture guardrails
  - stage10 doc-anchor guards preserve agent/subagent and self-building-app architecture sections in durable docs
- Batch 2 added/accepted:
  - active-profile seam guards: singleton no-arg/empty-array reference, frozen overlay input, mixed three-kind seam precedence, same-kind input order
  - stage10 doc-anchor guards for doc 06 branching/merge durable anchors
  - profile composition tests for mixed three-kind precedence, three same-kind project overlay chain, and no-op overlay equivalence
- Batch 3 added/accepted:
  - correction validation tests proving overlay-added type ids validate only against an explicitly composed profile
  - `overrideOntology` composition tests for item/relationship id merge/dedupe, node deep cloning, and composition with typed add fields
  - active-profile ontology helper tests proving `getOntologyNode`/`getOntologyNodeLabel` stay profile-parameter driven and do not leak hidden overlay state
- Batch 4 Slice 1 added/accepted:
  - `ActiveDomainProfileSource<TItemTypeNodeId>` type
  - `resolveActiveDomainProfile(source)` pure resolver
  - `getActiveDomainProfile(overlays?)` now delegates through the resolver without changing no-arg/empty-array reference behavior
  - `profileActivation.test.ts` covers omitted/null/empty overlays, explicit composition, immutability, no-cache behavior, and non-default base profiles
- Batch 5 Slice 1 added/accepted:
  - `ActiveDomainProfileActivationInput<TItemTypeNodeId>` type in `types.ts` with grouped overlay fields (`projectOverlays`, `learningOverlays`, `personalOverlays`)
  - `createActiveDomainProfileSource(input)` in `profileActivation.ts` - flattens grouped overlays in normalized order (project -> learning -> personal) into an `ActiveDomainProfileSource`
  - `resolveActiveDomainProfileFromActivationInput(input)` in `profileActivation.ts` - convenience resolver that composes grouped overlays through the pipeline in one step
  - Exports from `src/features/ontology/index.ts`
- Batch 5 Slice 2 added/accepted:
  - `profileActivation.test.ts` now covers source creation, no-overlay reference behavior, group normalization (project -> learning -> personal), precedence (personal wins over project and learning; learning wins over project when personal is absent), later overlays inside the same project group win, returned overlays container is new and mutating it does not mutate original group arrays, frozen input/group/overlay values compose correctly
- Batch 5 Slice 3 added/accepted:
  - Stage10 architecture guard proves `profileActivation.ts` exports `createActiveDomainProfileSource` and `resolveActiveDomainProfileFromActivationInput`
  - Stage10 architecture guard proves `profileActivation.ts` contains no forbidden state/persistence/runtime strings (AsyncStorage, sqlite, drizzle, schema, db, zustand, createStore, useActiveDomainProfile, setActiveDomainProfile, setActiveProfile, activeProfileStore, activeOverlays, profile_overlays, profile_branches, active_profile_overlay)
  - Stage10 guard count: 39 -> 40
- Decision brief added, then A2 locked and implemented in Batch 6:
  - `10_ACTIVE_PROFILE_RUNTIME_SOURCE_DECISION.md` records the locked A2 decision: save/extraction path (`prepareSaveCandidates`) as the first real overlay-aware runtime caller
  - DB, UI, persistence, branch storage, correction storage, agent runtime, app-builder runtime, MCP/adapters, and DSL runtime were kept out of the code slice
- Batch 6 Slice 1 added/accepted:
  - `prepareSaveCandidates` options now include `profile?: DomainProfile | undefined`
  - Default behavior: `const profile = options?.profile ?? getActiveDomainProfile()`
  - The profile flows into `buildExtractorSystemPrompt({ profile, relevantConcepts })`
  - Tests: 4 total (default coding profile, overlay-added ontology node in prompt, base/overlay immutability, original mapping test)
  - No DB, UI, persistence, global state, setters, activation input, branch storage, correction storage, MCP/adapters, agent runtime, app-builder runtime, or DSL runtime added
  - A1 (passing `ActiveDomainProfileActivationInput` into `prepareSaveCandidates`) is explicitly rejected for this service
- Batch 7 Slice 1 added/accepted:
  - Created `11_RUNTIME_PROFILE_COORDINATOR_DECISION.md` with locked decision: explicit coordinator layer above services, services receive composed DomainProfile, no hidden global state
  - No source code or tests changed in this slice
- Batch 7 Slice 2 added/accepted:
  - `runtimeProfileCoordinator.ts` is the explicit above-services coordinator boundary
  - `composeRuntimeDomainProfile(input)` delegates to `resolveActiveDomainProfileFromActivationInput(input)`
  - `RuntimeProfileCoordinatorInput` aliases `ActiveDomainProfileActivationInput`
  - Pure function, no state, no persistence, no side effects
  - 5/5 tests passed in `runtimeProfileCoordinator.test.ts`
- Batch 7 Slice 3 added/accepted:
  - Architecture guard proves `runtimeProfileCoordinator.ts` exports `composeRuntimeDomainProfile`, `RuntimeProfileCoordinatorInput`, and `resolveActiveDomainProfileFromActivationInput`
  - Architecture guard proves `runtimeProfileCoordinator.ts` contains no forbidden state/persistence/runtime strings
  - Guard count: 40 -> 42
- Batch 8 Slice 1 added/accepted:
  - Created `12_CORRECTION_EVIDENCE_PERSISTENCE_DECISION.md` with locked decision: evidence-first persistence, patch suggestions later, no automatic ontology/profile mutation, direct user-authored ontology changes allowed, model/checker suggestions require approval, no `branchId`/`targetLayerId` until branch persistence exists, no checker runtime/UI or DB/migration/source implementation in this slice
  - Updated NEXT_LLM_CONTEXT, TOMORROW_START, WHERE_WE_STAND, implementation_handoff, README doc map
  - No source code or tests changed in this slice
- Batch 9 Slice 1 added/accepted:
  - Created `13_BRANCH_OVERLAY_PERSISTENCE_DECISION.md` with locked decision: persist branch layers separately, not composed runtime profiles. Overlays are the durable source; composition is derived. Merging upward requires approval. Sibling branches do not affect each other. Parent profiles stay clean. Rejected alternatives: store only composed profiles, let child branches mutate parents directly, make everything event-sourced immediately, make branches full profile copies. No DB, UI, storage API, automatic merge, checker runtime, patch suggestion table, correction storage, agent/subagent runtime, app-builder runtime, Racket/DSL implementation, or MCP/adapters is implemented in this slice.
  - Updated NEXT_LLM_CONTEXT, TOMORROW_START, WHERE_WE_STAND, implementation_handoff, README doc map
  - Added pointer from doc 06 to doc 13 for the locked persistence-source decision
  - No source code or tests changed in this slice
- Batch 10 Slice 1 added/accepted:
  - Added `ProfileBranchKind` and `ProfileBranch<TItemTypeNodeId>` as the domain-only branch model in `types.ts`
  - Added `profileBranches.ts` with pure branch helpers: `profileBranchToOverlay`, `groupProfileBranchesByKind`, `createActiveDomainProfileSourceFromBranches`, `composeRuntimeDomainProfileFromBranches`
  - Added `profileBranches.test.ts` with 14 tests covering empty-branch base reference, project branch ontology additions, personal/learning/project precedence, same-kind later-wins behavior, sibling independence/no mutation, frozen inputs, grouping order, runtime composition equivalence, and forbidden-name/source-boundary checks
  - Exported branch types/helpers from `src/features/ontology/index.ts`
  - No DB, migration, storage API, UI selector, automatic merge, correction branch fields, MCP/adapters, agent runtime, app-builder runtime, or DSL runtime added
- Batch 11 Slice 0 added/accepted:
  - Created `14_PROFILE_SELECTION_AND_BRANCH_RESOLUTION_DECISION.md` with locked decision: branch persistence, active selection, branch resolution, and runtime composition are separate boundaries
  - Locked id-based, per-context `ProfileSelection` with one base profile in v1 and ordered project/learning/personal branch id arrays
  - Locked resolver boundary: selection ids are resolved into branch values before composition
  - Rejected global active selection, composed runtime profile as canonical truth, embedded branch objects in selection, coordinator-owned store reads, and multi-base composition in v1
  - No source code or tests changed in this doc slice
- Batch 11 Slice 1 added/accepted:
  - Added `ProfileSelection` to ontology types
  - Added `profileSelection.ts` with pure selection helpers: `resolveProfileSelection` and `composeRuntimeDomainProfileFromSelection`
  - Added `profileSelection.test.ts` with 19 tests covering empty selection reference behavior, selected project branch ontology additions, selection-order same-kind precedence, personal/learning/project precedence, missing branch id errors, base id mismatch, wrong-kind errors, frozen input immutability, composition equivalence with branch helpers, and source-boundary forbidden-name checks
  - Exported selection types/helpers from `src/features/ontology/index.ts`
  - No DB, migration, storage API, profile registry, UI selector, global active selection, MCP/adapters, agent runtime, app-builder runtime, DSL runtime, multi-base composition, merge, or promotion logic added
- Batch 12 Slice 1 added/accepted:
  - Locked duplicate profile id behavior in doc 15: duplicate ids throw structured duplicate-id errors across all sources; future UI/import flows may catch the error and ask create new version / rename / replace / merge later / cancel
  - Added `DomainProfileSummary`, `ProfileSource<TItemTypeNodeId>`, and `ProfileRegistry<TItemTypeNodeId>` to ontology types
  - Added `profileRegistry.ts` with `DuplicateProfileIdError`, `ProfileNotFoundError`, `toDomainProfileSummary`, `createStaticProfileSource`, and `createProfileRegistry`
  - Added `profileRegistry.test.ts` with 26 tests covering summary shape, static source lookup/listing, duplicate ids within one source, registry lookup/listing, duplicate ids across sources, unknown id errors, frozen input handling, caller array mutation after creation, and source-boundary forbidden-name checks
  - Exported registry types/helpers from `src/features/ontology/index.ts`
  - No DB, migration, storage API, profile persistence, file source, adapter source, profile editor UI, global active registry, MCP/adapters, agent runtime, app-builder runtime, DSL runtime, branch persistence, branch composition changes, active selection changes, service changes, multi-base composition, merge, promotion, automatic versioning, rename, or replace flow added
- Kimi Code CLI Slice 1 added/accepted:
  - Added `ProfileBranchStore<TItemTypeNodeId>` to ontology types
  - Added `profileBranchStore.ts` with `createStaticProfileBranchStore({ branches })`
  - Added `profileBranchStore.test.ts` with 12 tests covering single lookup, missing lookup, requested-id order, missing-id skipping, duplicate requested ids, parent filtering, empty parent lists, constructor-order listing, caller array mutation after construction, frozen input arrays, and source-boundary forbidden-name checks
  - Exported `ProfileBranchStore` and `createStaticProfileBranchStore` from `src/features/ontology/index.ts`
  - No DB, migration, backup, storage adapter, UI selector, global active selection, automatic merge, MCP/adapters, agent runtime, app-builder runtime, DSL runtime, or profile persistence added

## Verification Already Run

Latest verified commands after Kimi Code CLI Slice 1:

```powershell
node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit
npm test -- --run src/features/ontology/__tests__/profileBranchStore.test.ts src/features/ontology/__tests__/profileBranches.test.ts src/features/ontology/__tests__/profileSelection.test.ts
npm test -- --run
rg -n "AsyncStorage|sqlite|drizzle|schema|db|migration|zustand|createStore|setActiveBranch|useActiveBranch|profile_branches|profile_overlays|automaticMerge|autoMerge|applyMerge|MCP|agent|app-builder|Racket|DSL" src/features/ontology/profileBranchStore.ts src/features/ontology/__tests__/profileBranchStore.test.ts
rg -n "[^\x00-\x7F]" src/features/ontology/profileBranchStore.ts src/features/ontology/__tests__/profileBranchStore.test.ts
git diff --check -- src/features/ontology/types.ts src/features/ontology/index.ts src/features/ontology/profileBranchStore.ts src/features/ontology/__tests__/profileBranchStore.test.ts
```

Latest result:

```text
TypeScript clean
targeted branch-store/branch/selection tests: 53/53 passed across 3 test files
full suite: 540/540 passed across 58 test files
rg forbidden DB/UI/storage/runtime/agent/MCP/Racket/DSL names: no matches in profileBranchStore source/test
rg non-ASCII: no matches in profileBranchStore source/test
git diff --check clean for the Kimi-touched files, with CRLF warnings only
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

The label-profile cleanup is complete. Correction evidence domain groundwork is in place. The explicit active-profile overlay seam is in place. The A2 decision is locked and implemented: `prepareSaveCandidates` now accepts an optional composed `DomainProfile` via `options.profile` and uses it for extraction when supplied, defaulting to `getActiveDomainProfile()`. A1 (passing `ActiveDomainProfileActivationInput` into `prepareSaveCandidates`) was explicitly rejected; composition belongs elsewhere.

The runtime profile coordinator decision is now locked (doc 11). The brain mixer is an explicit separate layer above runtime services. Services receive composed `DomainProfile`, do not know branch groups, do not call activation input resolvers, and do not read hidden global active-profile state. Service-owned mixing, UI-screen-owned mixing, hidden global `getRuntimeProfile()` / active-profile store, and persistence-owned composed profile were all explicitly rejected.

The coordinator helper module is now implemented and tested. The correction evidence persistence decision is now locked (doc 12). The branch/overlay persistence decision is now locked (doc 13). The profile selection and branch resolution decision is now locked (doc 14). The source-based ProfileRegistry v1 decision is locked and implemented for static/in-memory sources only (doc 15). The domain-only `ProfileBranch`, `ProfileSelection`, `ProfileRegistry`, and static/in-memory `ProfileBranchStore` helper seams are implemented and tested. The remaining open decisions are:

```text
1. Branch/overlay DB persistence - schema, migration, and persistent adapter/store for ProfileBranch.
2. Profile persistence / user-created base profile storage, later.
3. Merge proposal storage and review UI - how merge proposals are stored, presented, and approved/rejected/postponed.
4. Correction storage implementation - DB/migration/store for profileId-only OntologyCorrectionEvidence; branchId/targetLayerId come later with branch persistence.
5. Checker runtime and approval UI - patch suggestion generation and review.
6. Agent/subagent execution ontology brief.
7. Self-building-app framework brief.
```

Good next bounded slice should stay behind a human decision gate. Likely candidates:

```text
1. Branch/overlay DB persistence decision brief, not implementation yet.
2. Correction storage implementation decision brief, still no branchId/targetLayerId until persistence is ready.
3. Built-in demo profile decision (e.g. photography) if the user wants to test non-coding profile shape before persistence.
```

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
- whether first correction UI belongs in capture save, promotion review, concept detail, or another surface
- whether internal `subjectKind: 'capture' | 'item'` is the right vocabulary, or whether current app UI should keep saying concept
- whether a UI affordance for corrections should come before or after evidence persistence
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
4. Store corrections as evidence, not as automatic ontology or profile mutations. (Decision locked in doc 12.)
5. Add a checker/suggestion model that proposes profile patches with evidence IDs.
6. Add an approval UI so the user can accept, edit, reject, or postpone patch suggestions.
7. Implement branch persistence later so correction evidence can be extended with `branchId` and `targetLayerId`. (Persistence model locked in doc 13: overlays are the durable source, composition is derived.)

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
