# Where We Stand - 2026-05-08

Repo: `C:\Projects\CodeLensApp\CodeLens-v2\codelens-rn`
Branch: `refactor/ontology-profile`

This file captures the current state after completing the Kimi Code CLI ProfileBranchStore v1 slice.

## Last Status Response

Done.

Batch 8 Slice 1 (correction evidence persistence decision doc):

- Created `12_CORRECTION_EVIDENCE_PERSISTENCE_DECISION.md` with locked decision:
  - evidence-first persistence: correction evidence is stored as fact, not mutation
  - patch suggestions come later and require user approval
  - no automatic ontology/profile mutation
  - direct user-authored ontology changes are allowed
  - model/checker-suggested ontology changes require approval
  - no `branchId`/`targetLayerId` until branch persistence exists
  - no checker runtime/UI in this slice
  - no DB/migration/source implementation in this slice
- Updated README doc map, NEXT_LLM_CONTEXT, TOMORROW_START, WHERE_WE_STAND, implementation_handoff
- No source code or tests changed in this slice

Batch 9 Slice 1 (branch/overlay persistence decision doc):

- Created `13_BRANCH_OVERLAY_PERSISTENCE_DECISION.md` with locked decision:
  - persist branch layers separately, not composed runtime profiles
  - overlays are the durable source; composition is derived
  - merging upward requires approval
  - sibling branches do not affect each other
  - parent profiles stay clean
  - rejected alternatives: store only composed profiles, let child branches mutate parents directly, make everything event-sourced immediately, make branches full profile copies
  - consistent with doc 06 product model, doc 10/A2 runtime source, doc 11 coordinator, doc 12 correction evidence
  - no DB, UI, storage API, automatic merge, checker runtime, patch suggestion table, correction storage, agent/subagent runtime, app-builder runtime, Racket/DSL implementation, or MCP/adapters is implemented in this slice
- Added pointer from doc 06 to doc 13 for the locked persistence-source decision
- Updated README doc map, NEXT_LLM_CONTEXT, TOMORROW_START, WHERE_WE_STAND, implementation_handoff
- No source code or tests changed in this slice

Batch 10 Slice 1 (domain-only ProfileBranch model):

- Added `ProfileBranchKind` and `ProfileBranch<TItemTypeNodeId>` to `types.ts`
- Added `profileBranches.ts` with pure helpers:
  - `profileBranchToOverlay`
  - `groupProfileBranchesByKind`
  - `createActiveDomainProfileSourceFromBranches`
  - `composeRuntimeDomainProfileFromBranches`
- Added `profileBranches.test.ts` with 14 tests covering empty-branch reference behavior, project branch ontology additions, personal/learning/project precedence, same-kind later-wins behavior, sibling independence/no mutation, frozen inputs, grouping order, runtime composition equivalence, and forbidden-name/source-boundary checks
- Exported branch types/helpers from `src/features/ontology/index.ts`
- No DB, migration, storage API, UI selector, automatic merge, correction branch fields, MCP/adapters, agent runtime, app-builder runtime, or DSL runtime added

Batch 11 Slice 0 (profile selection and branch resolution decision):

- Created `14_PROFILE_SELECTION_AND_BRANCH_RESOLUTION_DECISION.md` with locked decision:
  - branch persistence, active selection, branch resolution, and runtime composition are separate boundaries
  - `ProfileSelection` is per-context and id-based
  - v1 selection has one `baseProfileId` plus ordered project/learning/personal branch id arrays
  - resolver turns selected ids into branch values before runtime composition
  - Runtime Profile Coordinator stays pure and receives resolved values
  - no global active selection, DB, UI, MCP, agent runtime, app-builder runtime, DSL runtime, or multi-base composition in this slice
- Updated README doc map, NEXT_LLM_CONTEXT, TOMORROW_START, WHERE_WE_STAND, implementation_handoff
- No source code or tests changed in this doc slice

Batch 11 Slice 1 (domain-only ProfileSelection helper):

- Added `ProfileSelection` to `types.ts`
- Added `profileSelection.ts` with pure helpers:
  - `resolveProfileSelection`
  - `composeRuntimeDomainProfileFromSelection`
- Added `profileSelection.test.ts` with 19 tests covering empty selection reference behavior, selected project branch ontology additions, selection-order same-kind precedence, personal/learning/project precedence, missing branch id errors, base id mismatch, wrong-kind errors, frozen input immutability, composition equivalence with branch helpers, and source-boundary forbidden-name checks
- Exported selection types/helpers from `src/features/ontology/index.ts`
- No DB, migration, storage API, profile registry, UI selector, global active selection, MCP/adapters, agent runtime, app-builder runtime, DSL runtime, multi-base composition, merge, or promotion logic added

Batch 12 Slice 1 (ProfileRegistry/ProfileSource v1 static helper):

- Locked duplicate profile id behavior in `15_PROFILE_REGISTRY_AND_PROFILE_SOURCES_DECISION.md`:
  - duplicate profile ids throw structured duplicate-id errors across all sources
  - registry detects conflicts, but future UI/import/profile-manager asks create new version / rename / replace / merge later / cancel
