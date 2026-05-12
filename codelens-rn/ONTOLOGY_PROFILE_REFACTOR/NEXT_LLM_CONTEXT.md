# Next LLM Context

Use this file as the first read for the next worker/reviewer on `refactor/ontology-profile`.

## Current Branch

```text
repo: C:\Projects\CodeLensApp\CodeLens-v2\codelens-rn
branch: refactor/ontology-profile
```

The latest source slice is the A2 decision implemented: `prepareSaveCandidates` now accepts an optional `profile?: DomainProfile` through its options parameter. The service receives the finished/composed brain, not branch ingredients. Default behavior stays `getActiveDomainProfile()` with the coding profile. When a caller supplies a composed profile, it flows through to `buildExtractorSystemPrompt`. A1 (passing `ActiveDomainProfileActivationInput` into `prepareSaveCandidates`) was explicitly rejected; composition still belongs elsewhere.

The runtime profile coordinator decision is now locked (doc 11). The brain mixer is an explicit separate layer above runtime services. Services receive a composed `DomainProfile` and do not know branch groups, do not call activation input resolvers, and do not read hidden global active-profile state. Alternatives rejected: service-owned mixing, UI-screen-owned mixing, hidden global `getRuntimeProfile()` / active-profile store, and persistence-owned composed profile as the current shape. The coordinator can later grow into the Kortex Runtime, but not in this slice.

The correction evidence persistence decision is now locked, updated, and implemented (doc 12). Evidence-first persistence: correction evidence is stored as a fact, not a mutation. Patch suggestions require user approval before any ontology or profile change, and proposal storage is separate in doc 19. No automatic ontology/profile mutation. Direct user-authored ontology changes are allowed. Model/checker suggestions require approval. Because branch/profile-selection persistence now exists, correction evidence stores an active selection context snapshot (baseProfileId plus active project/learning/personal branch id arrays) showing where the mistake happened. It does not store target/apply branch fields and does not mutate any branch, parent profile, or composed runtime profile. Implemented scope: migration/schema/ontology data-boundary repo/codec/backup support/guards only. No checker runtime/UI, auto-apply, agent/app-builder runtime, or DSL runtime is implemented.

The branch/overlay persistence decision is now locked and v1 DB plumbing is implemented (doc 13). Persist branch layers separately, not composed runtime profiles. V1 persists `profile_branches` rows with inline `overlay_json`: branch identity/parent/kind/name/timestamps are the durable container, and the overlay JSON is the actual diff/change set. Runtime profiles are derived. Active selection, base profile definitions, and correction evidence storage are separate implemented boundaries. Merge proposals stay separate. Implemented scope is migration/schema/ontology data-boundary repo/codec/backup support/guards only. No UI activation selector, automatic merge, checker runtime, patch suggestion table, merge proposal table, agent/subagent runtime, app-builder runtime, Racket/DSL implementation, or MCP/adapters is implemented.

The profile selection and branch resolution decision is now locked (doc 14). Branch persistence, active selection, branch resolution, and runtime composition are separate boundaries. `ProfileSelection` is per-context and id-based: it selects one base profile id plus ordered project/learning/personal branch ids. A resolver later turns ids into branch values; the Runtime Profile Coordinator composes resolved values into a runtime `DomainProfile`. There is no global active selection singleton, no composed runtime profile as canonical truth, no DB/UI/MCP/agent/app-builder/DSL runtime in this slice, and no multi-base composition in v1.

Project-scoped profile selection persistence v1 is now implemented. Migration 013 adds `profile_selections`: one selection row per project, `project_id` cascades with `projects`, `base_profile_id` stores the selected base profile, and project/learning/personal branch id arrays are stored as JSON columns. The ontology data boundary exposes a repo and codec for insert/upsert/get/delete. Backup/export/import/clear support and stage10 guards are updated. This is storage plumbing only: no UI selector, no global active selection singleton, no DB-owned runtime composition, and no profile/base persistence.

The domain-only ProfileBranch model is now implemented and tested. `ProfileBranchKind` and `ProfileBranch<TItemTypeNodeId>` live in `types.ts`. `profileBranches.ts` provides pure helpers: `profileBranchToOverlay`, `groupProfileBranchesByKind`, `createActiveDomainProfileSourceFromBranches`, and `composeRuntimeDomainProfileFromBranches`. These helpers convert branch layers into existing grouped overlay/runtime coordinator inputs without duplicating composition logic. This is TypeScript domain groundwork only; no DB, migration, storage API, UI selector, automatic merge, correction branch fields, MCP/adapters, agent runtime, app-builder runtime, or DSL runtime was added.

