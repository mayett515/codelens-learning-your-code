# Runtime Activation Wiring Decision

**Status:** Locked decision on 2026-05-10.
**Branch:** `refactor/ontology-profile`

## Locked Decision

Runtime activation wiring is a small application/coordinator layer above screens and services.

It loads the selected ingredients for one runtime context, then calls the existing pure composition helpers.

In plain terms:

```text
project id / explicit runtime context
  -> load project profile selection
  -> load selected base profile from ProfileRegistry
  -> load selected branches from ProfileBranchStore
  -> resolve selection into concrete branch values
  -> compose runtime DomainProfile
  -> pass finished DomainProfile to services
```

The wiring layer is allowed to be async and data-aware.

The Runtime Profile Coordinator remains pure.

The DB repos remain fact storage.

Services still receive only the finished/composed `DomainProfile`.

## Why This Layer Exists

After docs 13 and 14, the system has the durable ingredients:

```text
profile_branches
  durable branch layers

profile_selections
  one project-scoped selection:
    baseProfileId
    projectBranchIds
    learningBranchIds
    personalBranchIds

ProfileRegistry
  resolves base profile ids into base profile values

ProfileBranchStore
  resolves branch ids into branch values

Runtime Profile Coordinator
  composes resolved values into a runtime profile
```

What is still missing is the application wiring that says:

```text
For this project/use/context, build the actual brain now.
```

That wiring should be explicit. It should not be hidden inside services, repositories, global state, or UI components.

## Responsibility Split

### Project Profile Selection Repo / Store

Owns persisted selection facts.

It answers:

```text
What did this project select?
```

It does not:

- Load base profile values
- Load branch values
- Compose runtime profiles
- Decide fallback policy beyond returning no row
- Own UI state
- Own merge semantics
- Persist composed runtime profiles

### ProfileRegistry

Owns base profile lookup.

It answers:

```text
What base profile does this baseProfileId mean?
```

It does not:

- Know which project is active
- Read project selections
- Read branch rows
- Compose runtime profiles
- Persist user-created profiles yet

### ProfileBranchStore

Owns branch lookup.

It answers:

```text
What branch values do these branch ids mean?
Which branches exist under this parent profile?
```

It does not:

- Decide which branches are active
- Compose runtime profiles
- Read project selection rows
- Merge branches upward
- Mutate parent profiles

### Runtime Activation Wiring

Owns loading ingredients for one runtime context.

It answers:

```text
Given this context, which finished DomainProfile should the app use now?
```

It may:

- Read a project-scoped selection
- Use default selection when no row exists
- Ask `ProfileRegistry` for the base profile
- Ask `ProfileBranchStore` for selected branch values
- Call `composeRuntimeDomainProfileFromSelection`
- Return a composed `DomainProfile`
- Return trace/provenance data later if useful

It must not:

- Store global active profile state
- Persist composed runtime profiles as truth
- Mutate branches or parent profiles
- Auto-merge anything
- Decide correction/checker policy
- Be hidden inside low-level repos
- Be hidden inside services like `prepareSaveCandidates`

### Runtime Profile Coordinator

Stays pure.

It receives values that are already loaded:

```text
baseProfile
branches / overlays
```

It does not:

- Read DB
- Read stores
- Know about project ids
- Know about UI routes
- Know about MCP, CLI, agent, or app-builder callers

### Services

Keep the A2 rule from doc 10:

```text
service(options.profile?: DomainProfile)
```

Services do not receive:

- `ProfileSelection`
- branch ids
- branch stores
- profile registries
- project ids for profile activation
- grouped activation input
- global active profile state

They receive the finished/composed brain.

## V1 Runtime Shape

The first implementation should be small and explicit.

Recommended pure-ish public shape:

```text
resolveRuntimeProfileForProject({
  projectId,
  selectionStore,
  profileRegistry,
  branchStore,
  defaultBaseProfileId,
})
  -> DomainProfile
```

or, if provenance is useful immediately:

```text
resolveRuntimeProfileForProject(...)
  -> {
       profile: DomainProfile,
       selection: ProfileSelection,
       baseProfile: DomainProfile,
       branches: ProfileBranch[]
     }
```

The second shape is better for debugging, tests, future UI explanation, MCP traces, and agent handoffs.

## Default Selection Policy

If a project has no `profile_selections` row, v1 should use a default selection:

```text
{
  baseProfileId: 'coding'
}
```

Reason:

- existing CodeLens behavior must keep working
- old projects will not have selection rows
- missing selection is not corruption
- coding is the current first child core

This fallback belongs in the runtime activation wiring layer, not in the low-level selection repo.

## Invalid Selection Policy

Missing selection row:

```text
fallback to default base profile
```

Missing base profile id:

```text
throw structured activation error
```

Missing selected branch id:

```text
throw structured activation error
```

