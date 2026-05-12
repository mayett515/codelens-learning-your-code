# Profile Selection And Branch Resolution Decision

**Status:** Locked decision on 2026-05-08.
**Branch:** `refactor/ontology-profile`

## Locked Decision

Branch persistence, active selection, branch resolution, and runtime composition are separate boundaries.

In plain terms:

```text
ProfileBranchStore
  stores branch layers

ProfileSelection
  says which base profile and branch ids are selected for one context

ProfileSelectionResolver
  loads selected branch ids into branch values

Runtime Profile Coordinator
  composes the resolved base profile and branches into a runtime DomainProfile

Services
  receive only the composed DomainProfile
```

The active brain is not global. It is selected per context.

Examples of contexts:

```text
App screen
MCP tool call
CLI command
agent task
subagent task
project config
comparison view
test case
```

## Core Shape

The first durable selection shape should be id-based:

```text
ProfileSelection
  id?: string
  baseProfileId: string
  projectBranchIds?: string[]
  learningBranchIds?: string[]
  personalBranchIds?: string[]
```

Example:

```text
baseProfileId: photography
projectBranchIds: [wedding-shoot-2026]
learningBranchIds: [night-photography]
personalBranchIds: [my-fuji-workflow]
```

This means:

```text
Photography base profile
  + wedding shoot project branch
  + night photography learning branch
  + personal Fuji workflow branch
  -> composed runtime DomainProfile
```

The selection stores branch ids, not full branch objects.

## Boundary Responsibilities

### ProfileBranchStore

Stores and retrieves durable branch layers.

It may later expose:

```text
getBranch(id)
listBranchesByParent(parentProfileId)
listBranchesByKind(branchKind)
createBranch(branch)
updateBranch(branch)
deleteBranch(id)
```

The store does not:

- Decide which branches are active
- Compose runtime profiles
- Own merge semantics
- Own UI state
- Own MCP, CLI, agent, or app-builder behavior
- Persist composed runtime profiles as canonical truth

### ProfileSelection

Represents one caller-owned selection for one context.

It answers:

```text
Which base profile should this operation use?
Which project branches should be included?
Which learning branches should be included?
Which personal branches should be included?
In what order?
```

The selection does not contain full branch objects. It contains ids. This keeps it serializable for UI routes, MCP requests, agent envelopes, project config, tests, and future DSL operations.

### ProfileSelectionResolver

Turns an id-based selection into value-based coordinator input.

Conceptually:

```text
resolveProfileSelection(selection, registry/store)
  -> baseProfile
  -> projectBranches
  -> learningBranches
  -> personalBranches
```

The resolver is the bridge between persisted identity and pure runtime composition.

It may read from a profile registry and branch store later. In the first implementation slice, it should stay domain-only and use caller-provided maps or lookup functions. No DB implementation is part of this decision.

### Runtime Profile Coordinator

Receives resolved values and composes a runtime `DomainProfile`.

It does not know:

- Which screen is active
- Which user selected the branches
- Where branches are stored
- Whether the caller is UI, CLI, MCP, or an agent
- Whether the profile is coding, photography, music, game design, or another domain

### Services

Services keep the A2 rule:

```text
service(options.profile?: DomainProfile)
```

They receive the finished/composed brain. They do not receive `ProfileSelection`, branch ids, branch stores, grouped activation input, or global active state.

## Why This Decision Is Correct

1. **It keeps Kortex generic.** A photography profile, coding profile, music profile, or game-design profile can all use the same selection and resolution boundary.

2. **It preserves provenance.** Branch layers stay separate. The runtime profile is derived. Later UI/MCP/compare flows can explain where a node or rule came from.

3. **It avoids hidden global state.** There is no single global active branch selection. Two contexts can compose different brains at the same time.

4. **It keeps services simple.** Services do not need to know why a profile has certain nodes. They only operate with the profile they receive.

5. **It matches the branch persistence decision.** Doc 13 says overlays are the durable source and composed runtime profiles are derived. Id-based selection is the missing selection layer on top of that.

6. **It supports future MCP and agents.** MCP tool calls and agent tasks can carry a small serializable selection object instead of relying on process-global state.