The domain-only ProfileSelection helper slice is now implemented and tested. `ProfileSelection` lives in `types.ts`. `profileSelection.ts` provides pure helpers: `resolveProfileSelection` and `composeRuntimeDomainProfileFromSelection`. The resolver requires base id match, resolves selected branch ids from caller-provided branch values, throws on missing ids and wrong-kind ids, preserves selection order within each kind, normalizes kind order project -> learning -> personal, and delegates runtime composition through `composeRuntimeDomainProfileFromBranches`. No DB, migration, storage API, profile registry, UI selector, global active selection, MCP/adapters, agent runtime, app-builder runtime, DSL runtime, multi-base composition, merge, or promotion logic was added.

The ProfileRegistry/ProfileSource direction is documented and the v1 static source helper is implemented (doc 15). Base profiles resolve through a source-based `ProfileRegistry`, separate from `ProfileBranchStore`. The interface leaves room for future built-in/file/DB/adapter sources. V1 implements only static/in-memory profile source helpers: `DomainProfileSummary`, `ProfileSource`, `ProfileRegistry`, `DuplicateProfileIdError`, `ProfileNotFoundError`, `toDomainProfileSummary`, `createStaticProfileSource`, and `createProfileRegistry`. Duplicate profile ids throw structured errors across all sources. No DB, migration, storage API, profile persistence, file source, adapter source, profile editor UI, global active registry, MCP, agent runtime, app-builder runtime, DSL runtime, branch persistence, active selection changes, service changes, multi-base composition, or automatic versioning was added.

The ProfileBranchStore v1 seam is now implemented by Kimi Code CLI and accepted after Codex review. `ProfileBranchStore<TItemTypeNodeId>` lives in `types.ts`, and `profileBranchStore.ts` exposes `createStaticProfileBranchStore({ branches })`. This is static/in-memory only: it snapshots the branch array at construction, returns branch objects by reference, preserves requested id order, skips missing ids, preserves duplicate requested ids, and lists branches by `parentProfileId` in constructor order. No DB, migration, backup, UI, global active selection, automatic merge, MCP/adapters, agent runtime, app-builder runtime, or DSL runtime was added. The CLI run ended with a Windows console Unicode/charmap final-report crash, but Codex verification passed.

The runtime activation wiring decision is locked (doc 16) and now implemented. `runtimeProfileActivation.ts` exposes `resolveRuntimeProfileForProject(input)`, `ProjectRuntimeProfileActivationInput`, `ProjectRuntimeProfileActivationResult`, `ProjectProfileSelectionStore`, `RuntimeProfileActivationError`, and `RuntimeProfileActivationErrorCode`. The resolver reads a project selection via caller-supplied store, resolves the base profile through the registry, resolves selected branch ids through the branch store, detects missing and wrong-kind branch ids with structured errors, composes through `composeRuntimeDomainProfileFromSelection`, and returns the finished profile plus trace data. Missing selection falls back to `coding` base. No global active profile, DB-owned composed profile, UI selector, MCP, agent runtime, app-builder runtime, or DSL runtime was added.

The base profile persistence / user-created cores decision is locked and v1 storage is implemented (doc 17). User-created base cores/profiles are their own persistence concept. They are not stored as `profile_branches`, and composed runtime profiles are still not persisted as source of truth. `profile_definitions` now stores full base `DomainProfile` payloads behind the ontology data boundary. `createProfileDefinitionSource({ id, definitions })` plugs loaded definitions into the synchronous `ProfileRegistry` without changing the registry to async. `profileRegistryBootstrap.ts` provides `loadPersistedProfileDefinitionSource()` and `loadDefaultProfileRegistry()` to load persisted definitions once and expose them as synchronous `ProfileSource` / `ProfileRegistry` values alongside built-in profiles. New domains such as `photography`, `work-notes`, or `lisp` are independent base profiles by default; branches such as `night-photography` or `react` specialize one selected base. LLM-assisted creation may suggest tags, subtags, families, fields, relationships, examples, and "is not" boundaries later, but durable profile changes require user approval.