Wrong-kind branch id:

```text
throw structured activation error
```

The app can later catch these and offer repair UI:

```text
use default coding profile
remove missing branch from selection
create new branch
create new base profile version
cancel
```

But the activation layer should not silently erase bad references.

## Where The Code Should Live Later

Preferred future source module:

```text
src/features/ontology/runtimeProfileActivation.ts
```

This module should depend on interfaces/types, not concrete DB repos.

Concrete DB-backed adapters stay under:

```text
src/features/ontology/data/
```

The root ontology barrel may export the pure/interface-based runtime activation helper only if it does not import `db/client`.

Do not export DB-backed repos from:

```text
src/features/ontology/index.ts
```

That would leak native database dependencies into pure ontology imports and tests.

## Why Not Put This In The Repos

Rejected:

```text
profileSelectionRepo.getRuntimeProfileForProject(projectId)
```

Because:

- a repo should store and retrieve facts
- runtime profile composition is not a DB concern
- base profiles may later come from built-in/file/DB/adapter sources
- branch stores may later be static, DB-backed, file-backed, or MCP-backed
- tests become harder if DB repos own the whole activation path
- it risks turning persistence into hidden runtime state

## Why Not Put This In Services

Rejected:

```text
prepareSaveCandidates({ projectId })
```

or:

```text
prepareSaveCandidates({ selection, branchStore, registry })
```

Because doc 10 already locked A2:

```text
services receive composed DomainProfile
```

Services should not know where the brain came from.

## Why Not Put This In UI Screens

Rejected as the long-term owner:

```text
ProjectScreen loads selection, registry, branches, and composes profile itself
```

Screens can call the activation wiring layer, but they should not own the composition pipeline.

Reasons:

- MCP calls need the same behavior
- CLI commands need the same behavior
- agent/subagent tasks need the same behavior
- tests need the same behavior without React
- putting it in screens makes the Kortex runtime shape depend on CodeLens UI

## Why Not Global Active Profile State

Rejected:

```text
setActiveRuntimeProfile(projectId)
getActiveRuntimeProfile()
useActiveRuntimeProfile()
```

Because:

- two project contexts may be active at once
- compare mode may need two profiles at once
- MCP/agent calls may run concurrently
- tests become order-sensitive
- hidden state breaks the explicit data lineage

The active brain is contextual, not process-global.

## Relationship To Existing Decisions

- **Doc 10:** services receive composed `DomainProfile`; this decision keeps that rule.
- **Doc 11:** Runtime Profile Coordinator is pure; this decision keeps DB/store reads outside the coordinator.
- **Doc 13:** branch rows are durable source; this decision reads branches, then derives runtime profiles.
- **Doc 14:** selections are id-based and resolved before composition; this decision defines where that happens in the app runtime.
- **Doc 15:** base profiles resolve through a `ProfileRegistry`; this decision uses that registry instead of hardcoding base profile values.

## First Implementation Slice After This Decision

Recommended next code slice:

```text
src/features/ontology/runtimeProfileActivation.ts
```

Add:

```text
ProjectRuntimeProfileActivationInput
ProjectRuntimeProfileActivationResult
resolveRuntimeProfileForProject(input)
RuntimeProfileActivationError
```

Use only interfaces and caller-supplied stores:

```text
selectionStore.getProjectProfileSelectionByProjectId(projectId)
profileRegistry.getProfile(baseProfileId)
branchStore.getBranchesByIds(ids)
composeRuntimeDomainProfileFromSelection(...)
```

Tests should prove:

- no selection row falls back to coding base
- persisted selection loads base and selected branches
- project/learning/personal branch id order is preserved
- missing base profile throws structured error
- missing branch id throws structured error
- wrong-kind branch id still throws through selection resolution
- services are not imported
- DB client is not imported
- no global active profile state strings appear

Do not implement in that first code slice:

- UI selector
- project settings screen
- branch creation UI
- correction storage
- checker runtime
- merge proposals
- profile/base persistence
- MCP tool
- CLI command
- agent runtime
- app-builder runtime
- Racket/DSL runtime

## Future Extensions

Later this layer can grow into:

- app-level project runtime profile loader
- MCP runtime profile resolver
- CLI runtime profile resolver
- agent/subagent execution profile resolver
- compare-mode dual profile resolver
- trace/provenance reporting for why a profile contains a node/rule
- repair UI for invalid selections
- cache layer for performance, with base+branches+selection still remaining truth

But v1 should stay small.

## Summary

The next runtime bridge is:

```text
project/context
  -> selection store
  -> profile registry
  -> branch store
  -> pure selection resolver
  -> pure runtime coordinator
  -> composed DomainProfile
  -> service options.profile
```

This keeps persistence factual, composition pure, services simple, and future Kortex runtimes reusable outside CodeLens UI.