7. **It supports future DSL operations.** A Racket/Kortex DSL can compile to explicit selection and operation values, not hidden runtime mutation.

## Precedence And Ordering

Runtime composition precedence stays:

```text
personal overlay
  > learning overlay
    > project overlay
      > base profile
```

Later overlays of the same kind win deterministically.

Because same-kind order matters, `ProfileSelection` must use ordered arrays, not unordered sets.

Example:

```text
projectBranchIds: [project-base, project-experiment]
```

`project-experiment` wins over `project-base` for same-kind conflicts.

## One Base Profile In V1

Each `ProfileSelection` has exactly one base profile in v1.

Rejected for v1:

```text
baseProfileIds: [photography, writing]
```

Multi-base composition is powerful but not first. It creates harder questions:

- What happens when two bases define the same node id differently?
- Which base owns graph labels?
- Which relationship taxonomy wins?
- How are incompatible `is not` boundaries reconciled?

Single-base selection is enough for:

```text
Photography + Night Photography branch
Coding + React branch
Music Theory + Jazz Harmony branch
Game Design + Combat System branch
```

Multi-base composition can be a later explicit decision.

## What This Decision Is Not

This decision originally did not implement:

- No DB table or migration for branches (implemented later by the branch persistence slice)
- No DB table or migration for profile selections (implemented later by the project-scoped persistence slice)
- No storage implementation (implemented later for project-scoped selections only)
- No UI branch selector
- No global active selection store
- No AsyncStorage/Zustand/store state
- No MCP server or adapter
- No CLI selection command
- No agent/subagent runtime
- No app-builder runtime
- No proposal review UI or apply/merge service
- No automatic merge or promotion
- No correction evidence `branchId` or `targetLayerId`
- No Racket/DSL runtime
- No multi-base profile composition

## Rejected Alternatives

### 1. Store full branch objects inside selection

Rejected because:

- Selections become large and harder to serialize
- MCP/agent/CLI envelopes become noisy
- Every caller must load branch values before it can express intent
- Comparing selections becomes harder
- Caching and audit logs become less clear

The better shape is:

```text
selection stores ids
resolver loads values
coordinator composes values
```

### 2. Let the coordinator load from the store

Rejected because:

- It breaks the pure coordinator boundary from doc 11
- It couples runtime composition to persistence
- It hides which branch data produced the runtime profile
- It makes tests and future MCP/tool calls less deterministic

### 3. Add a global active selection singleton

Rejected because:

- MCP calls may run in parallel with different selections
- Agent/subagent tasks may each need different child cores
- Compare mode needs two selections at once
- Tests become order-sensitive
- Hidden state recreates the problem docs 10 and 11 avoided

Do not add:

```text
getActiveSelection()
setActiveSelection()
useActiveSelection()
currentSelection
activeSelectionStore
```

### 4. Persist composed runtime profiles as canonical truth

Rejected by doc 13 and repeated here because selection makes it tempting.

The composed profile may be cached later as a performance optimization, but the cache is not truth. The truth is:

```text
base profile + branch layers + selection
```

### 5. Implement multi-base composition now

Rejected for v1 because it expands the merge/conflict model too early.

Single-base plus branches is the stable path.

## Relationship To Existing Decisions

- **Doc 06** defines product-level branching and merge semantics.
- **Doc 10** locks A2: services receive a composed `DomainProfile`, not activation input.
- **Doc 11** locks the Runtime Profile Coordinator as an explicit layer above services.
- **Doc 12** locks correction evidence as evidence-first, with no automatic mutation.
- **Doc 13** locks branch overlays as durable source and composed runtime profiles as derived.

This decision adds the missing layer between branch storage and runtime composition:

```text
id-based selection
  -> branch resolution
  -> runtime composition
```

## Implementation Direction

The next TypeScript slice should be domain-only:

```text
types.ts
  add ProfileSelection type

profileSelection.ts
  add pure helpers that convert id-based selection + provided branch values/lookups
  into existing branch/coordinator input

profileSelection.test.ts
  prove order, immutability, strict missing-id behavior, no hidden state,
  and equivalence with composeRuntimeDomainProfileFromBranches
```