- Added `DomainProfileSummary`, `ProfileSource<TItemTypeNodeId>`, and `ProfileRegistry<TItemTypeNodeId>` to `types.ts`
- Added `profileRegistry.ts` with:
  - `DuplicateProfileIdError`
  - `ProfileNotFoundError`
  - `toDomainProfileSummary`
  - `createStaticProfileSource`
  - `createProfileRegistry`
- Added `profileRegistry.test.ts` with 26 tests covering summary shape, static source lookup/listing, duplicate ids within one source, registry lookup/listing, duplicate ids across sources, unknown id errors, frozen input handling, caller array mutation after creation, and source-boundary forbidden-name checks
- Exported registry types/helpers from `src/features/ontology/index.ts`
- Preserved the direction:
  - base profiles resolve through a source-based `ProfileRegistry`
  - `ProfileRegistry` is separate from `ProfileBranchStore`
  - future sources may include built-in, file, DB, and adapter sources
  - v1 implements only static/in-memory profile source helpers
  - no DB, migration, storage API, profile persistence, file source, adapter source, profile editor UI, global active registry, MCP/adapters, agent runtime, app-builder runtime, DSL runtime, branch persistence, branch composition changes, active selection changes, service changes, multi-base composition, merge, promotion, automatic versioning, rename, or replace flow added

Verification:

- TypeScript clean.
- `runtimeProfileCoordinator.test.ts` 5/5 passed.
- `stage10-architecture-guards.test.ts` all passed (guard count: 40 -> 42).
- Targeted selection/branch/coordinator/activation tests: 77/77 passed across 4 test files.
- Targeted registry/selection/branch tests: 67/67 passed across 3 test files.
- Full suite: 528/528 passed across 57 test files.
- No non-ASCII in `profileRegistry` source/test or doc 15.
- No forbidden state/persistence/runtime names, `as any`, `@ts-ignore`, or `@ts-expect-error` in `profileRegistry` source/test.
- `git diff --check` clean with CRLF warnings only.

Kimi Code CLI Slice 1 (ProfileBranchStore v1 static helper):

- Added `ProfileBranchStore<TItemTypeNodeId>` to `types.ts`.
- Added `profileBranchStore.ts` with `createStaticProfileBranchStore({ branches })`.
- Added `profileBranchStore.test.ts` with 12 tests covering single lookup, missing lookup, requested-id order, missing-id skipping, duplicate requested ids, parent filtering, empty parent lists, constructor-order listing, caller array mutation after construction, frozen input arrays, and source-boundary forbidden-name checks.
- Exported `ProfileBranchStore` and `createStaticProfileBranchStore` from `src/features/ontology/index.ts`.
- No DB, migration, backup, storage adapter, UI selector, global active selection, automatic merge, MCP/adapters, agent runtime, app-builder runtime, DSL runtime, or profile persistence added.
- Kimi Code CLI source result was accepted without source fixes. The CLI process exited with a Windows console Unicode/charmap final-report crash after doing the work, so that is recorded as a harness/reporting risk.

Verification:

- TypeScript clean.
- Targeted branch-store/branch/selection tests: 53/53 passed across 3 files.
- Full suite: 540/540 passed across 58 files.
- Forbidden-name rg clean for `profileBranchStore` source/test.
- No non-ASCII in `profileBranchStore` source/test.
- `git diff --check` clean for Kimi-touched files with CRLF warnings only.

Pi/Qwen Slice 1 (project-scoped ProfileSelection persistence v1):

- Added migration `013-profile-selections` and registered it after migration 012.
- Added Drizzle `profileSelections` schema:
  - one row per project via unique `project_id`
  - `project_id` references `projects(id)` with cascade delete
  - `base_profile_id`
  - ordered project/learning/personal branch id arrays as JSON columns
  - timestamps
- Added ontology data-boundary codec/repo:
  - `validateProjectProfileSelection`
  - `rowToProjectProfileSelection`
  - `projectProfileSelectionToRow`
  - insert/upsert/get-by-id/get-by-project/delete-for-project repo methods
- Added backup/export/import/clear support for `profile_selections`; archive format is now v3 and schema version is 13.
- Updated stage10 guards so `profile_selections` is allowed only in planned persistence boundary files/tests.
- Reviewer fixes after Pi:
  - `FORMAT_VERSION` bumped to 3 because the archive layout gained a new NDJSON file
  - `upsertProjectProfileSelection` now conflicts on `projectId`, matching the one-selection-per-project invariant
  - selection row codec now parses raw JSON-string branch id columns as well as decoded arrays
  - clear-all-data deletes `profile_selections` before `projects`
- No UI selector, global active selection singleton, DB-owned runtime composition, merge proposal storage, profile/base persistence, MCP/adapters, agent runtime, app-builder runtime, or DSL runtime added.

Codex Decision Slice (runtime activation wiring):

- Added `16_RUNTIME_ACTIVATION_WIRING_DECISION.md` with locked decision:
  - runtime activation wiring is a small application/coordinator layer above screens/services and above low-level repos
  - it reads a project/context selection
  - it resolves the base profile through `ProfileRegistry`
  - it resolves branch ids through `ProfileBranchStore`
  - it composes through the existing pure selection/runtime profile pipeline
  - services still receive only the finished `DomainProfile`
  - missing project selection rows fall back to the coding base
  - invalid base/branch references should throw structured activation errors
  - repos remain fact storage
  - Runtime Profile Coordinator remains pure
  - no global active profile, DB-owned composed profile, UI selector, MCP, agent runtime, app-builder runtime, or DSL runtime in this slice