The adaptive suggestion policy decision is locked (doc 18). Correction evidence stays factual. Patch suggestions stay separate. Default behavior is conservative suggest-first, not silent mutation. Manual tag/subtag/relationship creation is allowed but should be structured: validate, preview impact, choose target layer, apply with audit/undo, and review any backfill. The personal layer is the same branch machinery with `branchKind: 'personal'`. Relationship labels and edges follow the same trust/risk policy as tags/subtags. Adaptive behavior combines semantic confidence, user-fit confidence, risk score, and trust mode; risk overrides trust. Base/core mutations, upward merges, old-data rewrites, agent/app-builder policy, and external write-back always require explicit approval.

The patch/merge proposal storage decision is locked and v1 storage is implemented (doc 19). Patch suggestions, relationship suggestions, branch merge proposals, and manual drafts use one unified proposal table: `profile_change_proposals`. Product language can still say "patch suggestion" or "merge proposal", but persistence/review share one lifecycle and one review shape. Proposals store source/evidence, target layer, `ProfilePatch`, risk/confidence, and review status. Proposals do not apply themselves. Apply/merge remains an explicit later operation. Implemented scope is storage-only: types/codec/migration/schema/repo/backup/guards/tests, with no review UI, checker runtime, apply service, trust storage, auto-apply, or base-profile versioning.

The Conceptualize preview/correction-surface decision is locked (doc 20). The first correction surface belongs in the Conceptualize preview before final save. The old "save as learning" action should grow toward Conceptualize: raw input -> draft learning card -> classification -> correction -> mistake-understanding evidence -> safe branch-local ontology improvement or later proposal. Every correction must preserve what Kortex proposed, what the user corrected it to, where the mistake happened, and optional boundary/reason context. Conceptualize starts as a safe correction doorway, not the full Kortex ontology editor.

The checker/proposal/context/apply decision is locked (doc 21). Conceptualize, checker runs, graph selection chat, repeated-mistake review, old-card backfill, and future agent/app-builder flows use one architecture: explanations are read-only, evidence records what happened, proposals are reviewable recommendations, and durable changes happen only through typed Kortex operations after revalidation. Context assembly must be branch/profile-scoped, relevance-ranked, provenance-aware, and able to preserve contradictions. Proposal apply is atomic by default; large backfills become chunked bulk jobs. Historical undo is an impact-reviewed reversal proposal, not silent time travel.

The coordinator helper is now implemented and tested: `runtimeProfileCoordinator.ts` is the explicit above-services coordinator boundary. `composeRuntimeDomainProfile(input)` delegates to `resolveActiveDomainProfileFromActivationInput(input)`. `RuntimeProfileCoordinatorInput` aliases `ActiveDomainProfileActivationInput`. Services still receive composed `DomainProfile`; they do not call this helper directly unless their caller passes the result. No DB, UI, persistence, global store, service hidden lookup, agent runtime, app-builder runtime, or DSL runtime was added.

The latest profile/core source slices add pure profile composition helpers, the first explicit active-profile overlay seam, and an explicit active-profile source resolver. `composeDomainProfile(base, overlays)` composes branch/project/learning/personal overlays without mutating inputs. `ActiveDomainProfileSource` packages a caller-owned `baseProfile` plus optional overlays, and `resolveActiveDomainProfile(source)` returns the base profile by reference when overlays are omitted/null/empty or composes explicit overlays when supplied. `getActiveDomainProfile(overlays?)` still returns `codingProfile` by reference with no overlays or an empty list, and now delegates through the resolver for explicit overlays. The latest guard batch added deeper immutability tests, active-profile no-cache/no-hidden-state tests, future runtime source guards, future architecture anti-regression rules, and durable doc-anchor guards.

The latest product framing is stronger than "make CodeLens profile-driven": Kortex Core is the reusable ontology/graph/versioned reasoning system, and CodeLens/coding is the first serious child core/wrapper around it. Read `07_KORTEX_CORE_AND_CHILD_CORES.md` before implementing more branch, relationship, graph, or correction semantics.