The first implementation should not read actual DB or app storage.

The first implementation can use explicit caller-provided values:

```text
resolveProfileSelection({
  selection,
  baseProfile,
  branches,
})
```

or caller-provided lookup functions:

```text
resolveProfileSelection({
  selection,
  getBaseProfile,
  getBranch,
})
```

Prefer the simplest pure shape first. Persistence adapters can wrap it later.

## Current Implementation

The first domain-only selection helper slice is now implemented and tested:

```text
src/features/ontology/types.ts
  - ProfileSelection

src/features/ontology/profileSelection.ts
  - ResolvedProfileSelection<TItemTypeNodeId>
  - resolveProfileSelection(input)
  - composeRuntimeDomainProfileFromSelection(input)

src/features/ontology/__tests__/profileSelection.test.ts
  - 19 focused tests

src/features/ontology/index.ts
  - exports ProfileSelection, ResolvedProfileSelection,
    resolveProfileSelection, and composeRuntimeDomainProfileFromSelection
```

Current behavior:

- `ProfileSelection` stores one `baseProfileId` plus ordered project/learning/personal branch id arrays.
- `resolveProfileSelection` requires `selection.baseProfileId === baseProfile.id`.
- Selected branch ids are resolved from a caller-provided branch array.
- Missing branch ids throw.
- Branch ids listed under the wrong kind throw.
- Resolved branches are returned in normalized kind order: project, learning, personal.
- Order within each kind follows the selection arrays, not the provided branch array order.
- `composeRuntimeDomainProfileFromSelection` delegates to `composeRuntimeDomainProfileFromBranches`, so composition stays on the existing branch/coordinator pipeline.
- Empty selections return the base profile by reference through existing branch helper behavior.
- Frozen inputs are accepted without mutation.

The project-scoped selection persistence slice is now also implemented:

```text
src/db/migrations/013-profile-selections.ts
  - profile_selections table
  - one row per project via unique project_id
  - project_id references projects(id) on delete cascade
  - base_profile_id
  - ordered project/learning/personal branch id arrays as JSON columns

src/features/ontology/codecs/profileSelection.ts
  - validateProjectProfileSelection
  - rowToProjectProfileSelection
  - projectProfileSelectionToRow

src/features/ontology/data/profileSelectionRepo.ts
  - insertProjectProfileSelection
  - upsertProjectProfileSelection
  - getProjectProfileSelectionById
  - getProjectProfileSelectionByProjectId
  - deleteProjectProfileSelectionForProject
```

This is storage plumbing only. It does not make a global active selection, does not compose runtime profiles from DB by itself, and does not add UI.

Verification after implementation:

```text
TypeScript clean.
targeted selection/branch/coordinator/activation tests: 77/77 passed across 4 files.
full suite: 502/502 passed across 56 files.
forbidden state/persistence/runtime term check: clean for profileSelection source/test.
non-ASCII check: clean for profileSelection source/test and doc 14.
git diff --check: clean with CRLF warnings only.
```

Still not implemented:

- No profile registry changes
- No UI selector
- No global active selection store
- No MCP, CLI, agent runtime, app-builder runtime, or DSL runtime
- No multi-base composition
- No merge or promotion logic

## Model Recommendation

Decision/review:

```text
Codex / GPT-5
```

TypeScript helper worker:

```text
opencode-go/qwen3.6-plus with --thinking high
```

Guard/docs worker:

```text
opencode-go/glm-5.1 with --thinking high
```

## Next Open Decisions

Status update after later slices:

1. Pure selection resolution is implemented.
2. Branch/overlay DB persistence is implemented.
3. Profile registry and base profile definition persistence are implemented.
4. Correction evidence persistence is implemented as evidence-only storage.
5. Adaptive suggestion policy is locked in doc 18.
6. Patch/merge proposal storage decision is locked in doc 19 and storage-only v1 is implemented.
7. First correction/proposal UI surface remains open.
8. Checker runtime and approval UI remain open.
9. Trust setting storage remains open.
10. Proposal apply/base-versioning semantics remain open.
11. Agent/subagent execution ontology brief remains open.
12. Self-building-app framework brief remains open.