Pi/Qwen Slice (runtime activation helper implementation):

- Added `src/features/ontology/runtimeProfileActivation.ts`:
  - `resolveRuntimeProfileForProject(input)`
  - `ProjectRuntimeProfileActivationInput`
  - `ProjectRuntimeProfileActivationResult`
  - `ProjectProfileSelectionStore`
  - `RuntimeProfileActivationError`
  - `RuntimeProfileActivationErrorCode`
  - `DEFAULT_RUNTIME_PROFILE_BASE_PROFILE_ID`
- The resolver reads project selection through a caller-supplied store, resolves the base profile through `ProfileRegistry`, resolves selected branch ids through `ProfileBranchStore`, validates missing/wrong-kind branch ids with structured errors, composes through `composeRuntimeDomainProfileFromSelection`, and returns the finished `DomainProfile` plus trace data.
- Missing project selection rows fall back to the `coding` base profile.
- The helper is interface-based and does not import DB repos, services, UI, MCP/adapters, agent runtime, app-builder runtime, or DSL runtime.
- Added `src/features/ontology/__tests__/runtimeProfileActivation.test.ts` with fallback, custom default, persisted selection, branch order/precedence, structured error, immutability, barrel export, and boundary tests.
- Pi/Qwen completed the implementation but timed out during doc-finalization; Codex removed the scratch artifact, fixed two test issues, and verified the slice.

## Current Implementation State

The ontology-profile refactor has moved beyond profile labels and compatibility naming. The current state is:

- `codingProfile` is the current base profile for this app lineage.
- `composeDomainProfile(base, overlays)` composes project, learning, and personal overlays.
- `getActiveDomainProfile(overlays?)` preserves old behavior for no overlays:
  - no argument returns `codingProfile` by reference
  - empty array returns `codingProfile` by reference
  - explicit overlays compose a runtime profile
- `ActiveDomainProfileSource` gives a structured input shape:
  - `baseProfile`
  - optional/null `overlays`
- `resolveActiveDomainProfile(source)` is the pure resolver.
- `ActiveDomainProfileActivationInput<TItemTypeNodeId>` provides grouped overlay input.
- `createActiveDomainProfileSource(input)` and `resolveActiveDomainProfileFromActivationInput(input)` compose grouped overlays.
- `prepareSaveCandidates` now accepts `options.profile?: DomainProfile` and defaults to `getActiveDomainProfile()` when omitted. The A2 decision is locked: the service receives the finished/composed brain, not branch ingredients. A1 (passing `ActiveDomainProfileActivationInput` into `prepareSaveCandidates`) was explicitly rejected.
- The runtime profile coordinator decision is locked (doc 11): the brain mixer is an explicit separate layer above runtime services. Services receive composed `DomainProfile`, do not know branch groups, do not call activation input resolvers, and do not read hidden global active-profile state.
- The coordinator helper is now implemented and tested: `runtimeProfileCoordinator.ts` is the explicit above-services coordinator boundary. `composeRuntimeDomainProfile(input)` delegates to `resolveActiveDomainProfileFromActivationInput(input)`. `RuntimeProfileCoordinatorInput` aliases `ActiveDomainProfileActivationInput`. Services still receive composed `DomainProfile`; they do not call this helper directly unless their caller passes the result. No DB, UI, persistence, global store, service hidden lookup, agent runtime, app-builder runtime, or DSL runtime was added.
- Composition still belongs to the coordinator layer. The branch/overlay persistence decision is now locked (doc 13): persist branch layers separately, not composed runtime profiles. Overlays are the durable source; composition is derived. Merging upward requires approval. Sibling branches do not affect each other. Parent profiles stay clean.
- The domain-only branch model is implemented. `ProfileBranchKind`, `ProfileBranch<TItemTypeNodeId>`, and `profileBranches.ts` helpers turn branch layers into grouped overlays and composed runtime profiles through the existing activation/coordinator pipeline.
- The profile selection and branch resolution decision is locked (doc 14): selection is per-context and id-based, with one `baseProfileId` plus ordered project/learning/personal branch id arrays in v1. A resolver turns selected ids into branch values before the Runtime Profile Coordinator composes the runtime `DomainProfile`. No global active selection, DB, UI, MCP, agent runtime, app-builder runtime, DSL runtime, or multi-base composition is part of this slice.
- The domain-only profile selection helper is implemented. `ProfileSelection`, `resolveProfileSelection`, and `composeRuntimeDomainProfileFromSelection` let callers select a base id and ordered branch ids, resolve them from provided branch values, and compose through the existing branch/coordinator pipeline without DB/UI/global state.
- The ProfileRegistry/ProfileSource v1 static helper is implemented. Base profiles resolve through a source-based registry, and duplicate profile ids throw structured errors. The interface still leaves room for future built-in/file/DB/adapter sources without changing callers.
- The ProfileBranchStore v1 static helper is implemented. Branch stores are now a separate seam from ProfileRegistry and ProfileSelection. The first implementation is in-memory only, snapshots the branch array at construction, returns branch objects by reference, and exposes async read methods for future persistent adapters.
- The branch/overlay DB persistence v1 slice is implemented: `profile_branches` rows with inline `overlay_json`, ontology data-boundary repo/codec, backup/export/import/clear support, and guards. Active selection and merge proposals stay separate.
- The project-scoped selection DB persistence v1 slice is implemented: `profile_selections` stores one active selection per project as one base profile id plus ordered project/learning/personal branch id arrays. Runtime composition remains derived and caller-owned.
- The runtime activation helper is implemented and tested. `runtimeProfileActivation.ts` builds runtime profiles through an explicit interface-based resolver that reads a project/context selection, registry, and branch store, then delegates composition to pure helpers.
- The remaining open work is: (1) profile persistence / user-created base profile storage, (2) merge proposal storage and review UI, (3) correction storage implementation, (4) checker runtime and approval UI, (5) agent/subagent execution ontology brief, (6) self-building-app framework brief.