Independent base cores versus branches is now clarified in docs 07 and 15. A new base core such as `photography`, `work-notes`, or `lisp` uses the shared Kortex schema/engine but does not automatically inherit coding ontology content. Coding, photography, lisp, and work-notes can be sibling base profiles. A branch is different: it specializes one selected parent/base profile, such as `coding -> react` or `photography -> night-photography`. Future LLM-assisted creation should support both flows: broad domain questions for a new base core, and "what differs from the parent?" questions for a branch. Users can accept suggestions, edit manually, or mix both. Do not remove explicit fork, cross-domain relationship, or upward-merge ideas; make those deliberate choices rather than accidental inheritance from coding.

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
8. `ONTOLOGY_PROFILE_REFACTOR/13_BRANCH_OVERLAY_PERSISTENCE_DECISION.md` - locked decision: persist branch rows with inline `overlay_json`; overlays are the durable diff, runtime profiles are derived, active selection and merge proposals stay separate.
9. `ONTOLOGY_PROFILE_REFACTOR/14_PROFILE_SELECTION_AND_BRANCH_RESOLUTION_DECISION.md` - locked decision: branch persistence, active selection, branch resolution, and runtime composition are separate boundaries. Selection is per-context, id-based, single-base in v1, and resolved before composition.
10. `ONTOLOGY_PROFILE_REFACTOR/15_PROFILE_REGISTRY_AND_PROFILE_SOURCES_DECISION.md` - decision + implementation: source-based ProfileRegistry, static/in-memory source v1, future built-in/file/DB/adapter sources, duplicate profile ids throw structured errors.
11. `ONTOLOGY_PROFILE_REFACTOR/16_RUNTIME_ACTIVATION_WIRING_DECISION.md` - locked decision + implementation: runtime activation wiring loads selected ingredients for one context, composes via pure helpers, and passes only finished DomainProfile to services. `resolveRuntimeProfileForProject` is now implemented and tested.
12. `ONTOLOGY_PROFILE_REFACTOR/17_BASE_PROFILE_PERSISTENCE_DECISION.md` - locked decision + implementation: user-created base profiles persist separately from branches/runtime profiles. `profile_definitions` storage plugs loaded definitions into ProfileRegistry through a synchronous source factory.
13. `ONTOLOGY_PROFILE_REFACTOR/18_ADAPTIVE_SUGGESTION_POLICY_DECISION.md` - locked decision: suggest-first default, adaptive trust/risk policy, relationship trust, manual ontology creation safety, personal layer as `branchKind: 'personal'`.
14. `ONTOLOGY_PROFILE_REFACTOR/19_PATCH_MERGE_PROPOSAL_STORAGE_DECISION.md` - locked decision + storage-only v1: unified `profile_change_proposals`, `ProfilePatch`, source/evidence, target layer, risk/confidence, review status, explicit apply later.
15. `ONTOLOGY_PROFILE_REFACTOR/20_CONCEPTUALIZE_PREVIEW_AND_CORRECTION_SURFACE_DECISION.md` - locked decision: first correction surface is Conceptualize preview before save; every correction stores mistake-understanding evidence; Conceptualize is not the full ontology editor.
16. `ONTOLOGY_PROFILE_REFACTOR/21_CHECKER_PROPOSAL_REVIEW_CONTEXT_AND_APPLY_DECISION.md` - locked decision: checker output kinds, proposal lifecycle/freshness, context assembly, typed apply operations, atomic/chunked apply, events, and historical reversal.
17. `ONTOLOGY_PROFILE_REFACTOR/05_ANTI_REGRESSION_RULES.md` - hard constraints and compatibility boundaries.
18. `ONTOLOGY_PROFILE_REFACTOR/03_CATEGORIZATION_AND_ONTOLOGY_CHECKER.md` - next product direction: correction flow and ontology checker.
19. `ONTOLOGY_PROFILE_REFACTOR/04_REFACTOR_WITHOUT_BREAKING_APP.md` - staged implementation plan and persistence/correction ideas.
20. `ONTOLOGY_PROFILE_REFACTOR/02_DYNAMIC_PROFILE_SCHEMA.md` - proposed future profile/correction/suggestion shapes.
21. `ONTOLOGY_PROFILE_REFACTOR/06_PROFILE_BRANCHING_AND_MERGE.md` - profile inheritance, branching, overlays, and merge semantics.
22. `ONTOLOGY_PROFILE_REFACTOR/README.md` - map of this refactor folder.
23. `ONTOLOGY_PROFILE_REFACTOR/TOMORROW_START.md` - startup prompt and next-slice reminder.
24. Root docs if persistence or architecture is touched: `ARCHITECTURE.md`, `PERSISTENCE.md`.

## Current Changed Files

Expected tracked changes in the current correction/proposal persistence slice state:

```text
ONTOLOGY_PROFILE_REFACTOR/12_CORRECTION_EVIDENCE_PERSISTENCE_DECISION.md
ONTOLOGY_PROFILE_REFACTOR/13_BRANCH_OVERLAY_PERSISTENCE_DECISION.md
ONTOLOGY_PROFILE_REFACTOR/14_PROFILE_SELECTION_AND_BRANCH_RESOLUTION_DECISION.md
ONTOLOGY_PROFILE_REFACTOR/17_BASE_PROFILE_PERSISTENCE_DECISION.md
ONTOLOGY_PROFILE_REFACTOR/18_ADAPTIVE_SUGGESTION_POLICY_DECISION.md
ONTOLOGY_PROFILE_REFACTOR/19_PATCH_MERGE_PROPOSAL_STORAGE_DECISION.md
ONTOLOGY_PROFILE_REFACTOR/20_CONCEPTUALIZE_PREVIEW_AND_CORRECTION_SURFACE_DECISION.md
ONTOLOGY_PROFILE_REFACTOR/21_CHECKER_PROPOSAL_REVIEW_CONTEXT_AND_APPLY_DECISION.md
ONTOLOGY_PROFILE_REFACTOR/KORTEX_DEVELOPER_EXPLAINER.md
ONTOLOGY_PROFILE_REFACTOR/NEXT_LLM_CONTEXT.md
ONTOLOGY_PROFILE_REFACTOR/README.md
ONTOLOGY_PROFILE_REFACTOR/TOMORROW_START.md
ONTOLOGY_PROFILE_REFACTOR/WHERE_WE_STAND.md
ONTOLOGY_PROFILE_REFACTOR/implementation_handoff.md
ARCHITECTURE.md
src/__tests__/stage10-architecture-guards.test.ts
src/db/migrations/015-ontology-correction-evidence.ts
src/db/migrations/016-profile-change-proposals.ts
src/db/migrations/__tests__/ontology-correction-evidence-migration.test.ts
src/db/migrations/__tests__/profile-change-proposals-migration.test.ts
src/db/migrations/index.ts
src/db/schema.ts
src/features/backup/__tests__/profile-columns.test.ts
src/features/backup/clear.ts
src/features/backup/columnMaps.ts
src/features/backup/export.ts
src/features/backup/format.ts
src/features/backup/import.ts
src/features/ontology/__tests__/corrections.test.ts
src/features/ontology/__tests__/ontologyCorrectionEvidenceCodec.test.ts
src/features/ontology/__tests__/profileChangeProposalCodec.test.ts
src/features/ontology/codecs/profileChangeProposal.ts
src/features/ontology/codecs/ontologyCorrectionEvidence.ts
src/features/ontology/corrections.ts
src/features/ontology/data/index.ts
src/features/ontology/data/ontologyCorrectionEvidenceRepo.ts
src/features/ontology/data/profileChangeProposalRepo.ts
src/features/ontology/data/schema.ts
src/features/ontology/index.ts
src/features/ontology/types.ts
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
  - `OntologyCorrectionActiveSelectionSnapshot`
  - `OntologyCorrectionSubjectKind`
  - `OntologyCorrectionField`
  - `OntologyCorrectionSource`
  - `validateOntologyCorrection()`
  - migration/schema/repo/codec/backup support for `ontology_correction_evidence`
- Correction validation is domain-only. It checks profile id, non-empty ids, valid previous/corrected ontology item type ids, no-op corrections, and input/profile immutability.
- Architecture guards now keep correction evidence narrow for this stage:
  - correction field is only `typeNodeId`
  - correction source is only `user`
  - no forbidden ontology imports from DB, backup, learning, or graph
  - no legacy `ontology_corrections` or `ontology_patch_suggestions` source implementation
  - no automatic profile mutation helper in `corrections.ts`
- Proposal storage v1 exists:
  - `ProfilePatch`
  - `ProfileChangeProposal`
  - migration/schema/repo/codec/backup support for `profile_change_proposals`
  - proposals store source/evidence, target layer, patch JSON, risk/confidence, and review status
  - proposals do not apply themselves
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
  - Created `12_CORRECTION_EVIDENCE_PERSISTENCE_DECISION.md` with locked decision: evidence-first persistence, patch suggestions later, no automatic ontology/profile mutation, direct user-authored ontology changes allowed, model/checker suggestions require approval, no checker runtime/UI or DB/migration/source implementation in this slice
  - 2026-05-11 update: v1 correction evidence stores active selection context where the mistake happened, but no `branchId`, `targetLayerId`, or apply target
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
- Kimi Code CLI Slice 2 added/accepted (profile definitions persistence v1):
  - Added migration 014 for `profile_definitions` table with columns, source_kind CHECK constraint, and indexes
  - Added `ProfileDefinition` and `ProfileDefinitionSourceKind` to ontology types
  - Added `profileDefinition.ts` codec with strict DomainProfile zod schemas and definition/profile field match validation
  - Added `profileDefinitionRepo.ts` with insert/upsert/getById/getByIds/list/delete
  - Added `createProfileDefinitionSource` to `profileRegistry.ts` for synchronous `ProfileSource` from loaded definitions
  - Added backup/export/import/clear/columnMaps support for `profile_definitions`
  - Bumped FORMAT_VERSION 3 -> 4 and SCHEMA_VERSION 13 -> 14
  - Added focused tests: migration (4), codec (17), registry source (10), backup columns (4)
  - Updated stage10 architecture guards for `profile_definitions` boundary
  - No UI, services, MCP/adapters, agent runtime, app-builder runtime, DSL runtime, merge proposal code, correction storage, or runtime activation changes
- Kimi Code CLI Slice 3 added/accepted (profile registry bootstrap v1):
  - Added `profileRegistryBootstrap.ts` with `loadPersistedProfileDefinitionSource()` and `loadDefaultProfileRegistry()`
  - `loadPersistedProfileDefinitionSource()` loads definitions through the ontology data boundary and returns a synchronous `ProfileSource`
  - `loadDefaultProfileRegistry()` combines built-in coding profile source with persisted definition source into a synchronous `ProfileRegistry`
  - Built-in source precedes persisted source in `listProfiles()` order
  - Duplicate ids across built-in and persisted sources throw `DuplicateProfileIdError`
  - Accepts dependency injection for tests (`listDefinitions`, `sourceId`, `additionalSources`)
  - Exported from `src/features/ontology/data/index.ts`, not the root ontology barrel
  - Added `profileRegistryBootstrap.test.ts` with focused tests for source creation, registry composition, order, duplicate id errors, and immutability
  - Added stage10 boundary guard proving root ontology barrel does not export DB-backed bootstrap helpers
  - No global active registry, no singleton mutable state, no UI, no services, no MCP/adapters, no agent runtime, no app-builder runtime, no DSL runtime
- Codex direct slice added/accepted (correction evidence persistence v1):
  - Added migration 015 for `ontology_correction_evidence`
  - Added Drizzle `ontologyCorrectionEvidence` schema
  - Added `OntologyCorrectionActiveSelectionSnapshot` and required `activeSelectionSnapshot` on `OntologyCorrectionEvidence`
  - Added strict codec and ontology data-boundary repo for correction evidence
  - Added backup/export/import/clear/columnMaps support for `ontology_correction_evidence`
  - Bumped FORMAT_VERSION 4 -> 5 and SCHEMA_VERSION 14 -> 15
  - Updated `validateOntologyCorrection()` to validate active selection context without mutating evidence/profile inputs
  - Added migration, codec, correction validation, backup column-map, and stage10 guard tests
  - No correction UI, checker runtime, patch suggestion table, branch/base target fields, auto-apply, MCP/adapters, agent runtime, app-builder runtime, or DSL runtime
- Codex docs-only decision added/accepted (adaptive suggestion policy):
  - Added `18_ADAPTIVE_SUGGESTION_POLICY_DECISION.md`
  - Locked conservative suggest-first as the default for evidence-derived changes
  - Locked the distinction between correction evidence, patch suggestions, manual ontology edits, and merge/apply
  - Locked personal layer as `branchKind: 'personal'`
  - Locked relationship trust under the same policy as tag/subtag changes
  - Locked adaptive policy inputs: semantic confidence, user-fit confidence, risk score, and trust mode
  - Locked that risk overrides trust; base/core changes, upward merges, old-data rewrites, agent/app-builder policy, and external write-back always require approval
  - No source code, tests, DB, UI, checker runtime, patch suggestion table, auto-apply engine, or trust storage added
- Codex docs-only decision added/accepted (patch/merge proposal storage and review):
  - Added `19_PATCH_MERGE_PROPOSAL_STORAGE_DECISION.md`
  - Locked one unified `profile_change_proposals` concept for patch suggestions, relationship suggestions, branch merge proposals, and manual drafts
  - Locked `ProfilePatch` as overlay-like diff language without branch identity
  - Locked explicit target layer: base profile or profile branch
  - Locked source/evidence fields, risk/confidence fields, and review status lifecycle
  - Rejected separate `ontology_patch_suggestions` and `profile_merge_proposals` tables for v1
  - Locked that proposals do not apply themselves; apply/merge is an explicit later operation

- Codex direct slice added/accepted (profile change proposals storage v1):
  - Added migration 016 for `profile_change_proposals`
  - Added `ProfilePatch` and `ProfileChangeProposal` domain types
  - Added strict proposal codec and ontology data-boundary repo
  - Added backup/export/import/clear/columnMaps support for `profile_change_proposals`
  - Bumped FORMAT_VERSION 5 -> 6 and SCHEMA_VERSION 15 -> 16
  - Added migration, codec, backup column-map, and stage10 guard tests
  - No review UI, checker runtime, apply service, trust storage, auto-apply, base-profile versioning, MCP/adapters, agent runtime, app-builder runtime, or DSL runtime

- Codex docs-only decision added/accepted (Conceptualize preview and correction surface):
  - Added `20_CONCEPTUALIZE_PREVIEW_AND_CORRECTION_SURFACE_DECISION.md`
  - Locked Conceptualize preview as the first correction surface before final save
  - Locked that every correction stores mistake-understanding evidence, not only the final corrected label
  - Locked Conceptualize as a safe correction doorway, not the full Kortex ontology editor
  - Locked branch-local default for approved new tag/subtag creation from Conceptualize
  - No source code, tests, UI, checker runtime, apply service, trust storage, auto-apply, old-item backfill, or base-profile mutation added

- Codex docs-only decision added/accepted (checker/proposal/context/apply architecture):
  - Added `21_CHECKER_PROPOSAL_REVIEW_CONTEXT_AND_APPLY_DECISION.md`
  - Locked checker output kinds: explanation, evidence, proposal
  - Locked shared proposal lifecycle/freshness semantics across Conceptualize, checker, graph selection chat, repeated-mistake review, and backfill
  - Locked context assembly as branch/profile-scoped, layered, relevance-ranked, provenance-aware context packs with contradiction preservation and drill-down paths
  - Locked accepted proposals as revalidated typed Kortex operations, not raw patch writes
  - Locked normal proposal apply as atomic and large backfills as chunked bulk jobs
  - Locked historical undo as impact-reviewed reversal proposals, not silent time travel
  - No source code, tests, UI, checker runtime, context builder, event store, apply service, undo service, trust storage, graph chat, agent runtime, app-builder runtime, or DSL runtime added

## Verification Already Run

Latest verified commands after profile change proposals storage v1:

```powershell
node node_modules\typescript\bin\tsc -p tsconfig.json --noEmit
npm.cmd test -- --run src/db/migrations/__tests__/profile-change-proposals-migration.test.ts src/features/ontology/__tests__/profileChangeProposalCodec.test.ts src/features/backup/__tests__/profile-columns.test.ts src/__tests__/stage10-architecture-guards.test.ts
npm.cmd test -- --run src/db/migrations/__tests__/ontology-correction-evidence-migration.test.ts src/features/ontology/__tests__/ontologyCorrectionEvidenceCodec.test.ts src/features/ontology/__tests__/corrections.test.ts src/features/backup/__tests__/profile-columns.test.ts src/__tests__/stage10-architecture-guards.test.ts
npm.cmd test -- --run
npm.cmd test -- --run src/__tests__/stage10-architecture-guards.test.ts
```

Latest result:

```text
TypeScript clean
proposal targeted tests: 121/121 passed across 4 test files
targeted tests: 133/133 passed across 5 test files
full suite: 691/691 passed across 70 test files
stage10 doc/source guards after proposal storage: 53/53 passed
git diff --check clean with CRLF warnings only
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

