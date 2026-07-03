# Branch/Profile Selection UI Decision

**Status:** Locked decision on 2026-06-12. Pure selection-draft helper, focused data hooks, compact selection panel, and project-context wiring implemented.
**Branch:** `refactor/ontology-profile`

## Source Map

This decision does not reopen profile/branch architecture. It narrows the first user-facing selection UI over already locked seams:

- **Doc 13:** branch rows persist overlay layers; composed runtime profiles are derived and not canonical truth.
- **Doc 14:** active selection is id-based, single-base in v1, ordered by branch kind arrays, and must not become hidden global state.
- **Doc 16:** runtime activation wiring loads selected base/branches and passes a finished `DomainProfile` to services.
- **Doc 17:** user-created base profiles are separate profile definitions, not branches or composed runtime profiles.
- **Doc 39:** target-layer switching is explicit user action with blast-radius copy. Its first branch-local additive proposal -> base/core slice is now implemented through the review surface.
- **Doc 41:** the checker is manual, branch-local, proposal-only, and currently needs an explicit branch target instead of the temporary review-queue fallback.

## Locked Decision

Build a minimal branch/profile selection UI over existing persistence and runtime seams.

The first UI lets the user inspect and set one project-scoped `ProfileSelection`:

```text
baseProfileId
projectBranchIds[]
learningBranchIds[]
personalBranchIds[]
```

It may also create an empty branch under the selected base profile so the user can immediately select a real local layer for checker/proposal work.

It must not introduce a new profile model, a new persistence table, a global active-profile singleton, a composed-profile cache, or a branch merge/fork workflow.

## Plain-Language Explanation

Kordex already has the ingredients:

```text
base profile
branch overlays
project selection row
runtime composer
checker/proposal review surface
```

This gate is the first small control panel for choosing those ingredients. It does not invent a new brain. It only lets the user say:

```text
For this project, use coding + these selected branches.
When the checker creates a proposal, put it into this explicit branch.
```

## UI Scope

V0 may include:

- Show the current project-scoped base profile id and selected branch ids.
- List existing branches for the selected base profile, grouped by `project`, `learning`, and `personal`.
- Select, deselect, and reorder branches within their kind-specific ordered arrays.
- Create a new empty branch for the selected base profile with `branchKind`, name, empty overlay, and timestamps.
- Save the project-scoped selection through `profile_selections`.
- Show the selected runtime ingredients before saving.
- Provide an explicit checker target branch chosen from the selected branch ids.

V0 should keep the UI dense and utilitarian. It is a working selection panel, not a marketing/profile gallery.

## Target Branch Rule

`ProfileSelection` describes composition. It is not itself a mutation target.

When a workflow needs one branch-local write target, the UI must pass an explicit branch id for that action.

For the first checker UI:

- If no branch is selected, the checker should stay disabled or explain that a branch must be selected.
- If exactly one branch is selected, the UI may preselect it as the checker target.
- If multiple branches are selected, the user must choose the checker target branch for the run.
- The review-queue fallback in `ProfileProposalReviewScreen` is scaffolding and should be removed or bypassed once this explicit selection context is wired.

The checker must not infer a write target from composed profile precedence when multiple branches are active.

## Validation Rules

Before saving a project selection:

- The base profile id must resolve through the registry/profile source seam.
- Every selected branch id must exist.
- Every selected branch must have `parentProfileId === baseProfileId`.
- Branch ids must be unique within and across selected arrays.
- Same-kind order must be preserved because order affects composition.
- Unsupported branch kinds must fail closed.
- If the base profile changes, incompatible selected branch ids must be cleared or explicitly reselected; they must not be silently carried across bases.

Validation failures should keep the draft visible and explain the specific issue. They must not silently coerce to another base, branch, or target.

## Persistence And Runtime Boundaries

Allowed:

- Read branches through the ontology data boundary.
- Read/update project-scoped selection through `profileSelectionRepo`.
- Insert empty branches through `profileBranchRepo`.
- Compose previews through existing pure/runtime activation helpers.
- Invalidate profile selection, branch, proposal, and freshness query keys only when the corresponding persisted fact changed.

Required:

- Persist `ProfileSelection` ids, not branch values.
- Keep composed runtime profiles derived.
- Keep services receiving composed `DomainProfile`, not selection/branch stores.
- Keep branch creation as an empty overlay container; ontology changes still go through proposals/apply.

## Non-Goals

This slice must not add:

- New DB tables or migrations.
- Global `getActiveSelection()`, `setActiveSelection()`, hidden active-profile store, or process-global active branch.
- Multi-base composition.
- Base-profile creation/fork UX.
- Branch rename/delete UX. Destructive branch lifecycle needs its own later gate.
- Branch merge, upward promotion, sibling propagation, or parent/base mutation.
- Target-layer switching from Doc 39.
- Base/core checker targeting.
- Auto-apply, trust-setting mutation, or user-fit-driven mutation.
- Relationship/boundary typed operation vocabulary.
- Temporary/provisional maturity lifecycle.
- Graph/vector retrieval, checker-run table, background checker mode, DSL/runtime agents, app-builder runtime, source sync, or MCP write-back.

## First Implementation Shape

1. Add a pure presentation/validation helper for selection drafts.
   - Inputs: current selection, available base profiles, available branches.
   - Outputs: grouped branch options, selected ids, validation errors, explicit checker-target options.
   - No DB, React, model calls, or mutation.
   - Implemented in `src/features/ontology/profileSelectionDraft.ts`.

2. Add focused data hooks behind the ontology UI/data boundary.
   - Load current project selection.
   - Load branches for the selected base.
   - Save selection with `upsertProjectProfileSelection`.
   - Create empty branch with `insertProfileBranch` or the existing repo seam.
   - Implemented in `src/features/ontology/hooks/useProfileSelection.ts`.

3. Add a compact selection panel.
   - It may live near proposal review/checker entry first.
   - It must show branch kind and base profile clearly.
   - It must not hide when no branch is active; that state is actionable.
   - Implemented in `src/features/ontology/ui/ProfileSelectionPanel.tsx`.

4. Wire checker target from explicit selection context.
   - Remove or bypass the current review-queue fallback.
   - Pass the selected branch id into the manual checker trigger.
   - Keep no-branch as no-write/explanation-only or disabled UI.
   - Implemented for project-aware proposal review entry points.

5. Leave target switching for a later Doc 39 implementation.
   - This slice may display why selection matters for target switching, but must not implement switching.

## Required Tests And Guards

Pure helper tests:

- groups branches by kind and preserves selected order
- rejects branch ids that do not exist
- rejects branch/base mismatches
- rejects duplicate branch ids
- clears or rejects incompatible branches on base change
- returns no checker target when no branch is selected
- requires explicit checker target when multiple branches are selected

Hook/service tests:

- saving uses `upsertProjectProfileSelection`
- empty branch creation writes an empty overlay under the selected base
- query invalidation stays scoped to selection/branch/proposal/freshness facts

UI tests or focused interaction tests:

- no selected branch disables checker or shows no-write explanation
- one selected branch can preselect checker target
- multiple selected branches require explicit checker target

Architecture guards:

- no global active selection singleton
- no composed runtime profile persistence
- no base/core checker target in this slice
- no branch merge/upward promotion/sibling propagation strings in implementation files
- Doc 42 anchors remain present in the docs

## Acceptance Criteria

- A user can see and save the project-scoped base/branch selection.
- A user can create and select an empty branch under the selected base.
- The checker receives an explicit branch target from selection UI, not the review-queue fallback.
- Existing docs 13/14/16/17 boundaries remain intact.
- No branch/base mutation occurs except creating an empty branch row or saving the selection row.
- Proposal creation, apply, edit, freshness, and refresh continue through the existing proposal spine.

## Implementation Update - Pure Selection Draft Helper

Implemented:

- `src/features/ontology/profileSelectionDraft.ts`
- `src/features/ontology/__tests__/profileSelectionDraft.test.ts`
- `src/__tests__/stage10-architecture-guards.test.ts`

What this implements:

- `createProfileSelectionDraftModel(input)` takes explicit `projectId`, draft `ProfileSelection`, available base profile summaries, available branch rows, and optional checker target branch id.
- It groups branch options by `project`, `learning`, and `personal`.
- It preserves selected branch order before unselected options within each kind.
- It validates unavailable base ids, missing branch ids, branch/base mismatches, wrong-kind ids, duplicate branch ids, and missing explicit project id.
- It computes checker target state without inferring a write target from composed profile precedence:
  - no selected branches -> `none_selected`
  - one selected branch -> `single_preselected`
  - multiple selected branches -> `requires_choice`
  - valid explicit target -> `selected`
  - target not selected -> `invalid_selection`
- It is exported through the pure ontology barrel.

What this does not implement:

- no DB reads/writes
- no React hook or UI panel
- no hidden current-project or active-selection global
- no composed runtime profile persistence
- no branch create/update/delete/rename
- no checker fallback removal yet
- no target switching

Verification:

- TypeScript clean.
- Focused `profileSelectionDraft` and `stage10-architecture-guards` tests: 95/95 passed across 2 files.

## Implementation Update - Selection Data Hooks

Implemented:

- `src/features/ontology/hooks/useProfileSelection.ts`
- `src/features/ontology/__tests__/useProfileSelection.test.ts`
- `src/features/ontology/data/queryKeys.ts`
- `src/__tests__/stage10-architecture-guards.test.ts`

What this implements:

- `useProjectProfileSelection(projectId)` loads one project-scoped selection by explicit project id.
- `useProfileBranchesForParent(parentProfileId)` loads branches under one selected base profile.
- `saveProjectProfileSelection(input)` and `useSaveProjectProfileSelection()` save through `upsertProjectProfileSelection`.
- `createEmptyProfileBranch(input)` and `useCreateEmptyProfileBranch()` create an empty branch row through `insertProfileBranch`.
- New query keys separate profile selection facts from branch facts.
- New selection rows get generated ids; existing rows preserve identity and `createdAt`.
- Empty branches trim and validate names, create an empty overlay, and do not add ontology content.

What this does not implement:

- no selector panel UI
- no branch rename/delete/update
- no hidden current-project global
- no composed runtime profile persistence
- no checker fallback removal yet
- no target switching
- no proposal/apply mutation

Verification:

- TypeScript clean.
- Focused `useProfileSelection`, `profileSelectionDraft`, and `stage10-architecture-guards` tests: 102/102 passed across 3 files.

## Implementation Update - Compact Selection Panel

Implemented:

- `src/features/ontology/ui/ProfileSelectionPanel.tsx`
- `src/features/ontology/profileSelectionDraft.ts`
- `src/features/ontology/__tests__/profileSelectionDraft.test.ts`
- `src/features/ontology/ui/ProfileProposalReviewScreen.tsx`
- `src/features/learning/ui/SaveAsLearningModal.tsx`
- `src/__tests__/stage10-architecture-guards.test.ts`

What this implements:

- The proposal review surface now hosts a compact profile selection panel.
- The panel uses explicit `projectId`, never hidden active-project/global selection state.
- The panel loads base-profile summaries, loads the project selection row, loads branches under the selected base, saves selection rows, and creates empty branch rows through the focused hooks.
- Users can change the base profile; selected branch ids are cleared rather than silently carried across bases.
- Users can select, deselect, and reorder branches inside their branch-kind arrays.
- Users can remove stale or invalid persisted branch ids from the draft when validation errors expose them.
- Users can create an empty branch under the selected base and immediately add it to the draft selection.
- Checker target selection comes from selected branches:
  - no selected branch -> checker disabled
  - one selected branch -> preselected target
  - multiple selected branches -> explicit target choice required
- `ProfileProposalReviewScreen` consumes the panel's explicit checker target and no longer infers a checker write target from the review proposal queue.
- `SaveAsLearningModal` passes its source `projectId` into the proposal review screen when available.
- The panel keeps unsaved drafts stable across content-identical query refetches by resetting from persistence only when the selection row identity or `updatedAt` changes.
- Caller-provided checker targets are treated as seeds; after the user interacts with the selection panel, the panel's explicit target wins.

What this does not implement:

- no branch rename/delete UX
- no branch merge, upward promotion, sibling propagation, or base/core mutation
- no composed runtime profile persistence
- no target-layer switching
- no base/core checker targeting
- no proposal creation/apply/edit/freshness changes beyond using the explicit checker target

Verification:

- TypeScript clean.
- Focused `profileSelectionDraft`, `useProfileSelection`, and `stage10-architecture-guards` tests: 107/107 passed across 3 files.

## Implementation Update - Project Context Wiring

Implemented:

- `app/learning/index.tsx`
- `app/project/[id].tsx`
- `src/features/learning/ui/LearningHubScreen.tsx`
- `src/features/ontology/ui/ProfileProposalReviewScreen.tsx`
- `src/__tests__/stage10-architecture-guards.test.ts`

What this implements:

- The Learning Hub route accepts `projectId` from route params and passes it as an explicit prop into `LearningHubScreen`.
- The project viewer exposes a project-owned Learning entry that routes to `/learning` with `projectId`.
- `LearningHubScreen` accepts optional `projectId` and passes it into `ProfileProposalReviewScreen`.
- `ProfileProposalReviewScreen` continues to receive `projectId` through props; no hidden current-project/global selection state was added.
- The Save-as-learning review handoff already passes `store.source?.projectId`; this remains the project-aware Conceptualize path.

What this does not implement:

- no global current-project store
- no project id inference from proposal rows
- no base/core checker targeting
- no target-layer switching
- no branch rename/delete/merge/fork UX

Verification:

- TypeScript clean.
- Focused `profileSelectionDraft`, `useProfileSelection`, `stage10-architecture-guards`, and `stage4-hub-guards` tests: 115/115 passed across 4 files.

## Later Gates

- Target-layer switching outside Doc 39's implemented first branch-local additive proposal -> base/core scope.
- Branch merge / promote-upward flow.
- Base-profile creation and fork UX.
- Multi-base composition.
- Relationship/boundary operation vocabulary and maturity lifecycle.
- Branch comparison and branch impact visualization.