## Core Activation Files

```text
src/features/ontology/profileActivation.ts
src/features/ontology/__tests__/profileActivation.test.ts
ONTOLOGY_PROFILE_REFACTOR/WHERE_WE_STAND.md
```

## Changed Files In Batch 5

```text
src/__tests__/stage10-architecture-guards.test.ts  (added source guard test)
src/features/ontology/types.ts  (added ActiveDomainProfileActivationInput)
src/features/ontology/profileActivation.ts  (added grouped source helper and convenience resolver)
src/features/ontology/__tests__/profileActivation.test.ts  (added grouped activation input tests)
src/features/ontology/index.ts  (added exports for new activation helpers)
ONTOLOGY_PROFILE_REFACTOR/NEXT_LLM_CONTEXT.md
ONTOLOGY_PROFILE_REFACTOR/TOMORROW_START.md
ONTOLOGY_PROFILE_REFACTOR/implementation_handoff.md
ONTOLOGY_PROFILE_REFACTOR/WHERE_WE_STAND.md
ONTOLOGY_PROFILE_REFACTOR/10_ACTIVE_PROFILE_RUNTIME_SOURCE_DECISION.md
```

## Changed Files In Batch 6

Slice 1 (A2 implementation):

```text
src/features/learning/services/prepareSaveCandidates.ts  (added profile option)
src/features/learning/services/__tests__/stage2-prepareSaveCandidates.test.ts  (added 3 new tests, total 4)
```

Slice 2 (doc sync):

```text
ONTOLOGY_PROFILE_REFACTOR/10_ACTIVE_PROFILE_RUNTIME_SOURCE_DECISION.md
ONTOLOGY_PROFILE_REFACTOR/NEXT_LLM_CONTEXT.md
ONTOLOGY_PROFILE_REFACTOR/TOMORROW_START.md
ONTOLOGY_PROFILE_REFACTOR/WHERE_WE_STAND.md
ONTOLOGY_PROFILE_REFACTOR/implementation_handoff.md
```

## Changed Files In Batch 7

Slice 1 (coordinator decision doc):

```text
ONTOLOGY_PROFILE_REFACTOR/11_RUNTIME_PROFILE_COORDINATOR_DECISION.md  (created decision doc)
ONTOLOGY_PROFILE_REFACTOR/README.md  (doc map)
ONTOLOGY_PROFILE_REFACTOR/NEXT_LLM_CONTEXT.md
ONTOLOGY_PROFILE_REFACTOR/TOMORROW_START.md
ONTOLOGY_PROFILE_REFACTOR/WHERE_WE_STAND.md
ONTOLOGY_PROFILE_REFACTOR/implementation_handoff.md
```

Slice 2 (coordinator helper implementation):

```text
src/features/ontology/runtimeProfileCoordinator.ts  (added coordinator helper)
src/features/ontology/__tests__/runtimeProfileCoordinator.test.ts  (added 5/5 tests)
src/features/ontology/index.ts  (added exports for coordinator helper)
ONTOLOGY_PROFILE_REFACTOR/11_RUNTIME_PROFILE_COORDINATOR_DECISION.md  (updated with implementation section)
ONTOLOGY_PROFILE_REFACTOR/NEXT_LLM_CONTEXT.md  (coordinator implemented, next decisions updated)
ONTOLOGY_PROFILE_REFACTOR/TOMORROW_START.md  (coordinator implemented, next decisions updated)
ONTOLOGY_PROFILE_REFACTOR/WHERE_WE_STAND.md  (current-state for Batch 7 Slice 2)
ONTOLOGY_PROFILE_REFACTOR/implementation_handoff.md  (coordinator helper bullet)
```

Slice 3 (coordinator guard and docs):

```text
src/__tests__/stage10-architecture-guards.test.ts  (added 2 coordinator guard tests)
ONTOLOGY_PROFILE_REFACTOR/11_RUNTIME_PROFILE_COORDINATOR_DECISION.md  (added implementation section)
ONTOLOGY_PROFILE_REFACTOR/NEXT_LLM_CONTEXT.md  (coordinator helper implemented and tested)
ONTOLOGY_PROFILE_REFACTOR/TOMORROW_START.md  (coordinator helper implemented and tested)
ONTOLOGY_PROFILE_REFACTOR/WHERE_WE_STAND.md  (Batch 7 Slice 3 status)
ONTOLOGY_PROFILE_REFACTOR/implementation_handoff.md  (coordinator guard bullet)
```

