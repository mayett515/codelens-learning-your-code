# Tomorrow Start

Use this when starting the next orchestrator session.

## Startup Prompt

```text
Read ONTOLOGY_PROFILE_REFACTOR/NEXT_LLM_CONTEXT.md first.
Then read ONTOLOGY_PROFILE_REFACTOR/07_KORTEX_CORE_AND_CHILD_CORES.md, ONTOLOGY_PROFILE_REFACTOR/08_KORTEX_LANGUAGE_LAYER_AND_ADAPTERS.md, ONTOLOGY_PROFILE_REFACTOR/09_KORTEX_OVER_EXISTING_SYSTEMS.md, ONTOLOGY_PROFILE_REFACTOR/10_ACTIVE_PROFILE_RUNTIME_SOURCE_DECISION.md, ONTOLOGY_PROFILE_REFACTOR/11_RUNTIME_PROFILE_COORDINATOR_DECISION.md, ONTOLOGY_PROFILE_REFACTOR/13_BRANCH_OVERLAY_PERSISTENCE_DECISION.md, ONTOLOGY_PROFILE_REFACTOR/14_PROFILE_SELECTION_AND_BRANCH_RESOLUTION_DECISION.md, ONTOLOGY_PROFILE_REFACTOR/15_PROFILE_REGISTRY_AND_PROFILE_SOURCES_DECISION.md, ONTOLOGY_PROFILE_REFACTOR/06_PROFILE_BRANCHING_AND_MERGE.md, and ONTOLOGY_PROFILE_REFACTOR/implementation_handoff.md.

We are continuing as orchestrator.
Do not implement until we confirm the next slice.

Summarize:
- current state
- current uncommitted files
- current verification status
- next recommended bounded implementation slice
```

## Expected Next Slice