The label-profile cleanup is complete. Correction evidence domain groundwork and v1 persistence are in place. The explicit active-profile overlay seam is in place. The A2 decision is locked and implemented: `prepareSaveCandidates` now accepts an optional composed `DomainProfile` via `options.profile` and uses it for extraction when supplied, defaulting to `getActiveDomainProfile()`. A1 (passing `ActiveDomainProfileActivationInput` into `prepareSaveCandidates`) was explicitly rejected; composition belongs elsewhere.

The runtime profile coordinator decision is now locked (doc 11). The brain mixer is an explicit separate layer above runtime services. Services receive composed `DomainProfile`, do not know branch groups, do not call activation input resolvers, and do not read hidden global active-profile state. Service-owned mixing, UI-screen-owned mixing, hidden global `getRuntimeProfile()` / active-profile store, and persistence-owned composed profile were all explicitly rejected.

The coordinator helper module is now implemented and tested. The correction evidence persistence decision is locked and v1 storage is implemented (doc 12). The branch/overlay persistence decision is now locked (doc 13) and branch DB persistence is implemented. The profile selection and branch resolution decision is now locked (doc 14) and project-scoped selection DB persistence is implemented. The source-based ProfileRegistry v1 decision is locked and implemented for static/in-memory sources only (doc 15). The runtime activation wiring decision is locked (doc 16) and `runtimeProfileActivation.ts` is implemented/tested. The base profile persistence / user-created cores decision is locked and v1 `profile_definitions` storage is implemented (doc 17). The adaptive suggestion policy is locked (doc 18): suggestions stay separate from evidence, default mode is conservative suggest-first, personal layer is `branchKind: 'personal'`, relationship changes follow trust/risk policy, and risk overrides trust. The patch/merge proposal storage decision is locked and v1 storage is implemented (doc 19): patch suggestions and merge proposals share `profile_change_proposals`, store a `ProfilePatch`, and do not apply themselves. The Conceptualize preview/correction-surface decision is locked (doc 20): first correction surface is the Conceptualize preview before final save, and every correction stores mistake-understanding evidence. The checker/proposal/context/apply decision is locked (doc 21): checker output is explanation/evidence/proposal, proposal review includes freshness/revalidation, context assembly is a first-class layer, accepted proposals compile to typed Kortex operations, normal apply is atomic, bulk backfills are chunked, and historical undo is a reversal proposal. The domain-only `ProfileBranch`, `ProfileSelection`, `ProfileRegistry`, static/in-memory `ProfileBranchStore`, persistent profile definitions, correction evidence storage, proposal storage, and interface-based runtime activation helper seams are implemented and tested. The remaining implementation decisions are:

```text
1. Conceptualize first implementation scope - existing-tag correction only, or existing-tag correction plus branch-local new tag/subtag creation.
2. Trust setting storage - where conservative/suggest-first/adaptive settings and user-fit learning live.
3. Context assembly/event/apply implementation sequencing - which typed operation and context-pack shape ships first.
4. Base profile versioning - how accepted operations safely target base profiles.
5. Agent/subagent execution ontology brief.
6. Self-building-app framework brief.
```

Good next work should stay behind a human decision gate. Likely candidates:

```text
1. Conceptualize first implementation scope decision.
2. Trust setting storage decision.
3. Context assembly/event/apply implementation sequencing.
4. First typed operation/apply slice.
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
- how the UI should write correction evidence without mutating the profile automatically
- what tests prove correction UI/evidence never mutates the profile automatically
- whether the first proposal review target should handle project overlay, learning lens, or personal correction layer first
- correction evidence stores active context, while proposal rows store the reviewed target layer
- how trust mode, semantic confidence, user-fit confidence, and risk score appear in proposal/review surfaces
- whether checker proposals should be generated manually, periodically, or from a review queue
- whether the next runtime source for overlays should be UI-driven, config-driven, or remain test-only
- how current `relationshipTypeNodeIds` compatibility maps to future `is` / `is not` and dynamic labels
- whether helper shapes should already look like serializable operations that a future DSL could target
- whether future external-backed nodes need an extension point later, without implementing source adapters now
```

Likely implementation sequence after audit:

1. Reconcile Kortex Core/child-core framing with the next internal composition helper names and tests.
2. Decide product semantics for corrections and first UI surface.
3. Add a UI affordance where users can correct a proposed ontology/type classification.
4. Store corrections through the implemented evidence repo, not as automatic ontology or profile mutations.
5. Add a checker/suggestion model that proposes profile patches with evidence IDs.
6. Add an approval UI so the user can accept, edit, reject, or postpone patch suggestions.
7. Add patch/merge review so evidence can propose branch/local/base changes without applying them automatically.

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