## Changed Files In Batch 8

Slice 1 (correction evidence persistence decision doc):

```text
ONTOLOGY_PROFILE_REFACTOR/12_CORRECTION_EVIDENCE_PERSISTENCE_DECISION.md  (created decision doc)
ONTOLOGY_PROFILE_REFACTOR/README.md  (doc map)
ONTOLOGY_PROFILE_REFACTOR/NEXT_LLM_CONTEXT.md
ONTOLOGY_PROFILE_REFACTOR/TOMORROW_START.md
ONTOLOGY_PROFILE_REFACTOR/WHERE_WE_STAND.md
ONTOLOGY_PROFILE_REFACTOR/implementation_handoff.md
```

## Changed Files In Batch 9

Slice 1 (branch/overlay persistence decision doc):

```text
ONTOLOGY_PROFILE_REFACTOR/13_BRANCH_OVERLAY_PERSISTENCE_DECISION.md  (created decision doc)
ONTOLOGY_PROFILE_REFACTOR/06_PROFILE_BRANCHING_AND_MERGE.md  (added pointer to doc 13)
ONTOLOGY_PROFILE_REFACTOR/README.md  (doc map)
ONTOLOGY_PROFILE_REFACTOR/NEXT_LLM_CONTEXT.md
ONTOLOGY_PROFILE_REFACTOR/TOMORROW_START.md
ONTOLOGY_PROFILE_REFACTOR/WHERE_WE_STAND.md
ONTOLOGY_PROFILE_REFACTOR/implementation_handoff.md
```

## Changed Files In Batch 11

Slice 0 (profile selection and branch resolution decision doc):

```text
ONTOLOGY_PROFILE_REFACTOR/14_PROFILE_SELECTION_AND_BRANCH_RESOLUTION_DECISION.md  (created decision doc)
ONTOLOGY_PROFILE_REFACTOR/README.md  (doc map)
ONTOLOGY_PROFILE_REFACTOR/NEXT_LLM_CONTEXT.md
ONTOLOGY_PROFILE_REFACTOR/TOMORROW_START.md
ONTOLOGY_PROFILE_REFACTOR/WHERE_WE_STAND.md
ONTOLOGY_PROFILE_REFACTOR/implementation_handoff.md
```

Slice 1 (domain-only ProfileSelection helper):

```text
src/features/ontology/types.ts  (added ProfileSelection)
src/features/ontology/profileSelection.ts  (new pure selection helper module)
src/features/ontology/__tests__/profileSelection.test.ts  (new tests)
src/features/ontology/index.ts  (exports)
ONTOLOGY_PROFILE_REFACTOR/14_PROFILE_SELECTION_AND_BRANCH_RESOLUTION_DECISION.md  (implementation section)
ONTOLOGY_PROFILE_REFACTOR/NEXT_LLM_CONTEXT.md
ONTOLOGY_PROFILE_REFACTOR/TOMORROW_START.md
ONTOLOGY_PROFILE_REFACTOR/WHERE_WE_STAND.md
ONTOLOGY_PROFILE_REFACTOR/implementation_handoff.md
```

## Changed Files In Batch 12

Slice 1 (ProfileRegistry/ProfileSource v1 static helper):

```text
src/features/ontology/types.ts  (added DomainProfileSummary, ProfileSource, ProfileRegistry)
src/features/ontology/profileRegistry.ts  (new pure registry helper module)
src/features/ontology/__tests__/profileRegistry.test.ts  (new tests)
src/features/ontology/index.ts  (exports)
ONTOLOGY_PROFILE_REFACTOR/15_PROFILE_REGISTRY_AND_PROFILE_SOURCES_DECISION.md  (duplicate-id lock and implementation section)
ONTOLOGY_PROFILE_REFACTOR/README.md  (doc map)
ONTOLOGY_PROFILE_REFACTOR/NEXT_LLM_CONTEXT.md
ONTOLOGY_PROFILE_REFACTOR/TOMORROW_START.md
ONTOLOGY_PROFILE_REFACTOR/WHERE_WE_STAND.md
ONTOLOGY_PROFILE_REFACTOR/implementation_handoff.md
```

## Changed Files In Kimi Code CLI Slice 1

```text
src/features/ontology/types.ts  (added ProfileBranchStore)
src/features/ontology/profileBranchStore.ts  (new static/in-memory branch store helper)
src/features/ontology/__tests__/profileBranchStore.test.ts  (new tests)
src/features/ontology/index.ts  (exports)
ONTOLOGY_PROFILE_REFACTOR/NEXT_LLM_CONTEXT.md
ONTOLOGY_PROFILE_REFACTOR/TOMORROW_START.md
ONTOLOGY_PROFILE_REFACTOR/WHERE_WE_STAND.md
ONTOLOGY_PROFILE_REFACTOR/implementation_handoff.md
```