```text
The A2 decision for prepareSaveCandidates is locked and implemented.
The runtime profile coordinator decision is now locked (doc 11):
  - explicit Runtime Profile Coordinator / Brain Mixer layer above services
  - services receive composed DomainProfile
  - no hidden global active-profile state
  - no persistence/UI selector/agent runtime/app-builder runtime in this slice

The pure coordinator helper module is implemented and tested:
  - runtimeProfileCoordinator.ts is the explicit above-services boundary
  - composeRuntimeDomainProfile(input) delegates to resolveActiveDomainProfileFromActivationInput(input)
  - RuntimeProfileCoordinatorInput aliases ActiveDomainProfileActivationInput
  - services still receive composed DomainProfile
  - no DB, UI, persistence, global store, service hidden lookup,
    activation input in services, branch storage, correction storage,
    MCP/adapters, agent runtime, app-builder runtime, or DSL runtime was added

The correction evidence persistence decision is now locked (doc 12):
  - evidence-first persistence: correction evidence is stored as a fact, not a mutation
  - patch suggestions come later and require user approval
  - no automatic ontology/profile mutation
  - direct user-authored ontology changes are allowed
  - model/checker suggestions require approval
  - no `branchId` / `targetLayerId` until branch persistence exists
  - no checker runtime/UI or DB/migration/source implementation in this slice

The branch/overlay persistence decision is now locked (doc 13):
  - persist branch layers separately, not composed runtime profiles
  - overlays are the durable source; composition is derived
  - merging upward requires approval
  - sibling branches do not affect each other
  - parent profiles stay clean
  - rejected alternatives: store only composed profiles, let child branches mutate parents directly, make everything event-sourced immediately, make branches full profile copies
  - consistent with doc 06 product model, doc 10/A2 runtime source, doc 11 coordinator, doc 12 correction evidence
  - no DB, UI, storage API, automatic merge, or implementation in this slice

The domain-only ProfileBranch model is now implemented and tested:
  - ProfileBranchKind and ProfileBranch<TItemTypeNodeId> live in types.ts
  - profileBranches.ts provides pure branch helpers
  - branch helpers delegate to existing activation/coordinator helpers
  - no DB, migration, storage API, UI selector, automatic merge, correction branch fields,
    MCP/adapters, agent runtime, app-builder runtime, or DSL runtime was added

The profile selection and branch resolution decision is now locked (doc 14):
  - branch persistence, active selection, branch resolution, and runtime composition are separate boundaries
  - ProfileSelection is per-context and id-based
  - v1 selection has one baseProfileId plus ordered project/learning/personal branch id arrays
  - resolver turns selected ids into branch values before runtime composition
  - coordinator stays pure and receives resolved values
  - no global active selection, DB, UI, MCP, agent runtime, app-builder runtime, DSL runtime, or multi-base composition in this slice

The domain-only ProfileSelection helper slice is implemented and tested:
  - ProfileSelection lives in types.ts
  - profileSelection.ts provides resolveProfileSelection and composeRuntimeDomainProfileFromSelection
  - selected branch ids resolve from caller-provided branch values
  - missing ids, base id mismatch, and wrong-kind ids throw
  - order within kind follows selection arrays; kind order normalizes project -> learning -> personal
  - composition delegates through existing branch/coordinator helpers
  - no DB, storage API, profile registry, UI selector, global active selection, MCP, agent runtime, app-builder runtime, DSL runtime, multi-base composition, merge, or promotion logic was added

The ProfileRegistry/ProfileSource v1 static source helper is implemented (doc 15):
  - base profiles should resolve through a source-based ProfileRegistry
  - ProfileRegistry is separate from ProfileBranchStore
  - future sources may include built-in, file, DB, and adapter sources
  - v1 implements only static/in-memory profile source helpers
  - duplicate profile ids throw structured duplicate-id errors across all sources
  - future UI/import/profile-manager flow may catch duplicate errors and ask create new version / rename / replace / merge later / cancel
  - no DB, file source, adapter source, UI, global active registry, MCP, agent runtime, app-builder runtime, DSL runtime, branch persistence, active selection changes, service changes, or automatic versioning was added

The ProfileBranchStore v1 static helper is implemented:
  - branch storage is a separate seam from ProfileRegistry and ProfileSelection
  - v1 implements only `createStaticProfileBranchStore({ branches })`
  - the store snapshots the branch array at construction
  - returned branch objects stay by reference
  - no DB, migration, backup, persistent adapter, UI selector, global active selection, or automatic merge was added

The remaining open decisions are:
  1. Branch selection and activation persistence - how selected branch ids are stored per context.
  2. Profile persistence / user-created base profile storage, later.
  3. Merge proposal storage and review UI - how merge proposals are stored, presented, and approved/rejected/postponed.
  4. Correction storage implementation - DB/migration/store for profileId-only OntologyCorrectionEvidence; branch-targeted correction fields can come later now that branch persistence exists.
  5. Checker runtime and approval UI - patch suggestion generation and review.
  6. Agent/subagent execution ontology brief.
  7. Self-building-app framework brief.
```

Strict boundaries:

- no DB
- no UI
- no persistence
- no export UI
- no checker execution
- no profile patch storage
- no automatic ontology or profile mutation

## Product Direction To Preserve

Kortex Core is the ontology/graph/versioned reasoning system. CodeLens/coding is the first serious
child core/wrapper around it, not the boundary of the whole system.

Kortex profile branching model:

```text
Kortex Core
  -> coding child core / wrapper
      -> base profile for this lineage
          -> profile branch
              -> project / learning / personal overlay
                  -> correction evidence / patch suggestions
```

Important nuance:

```text
"Core" means immutable inside one profile lineage.
It does not mean globally fixed forever.
A fork/user can later create a different ground-zero base profile.
```

Runtime precedence:

```text
personal corrections > active project/learning overlay > base profile
```

Branches are branch-only by default. Merge back into a parent profile requires explicit user approval.

Relationship-semantics caution:

```text
Current compatibility shape: prerequisite / related / contrast.
Newer product direction: is / is not boundary anchors plus dynamic profile/user/LLM-created relationship labels.
Do not hardcode a global final relationship taxonomy in the next slice.
```

Language-layer caution:

```text
TypeScript remains the current implementation path.
Racket is a plausible future language/DSL layer, not a rewrite target for this branch.
Design pure helpers as steps toward serializable, validated core operations that adapters can call later.
```

Overlay caution:

```text
Kortex can later sit over existing systems through read/write/sync adapters.
The default is non-destructive: understand first, write back only by explicit approval/policy.
Do not build adapters, source sync, static analysis, file watchers, MCP, or write-back in the next slice.
```

Agent/subagent execution-ontology caution:

```text
Kortex can later wrap agents/subagents with ontology-backed execution policy.
Tags/subtags can define behavior and Ausfuehrung/execution constraints.
is / is not can define hard boundaries.
extends can inherit agent policy from parent cores.
Allowed/forbidden operations and approval gates should be structured policy, not only prompt text.
Do not build orchestration, permission enforcement, MCP policy tools, or subagent runtime in the next slice.
```

Self-building-app framework caution:

```text
Kortex can later be the ontology/coherence framework behind self-building apps.
User intent becomes a project app core.
Domain entities, workflows, screens, schema/API/UI/test responsibilities become ontology and child/subagent cores.
Generated code should stay tied to correctable graph state.
Do not build app-builder runtime, code-generation orchestration, generated-app persistence, or source write-back in the next slice.
```

## Worker Recommendation

If delegating through Pi:

- Prefer Qwen 3.6 Plus for TypeScript API/composition shape work.
- Kimi K2.6 is also acceptable for strict bounded profile/refactor slices.
- Use a strict bounded ticket.
- Do not spawn/delegate unless explicitly approved by the user.

If delegating through Kimi Code CLI:

- Treat it as a separate CLI harness from Pi, not as a Pi model.
- It is currently accepted for strict bounded in-memory/domain helper seams after the architecture is locked.
- Require ASCII-only final reports on Windows; the first Kimi Code CLI run produced usable code but crashed while printing a Unicode final-report character.
- Do not use Kimi Code CLI for DB, migration, backup, restore, or persistence slices until that harness/model tuple earns trust there.

After reviewing a worker result, update `C:\pi-stuff`:

- `model_hr_db.json`
- `hr_findings_viewer.html`
- `HR_DATABASE.md` if trust summary changes
- `hrworkflow.md` if model notes change
- `FUTURE_PI_PROMPTING.md` if there is a reusable prompt lesson

Validate both JSON sources:

```powershell
node -e "JSON.parse(require('fs').readFileSync('model_hr_db.json','utf8')); console.log('model_hr_db.json valid')"
```

```powershell
@'
const fs = require('fs');
const html = fs.readFileSync('hr_findings_viewer.html', 'utf8');
const marker = '<script type="application/json" id="hr-data">';
const start = html.indexOf(marker);
const end = html.indexOf('</script>', start);
if (start < 0 || end < 0) throw new Error('embedded db marker missing');
const db = JSON.parse(html.slice(start + marker.length, end).trim());
console.log('viewer db valid', db.evaluations.length, db.evaluations.at(-1)?.id, db.evaluations.at(-1)?.score);
'@ | node -
```

## Current Human Decision

The A2 decision for `prepareSaveCandidates` is locked and implemented. The service receives an optional composed `DomainProfile` through `options.profile`, not branch ingredients. Default behavior stays `getActiveDomainProfile()` with the coding profile. A1 (passing `ActiveDomainProfileActivationInput` into `prepareSaveCandidates`) was explicitly rejected for this service. Composition belongs elsewhere.

The runtime profile coordinator decision is locked (doc 11). The coordinator helper is now implemented and tested: `runtimeProfileCoordinator.ts` is the explicit above-services coordinator boundary. `composeRuntimeDomainProfile(input)` delegates to `resolveActiveDomainProfileFromActivationInput(input)`. `RuntimeProfileCoordinatorInput` aliases `ActiveDomainProfileActivationInput`. Services still receive composed `DomainProfile`; they do not call this helper directly unless their caller passes the result. No DB, UI, persistence, global store, service hidden lookup, agent runtime, app-builder runtime, or DSL runtime was added.

The correction evidence persistence decision is locked (doc 12). Evidence-first persistence: correction evidence is stored as a fact, not a mutation. Patch suggestions come later and require user approval. No automatic ontology/profile mutation. Direct user-authored ontology changes are allowed. Model/checker suggestions require approval. No `branchId` or `targetLayerId` until branch persistence exists. No checker runtime/UI, no DB/migration/source implementation, no auto-apply, no agent/app-builder runtime in this slice.