## Changed Files In Batch 10

Slice 1 (domain-only ProfileBranch model):

```text
src/features/ontology/types.ts  (added ProfileBranchKind and ProfileBranch)
src/features/ontology/profileBranches.ts  (new branch helper module)
src/features/ontology/__tests__/profileBranches.test.ts  (new tests)
src/features/ontology/index.ts  (exports)
```

## Important Existing Changed Files

These tracked files are expected to be modified in the current worktree:

```text
ONTOLOGY_PROFILE_REFACTOR/NEXT_LLM_CONTEXT.md
ONTOLOGY_PROFILE_REFACTOR/TOMORROW_START.md
ONTOLOGY_PROFILE_REFACTOR/implementation_handoff.md
ONTOLOGY_PROFILE_REFACTOR/WHERE_WE_STAND.md
ONTOLOGY_PROFILE_REFACTOR/README.md
ONTOLOGY_PROFILE_REFACTOR/10_ACTIVE_PROFILE_RUNTIME_SOURCE_DECISION.md
ONTOLOGY_PROFILE_REFACTOR/11_RUNTIME_PROFILE_COORDINATOR_DECISION.md
ONTOLOGY_PROFILE_REFACTOR/12_CORRECTION_EVIDENCE_PERSISTENCE_DECISION.md
ONTOLOGY_PROFILE_REFACTOR/13_BRANCH_OVERLAY_PERSISTENCE_DECISION.md
ONTOLOGY_PROFILE_REFACTOR/14_PROFILE_SELECTION_AND_BRANCH_RESOLUTION_DECISION.md
ONTOLOGY_PROFILE_REFACTOR/15_PROFILE_REGISTRY_AND_PROFILE_SOURCES_DECISION.md
ONTOLOGY_PROFILE_REFACTOR/KORTEX_DEVELOPER_EXPLAINER.md
src/__tests__/stage10-architecture-guards.test.ts
src/features/ontology/__tests__/profileActivation.test.ts
src/features/ontology/__tests__/profileBranches.test.ts
src/features/ontology/__tests__/profileSelection.test.ts
src/features/ontology/__tests__/profileRegistry.test.ts
src/features/ontology/__tests__/profileBranchStore.test.ts
src/features/ontology/__tests__/runtimeProfileCoordinator.test.ts
src/features/ontology/index.ts
src/features/ontology/profileActivation.ts
src/features/ontology/profileBranches.ts
src/features/ontology/profileSelection.ts
src/features/ontology/profileRegistry.ts
src/features/ontology/profileBranchStore.ts
src/features/ontology/runtimeProfileCoordinator.ts
src/features/ontology/types.ts
src/features/learning/services/prepareSaveCandidates.ts
src/features/learning/services/__tests__/stage2-prepareSaveCandidates.test.ts
```

Untracked local tool folder:

```text
.claude/settings.local.json
```

Do not include `.claude/` unless explicitly requested.

## Verification Already Run

Final verification after Batch 10 (domain-only ProfileBranch model):

```powershell
node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit
npm test -- --run src/features/ontology/__tests__/profileBranches.test.ts src/features/ontology/__tests__/runtimeProfileCoordinator.test.ts src/features/ontology/__tests__/profileActivation.test.ts src/features/ontology/__tests__/profileComposition.test.ts
npm test -- --run
rg -n "AsyncStorage|sqlite|drizzle|schema|db|migration|zustand|createStore|setActiveBranch|useActiveBranch|profile_branches|profile_overlays|automaticMerge|autoMerge|applyMerge|MCP|agent|app-builder|Racket|DSL" src/features/ontology/profileBranches.ts src/features/ontology/__tests__/profileBranches.test.ts
rg -n "[^\x00-\x7F]" src/features/ontology/profileBranches.ts src/features/ontology/__tests__/profileBranches.test.ts
git diff --check
```

Result: TypeScript clean; targeted branch/coordinator/activation/composition tests 73/73 passed across 4 files; full suite 475/475 passed across 55 files; forbidden-name rg clean for profileBranches source/test; non-ASCII rg clean; `git diff --check` clean with CRLF warnings only.

Final verification after Batch 7 (Runtime Profile Coordinator):

```powershell
node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit
npm test -- --run src/features/learning/services/__tests__/stage2-prepareSaveCandidates.test.ts src/features/ontology/__tests__/runtimeProfileCoordinator.test.ts src/features/ontology/__tests__/profileActivation.test.ts src/features/ontology/__tests__/activeProfile.test.ts src/features/ontology/__tests__/profileComposition.test.ts src/features/ontology/__tests__/corrections.test.ts src/__tests__/stage10-architecture-guards.test.ts
npm test -- --run
npm test -- --run src/features/ontology/__tests__/runtimeProfileCoordinator.test.ts src/__tests__/stage10-architecture-guards.test.ts
rg -n "[^\x00-\x7F]" src/__tests__/stage10-architecture-guards.test.ts ONTOLOGY_PROFILE_REFACTOR/11_RUNTIME_PROFILE_COORDINATOR_DECISION.md ONTOLOGY_PROFILE_REFACTOR/NEXT_LLM_CONTEXT.md ONTOLOGY_PROFILE_REFACTOR/TOMORROW_START.md ONTOLOGY_PROFILE_REFACTOR/WHERE_WE_STAND.md ONTOLOGY_PROFILE_REFACTOR/implementation_handoff.md src/features/ontology/runtimeProfileCoordinator.ts src/features/ontology/__tests__/runtimeProfileCoordinator.test.ts
rg -n "getRuntimeProfile|setRuntimeProfile|useRuntimeProfile|AsyncStorage|zustand|createStore|activeProfileStore|activeOverlays|profile_overlays|profile_branches|active_profile_overlay|prepareSaveCandidates" src/features/ontology/runtimeProfileCoordinator.ts src/features/ontology/__tests__/runtimeProfileCoordinator.test.ts
```

Result: TypeScript clean; focused profile/guard/correction/activation/save/coordinator set 136/136 passed across 7 test files; full suite 461/461 passed across 54 test files; targeted runtimeProfileCoordinator + stage10 47/47 passed; no non-ASCII in changed docs/source test files; no forbidden state/persistence/runtime names in coordinator source/test.

Final verification after Batch 6 (A2 implementation + doc sync):

```powershell
node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit
npm test -- --run src/features/learning/services/__tests__/stage2-prepareSaveCandidates.test.ts src/features/ontology/__tests__/profileActivation.test.ts src/features/ontology/__tests__/activeProfile.test.ts src/features/ontology/__tests__/profileComposition.test.ts src/features/ontology/__tests__/corrections.test.ts src/__tests__/stage10-architecture-guards.test.ts
npm test -- --run
npm test -- --run src/features/learning/services/__tests__/stage2-prepareSaveCandidates.test.ts src/__tests__/stage10-architecture-guards.test.ts
rg -n [^\x00-\x7F] ONTOLOGY_PROFILE_REFACTOR/10_ACTIVE_PROFILE_RUNTIME_SOURCE_DECISION.md ONTOLOGY_PROFILE_REFACTOR/NEXT_LLM_CONTEXT.md ONTOLOGY_PROFILE_REFACTOR/TOMORROW_START.md ONTOLOGY_PROFILE_REFACTOR/WHERE_WE_STAND.md ONTOLOGY_PROFILE_REFACTOR/implementation_handoff.md
rg -n ActiveDomainProfileActivationInput src/features/learning/services/
git diff --check
```

Result: TypeScript clean; focused profile/guard/correction/activation/save set 129/129 passed across 6 test files; full suite 454/454 passed across 53 test files; targeted stage2 + stage10 44/44 passed; no non-ASCII in changed docs/source test files; no `ActiveDomainProfileActivationInput` in changed learning service files; `git diff --check` clean.

Prior verification (Batch 6 Slice 1 code only):

```powershell
npm test -- --run src/features/learning/services/__tests__/stage2-prepareSaveCandidates.test.ts src/__tests__/stage10-architecture-guards.test.ts
rg -n ActiveDomainProfileActivationInput src/features/learning/services/
```

Result: stage2 4/4 passed, stage10 40/40 passed; no forbidden names in learning service files.

Prior verification (Batch 5):

```powershell
node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit
npm test -- --run src/__tests__/stage10-architecture-guards.test.ts src/features/ontology/__tests__/profileActivation.test.ts
npm test -- --run src/features/ontology/__tests__/profileComposition.test.ts src/features/ontology/__tests__/activeProfile.test.ts src/features/ontology/__tests__/corrections.test.ts src/features/ontology/__tests__/profileActivation.test.ts src/__tests__/stage10-architecture-guards.test.ts
npm test -- --run
```

Result: focused profile/guard/correction/activation set 125/125 across 5 test files; full suite 451/451 across 53 test files.

## CLI Harness HR State

CLI harness HR data is current:

- `C:\pi-stuff\model_hr_db.json`
- `C:\pi-stuff\hr_findings_viewer.html`
- `C:\pi-stuff\HR_DATABASE.md`
- `C:\pi-stuff\FUTURE_PI_PROMPTING.md`
- `C:\pi-stuff\HR_REPORT_2026-05-09_BATCH12_PROFILE_REGISTRY_V1.md`
- `C:\pi-stuff\HR_REPORT_2026-05-08_BATCH11_PROFILE_SELECTION_HELPER.md`
- `C:\pi-stuff\HR_REPORT_2026-05-08_BATCH10_DOMAIN_PROFILE_BRANCH_MODEL.md`

Current HR count:

```text
46 evaluations
44 generalized lessons
```

Latest accepted worker:

```text
model: Kimi Code CLI default model
runner: Kimi Code CLI
score: 8/10
slice: ProfileBranchStore v1 static helper
```

Reusable HR lessons from this slice:

- Kimi Code CLI is usable for strict, bounded in-memory/domain helper seams after Codex/human architecture is locked.
- Require ASCII-only final reports from Kimi Code CLI on Windows; the code was usable, but the runner crashed while printing a Unicode final-report character.
- Treat Kimi final-report counts as untrusted until Codex verifies actual test counts.

## Next Decision Gate