The branch/overlay persistence decision is locked and v1 DB plumbing is implemented (doc 13). Persist branch layers separately, not composed runtime profiles. V1 uses `profile_branches` rows with inline `overlay_json`; composition is derived. Active selection and merge proposals stay separate. No UI activation selector, automatic merge, checker runtime, patch suggestion table, correction storage, agent/subagent runtime, app-builder runtime, Racket/DSL implementation, or MCP/adapters is implemented.

The domain-only ProfileBranch model is now implemented and tested. `ProfileBranchKind` and `ProfileBranch<TItemTypeNodeId>` live in `types.ts`; `profileBranches.ts` provides pure helpers that convert branches to overlays/grouped activation input/runtime profiles without duplicating composition logic. No DB, migration, storage API, UI selector, automatic merge, correction branch fields, MCP/adapters, agent runtime, app-builder runtime, or DSL runtime was added.

The profile selection and branch resolution decision is locked (doc 14). Branch persistence, active selection, branch resolution, and runtime composition are separate boundaries. `ProfileSelection` is per-context and id-based: one `baseProfileId` plus ordered project/learning/personal branch id arrays. A resolver later turns ids into branch values before the Runtime Profile Coordinator composes the runtime `DomainProfile`. No global active selection singleton, DB, UI, MCP, agent runtime, app-builder runtime, DSL runtime, or multi-base composition is part of this slice.

The domain-only ProfileSelection helper slice is now implemented and tested. `ProfileSelection` lives in `types.ts`; `profileSelection.ts` provides `resolveProfileSelection` and `composeRuntimeDomainProfileFromSelection`. The resolver requires base id match, resolves selected branch ids from caller-provided branch values, throws on missing ids and wrong-kind ids, preserves selection order within each kind, normalizes kind order project -> learning -> personal, and delegates runtime composition through `composeRuntimeDomainProfileFromBranches`. No DB, storage API, profile registry, UI selector, global active selection, MCP, agent runtime, app-builder runtime, DSL runtime, multi-base composition, merge, or promotion logic was added.

The ProfileRegistry/ProfileSource v1 static source helper is implemented (doc 15). Base profiles resolve through a source-based `ProfileRegistry`, separate from `ProfileBranchStore`. The interface leaves room for future built-in/file/DB/adapter sources. V1 implements only static/in-memory profile source helpers. Duplicate profile ids throw structured duplicate-id errors across all sources. Future UI/import/profile-manager flow may catch duplicate errors and ask create new version / rename / replace / merge later / cancel.

The ProfileBranchStore v1 static helper is implemented. `ProfileBranchStore<TItemTypeNodeId>` lives in ontology types, and `createStaticProfileBranchStore({ branches })` lives in `profileBranchStore.ts`. This is in-memory only: it snapshots the branch array at construction, returns branch objects by reference, preserves requested id order, skips missing ids, preserves duplicate requested ids, and lists branches by parent profile in constructor order. No DB, migration, backup, persistent adapter, UI selector, global active selection, automatic merge, MCP/adapters, agent runtime, app-builder runtime, or DSL runtime was added.

Latest source/test verification after Kimi Code CLI Slice 1: TypeScript clean; targeted branch-store/branch/selection tests 53/53 passed across 3 files; full suite 540/540 passed across 58 files; forbidden-name rg clean for profileBranchStore source/test; non-ASCII rg clean for profileBranchStore source/test; `git diff --check` clean for Kimi-touched files with CRLF warnings only.

Remaining open decisions:

1. Branch selection and activation persistence - how selected branch ids are stored per context.
2. Profile persistence / user-created base profile storage, later.
3. Merge proposal storage and review UI - how merge proposals are stored, presented, and approved/rejected/postponed.
4. Correction storage implementation - DB/migration/store for profileId-only OntologyCorrectionEvidence; branch-targeted correction fields can come later now that branch persistence exists.
5. Checker runtime and approval UI - patch suggestion generation and review.
6. Agent/subagent execution ontology brief.
7. Self-building-app framework brief.