The A2 decision for `prepareSaveCandidates` is locked and implemented. The runtime profile coordinator decision is locked (doc 11). The correction evidence persistence decision is locked (doc 12). The branch/overlay persistence decision is locked (doc 13). The profile selection and branch resolution decision is locked (doc 14). The ProfileRegistry/ProfileSource v1 static helper is implemented (doc 15). The runtime activation wiring decision is locked (doc 16) and the interface-based runtime activation helper is implemented. The domain-only `ProfileBranch`, `ProfileSelection`, `ProfileRegistry`, and static/in-memory `ProfileBranchStore` helper seams are implemented.

The coordinator helper is now implemented and tested. The remaining open decisions require Codex plus human input:

```text
1. Profile persistence / user-created base profile storage, later.
2. Merge proposal storage and review UI - how merge proposals are stored, presented, and approved/rejected/postponed.
3. Correction storage implementation - DB/migration/store for profileId-only OntologyCorrectionEvidence; branch-targeted correction fields can come later now that branch persistence exists.
4. Checker runtime and approval UI - patch suggestion generation and review.
5. Agent/subagent execution ontology decision brief.
6. Self-building-app framework decision brief.
```

Model recommendation:

- Decision: Codex/GPT-5
- Bounded TypeScript worker after decision: Kimi Code CLI or `opencode-go/qwen3.6-plus`, depending on risk and scope
- Guard/docs worker after decision: `opencode-go/glm-5.1` with high thinking

## Commit Message

```text
Add profile branch, selection, and registry helper seams
```

## Commit Summary

```text
Added the domain-only ProfileBranch, ProfileSelection, and ProfileRegistry helper seams. ProfileBranchKind/ProfileBranch, ProfileSelection, DomainProfileSummary, ProfileSource, and ProfileRegistry now live in ontology types. profileBranches.ts turns branch layers into overlays/grouped activation input/runtime profiles through the coordinator pipeline. profileSelection.ts resolves per-context id-based selections into branch values. profileRegistry.ts resolves base profiles from static/in-memory profile sources and throws structured duplicate/not-found errors. Added focused tests for branch grouping, selection order, registry lookup/listing, duplicate ids, precedence, immutability, frozen inputs, caller array stability, runtime composition equivalence, and forbidden-name boundaries. No DB, migration, storage API, profile persistence, file source, adapter source, UI selector, global active selection/registry, automatic merge/versioning, correction branch fields, MCP/adapters, agent runtime, app-builder runtime, DSL runtime, or multi-base composition added.
```

## Detailed Commit Body

```text
- Added ProfileBranchKind and ProfileBranch<TItemTypeNodeId> to ontology types
- Added profileBranches.ts with pure helpers:
  - profileBranchToOverlay
  - groupProfileBranchesByKind
  - createActiveDomainProfileSourceFromBranches
  - composeRuntimeDomainProfileFromBranches
- Added profileBranches.test.ts with focused tests for:
  - empty branch list returns base profile by reference
  - project branch overlay adds ontology node
  - personal branch wins over project
  - learning branch wins over project when personal absent
  - later same-kind project branch wins
  - sibling branches remain independent and inputs are not mutated
  - frozen branch arrays/objects compose correctly
  - grouped helper preserves input order inside each kind
  - branch composition matches existing runtime composition path
  - profileBranches source remains free of forbidden persistence/runtime terms
- Exported ProfileBranch types and branch helpers from ontology index
- Added ProfileSelection to ontology types
- Added profileSelection.ts with pure helpers:
  - resolveProfileSelection
  - composeRuntimeDomainProfileFromSelection
- Added profileSelection.test.ts with focused tests for:
  - empty selection returns base by reference
  - selected project branch adds ontology node
  - selection order wins independent of raw branch array order
  - personal/learning/project precedence
  - missing branch id, base id mismatch, and wrong-kind branch id errors
  - frozen input immutability
  - equivalence to composeRuntimeDomainProfileFromBranches
  - profileSelection source/test forbidden-name boundaries
- Added DomainProfileSummary, ProfileSource<TItemTypeNodeId>, and ProfileRegistry<TItemTypeNodeId> to ontology types
- Added profileRegistry.ts with pure helpers:
  - DuplicateProfileIdError
  - ProfileNotFoundError
  - toDomainProfileSummary
  - createStaticProfileSource
  - createProfileRegistry
- Added profileRegistry.test.ts with focused tests for:
  - summary shape contains only id/version/label/description
  - static source lookup/listing
  - duplicate profile ids inside one source
  - registry lookup/listing
  - duplicate profile ids across sources
  - unknown profile id errors
  - frozen input and caller array mutation stability
  - profileRegistry source/test forbidden-name boundaries
- Updated NEXT_LLM_CONTEXT, TOMORROW_START, WHERE_WE_STAND, and implementation_handoff
- No DB, migration, storage API, profile persistence, file source, adapter
  source, UI selector, global active selection/registry, automatic merge,
  automatic versioning, correction branch fields, MCP/adapters, agent runtime,
  app-builder runtime, DSL runtime, or multi-base composition added
```

## Commit Caveat

Do not include local tool folders unless explicitly requested:

```text
.claude/
C:\pi-stuff\sessions\
```

The Pi HR files under `C:\pi-stuff` are a separate repo/work area from the app repo. Commit them separately if desired.
