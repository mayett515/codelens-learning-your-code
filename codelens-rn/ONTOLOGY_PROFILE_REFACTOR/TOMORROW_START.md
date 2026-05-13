# Tomorrow Start

Use this when starting the next orchestrator session.

## Startup Prompt

```text
Read ONTOLOGY_PROFILE_REFACTOR/NEXT_LLM_CONTEXT.md first.
Then read ONTOLOGY_PROFILE_REFACTOR/07_KORTEX_CORE_AND_CHILD_CORES.md, ONTOLOGY_PROFILE_REFACTOR/08_KORTEX_LANGUAGE_LAYER_AND_ADAPTERS.md, ONTOLOGY_PROFILE_REFACTOR/09_KORTEX_OVER_EXISTING_SYSTEMS.md, ONTOLOGY_PROFILE_REFACTOR/10_ACTIVE_PROFILE_RUNTIME_SOURCE_DECISION.md, ONTOLOGY_PROFILE_REFACTOR/11_RUNTIME_PROFILE_COORDINATOR_DECISION.md, ONTOLOGY_PROFILE_REFACTOR/13_BRANCH_OVERLAY_PERSISTENCE_DECISION.md, ONTOLOGY_PROFILE_REFACTOR/14_PROFILE_SELECTION_AND_BRANCH_RESOLUTION_DECISION.md, ONTOLOGY_PROFILE_REFACTOR/15_PROFILE_REGISTRY_AND_PROFILE_SOURCES_DECISION.md, ONTOLOGY_PROFILE_REFACTOR/16_RUNTIME_ACTIVATION_WIRING_DECISION.md, ONTOLOGY_PROFILE_REFACTOR/17_BASE_PROFILE_PERSISTENCE_DECISION.md, ONTOLOGY_PROFILE_REFACTOR/18_ADAPTIVE_SUGGESTION_POLICY_DECISION.md, ONTOLOGY_PROFILE_REFACTOR/19_PATCH_MERGE_PROPOSAL_STORAGE_DECISION.md, ONTOLOGY_PROFILE_REFACTOR/20_CONCEPTUALIZE_PREVIEW_AND_CORRECTION_SURFACE_DECISION.md, ONTOLOGY_PROFILE_REFACTOR/21_CHECKER_PROPOSAL_REVIEW_CONTEXT_AND_APPLY_DECISION.md, ONTOLOGY_PROFILE_REFACTOR/22_CONCEPTUALIZE_FIRST_IMPLEMENTATION_SCOPE_DECISION.md, ONTOLOGY_PROFILE_REFACTOR/23_TRUST_SETTING_STORAGE_DECISION.md, ONTOLOGY_PROFILE_REFACTOR/24_BRANCH_LOCAL_PROPOSAL_APPLY_DECISION.md, ONTOLOGY_PROFILE_REFACTOR/25_PROPOSAL_EVENT_AUDIT_STORAGE_DECISION.md, ONTOLOGY_PROFILE_REFACTOR/06_PROFILE_BRANCHING_AND_MERGE.md, and ONTOLOGY_PROFILE_REFACTOR/implementation_handoff.md.

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
  - active selection context is stored where the mistake happened
  - no `branchId`, `targetLayerId`, or apply target in v1
  - v1 storage is implemented as `ontology_correction_evidence`
  - no checker runtime/UI, patch suggestion table, or auto-apply in this slice

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

Project-scoped profile selection persistence v1 is implemented:
  - migration 013 adds profile_selections
  - one row per project via unique project_id
  - project_id references projects(id) on delete cascade
  - base_profile_id stores the selected base profile
  - project/learning/personal branch id arrays are stored as JSON columns
  - ontology data repo/codec, backup/export/import/clear, and guards are updated
  - no UI selector, global active selection singleton, DB-owned runtime composition, profile/base persistence, MCP, agent runtime, app-builder runtime, or DSL runtime was added

The runtime activation wiring decision is locked and implemented (doc 16):
  - runtime activation wiring is a small application/coordinator layer above screens/services and above low-level repos
  - `runtimeProfileActivation.ts` exposes `resolveRuntimeProfileForProject(input)` plus structured input/result/error types
  - it reads a project/context selection through a caller-supplied store
  - it resolves the base profile through ProfileRegistry
  - it resolves branch ids through ProfileBranchStore
  - it validates missing and wrong-kind branch ids with structured errors
  - it composes via the existing pure selection/runtime profile pipeline
  - it passes only the finished DomainProfile to services
  - missing project selection rows fall back to the coding base
  - no global active profile, DB-owned composed profile, UI selector, MCP, agent runtime, app-builder runtime, or DSL runtime was added

The base profile persistence / user-created cores decision is locked and v1 storage is implemented in doc 17. The profile registry bootstrap v1 is also implemented: `loadPersistedProfileDefinitionSource()` and `loadDefaultProfileRegistry()` load persisted definitions once and expose them as synchronous `ProfileSource` / `ProfileRegistry` values alongside built-in profiles.

The adaptive suggestion policy decision is locked in doc 18:
  - correction evidence stays factual
  - patch suggestions stay separate from evidence
  - default mode is conservative suggest-first
  - manual tag/subtag/relationship creation is allowed through structured validate/preview/apply/audit flow
  - personal layer is `branchKind: 'personal'`
  - relationship changes use the same trust/risk policy as tags and subtags
  - adaptive behavior combines semantic confidence, user-fit confidence, risk score, and trust mode
  - risk overrides trust
  - base/core changes, upward merges, old-data rewrites, agent/app-builder policy, and external write-back always require explicit approval
  - no source code, DB, UI, checker runtime, patch suggestion storage, trust storage, or auto-apply engine was added

The patch/merge proposal storage and review decision is locked in doc 19:
  - patch suggestions, relationship suggestions, branch merge proposals, and manual drafts use one unified `profile_change_proposals` concept
  - product language can still say patch suggestion or merge proposal
  - persistence/review uses one lifecycle and one review shape
  - proposals store source/evidence, explicit target layer, `ProfilePatch`, risk/confidence, and review status
  - `ProfilePatch` is overlay-like diff language without branch identity
  - proposals do not apply themselves
  - apply/merge is explicit and later
  - storage-only v1 is implemented: types/codec/migration/schema/repo/backup/guards/tests
  - no UI, checker runtime, apply service, trust storage, auto-apply, or base-profile versioning was added

The Conceptualize preview and correction-surface decision is locked in doc 20:
  - first correction surface is the Conceptualize preview before final save
  - "save as learning" should grow toward Conceptualize
  - every correction stores mistake-understanding evidence, not only the final corrected label
  - new tag/subtag creation validates against the composed active profile
  - approved new ontology nodes are branch-local by default
  - Conceptualize starts as a safe correction doorway, not the full Kortex ontology editor
  - no source code, UI, checker runtime, apply service, trust storage, auto-apply, old-item backfill, or base/core mutation was added

The checker/proposal/context/apply decision is locked in doc 21:
  - checker output kinds are explanation, evidence, and proposal
  - Conceptualize, checker runs, graph selection chat, repeated-mistake review, and backfill share one proposal/review/apply architecture
  - proposals have review status plus freshness/validity status
  - context assembly is branch/profile-scoped, layered, relevance-ranked, provenance-aware, and preserves contradictions
  - accepted proposals compile to typed Kortex operations after revalidation
  - normal proposal apply is atomic; large backfills are chunked bulk jobs
  - historical undo is an impact-reviewed reversal proposal, not silent time travel
  - no source code, UI, checker runtime, context builder, event store, apply service, undo service, graph chat, agent runtime, app-builder runtime, or DSL runtime was added

The Conceptualize first implementation scope is locked and implemented in doc 22:
  - existing type corrections save immediately and write correction evidence
  - explicit new subtype labels save the corrected type id and create pending profile-change proposals
  - extractor-invented unknown type ids normalize to the active profile default for saving, but correction evidence can preserve the invalid raw id as `rawProposedTypeNodeId`
  - no silent branch overlay mutation, base/core mutation, checker runtime, review UI, apply service, trust storage, backfill, agent runtime, app-builder runtime, or DSL runtime was added

The trust setting storage decision is locked and storage-only v1 is implemented in doc 23:
  - trust settings are user policy, separate from correction evidence and proposals
  - `profile_trust_settings` stores one setting per base profile or profile branch target
  - default mode is `suggest_first`
  - base-profile targets cannot enable auto-apply
  - `manual_only` and `suggest_first` cannot enable auto-apply
  - branch-local future auto-apply is limited to classification, ontology-node, and relationship proposals with strict risk caps
  - model-review hardening preserves existing `id` and `createdAt` on trust-setting upserts by `scopeKey`
  - user-fit learning remains future event/audit projection work, not a field on the setting row
  - no UI, checker runtime, apply service, event/audit store, user-fit projection store, or auto-apply engine was added

The branch-local proposal review/apply decision is locked in doc 24:
  - first proposal apply is explicit and branch-local
  - first review actions are Apply, Reject, Postpone, and Ask why / why not
  - apply revalidates the pending branch-target proposal before mutation
  - apply compiles to typed operations, mutates only the target branch overlay, and marks the proposal accepted/applied atomically
  - confidence means "is Kortex probably right?"
  - risk means "how much could this break if wrong?"
  - user-facing risk copy must describe blast radius, not just show a score
  - edit-then-apply, auto-apply, base/core mutation, upward merge, sibling propagation, old-card backfill, historical undo, and external write-back are future seams
  - first pure helpers are implemented in `branchLocalProposalApply.ts`
  - helpers compile pending branch-target proposals into typed `apply_profile_patch_to_branch_overlay` operations
  - helpers merge `ProfilePatch` into copied branch overlay values and return accepted proposal values
  - the minimal review UI is implemented as a Learning Hub entry plus pending-proposal queue/detail modal
  - Apply / Reject / Postpone are wired through hooks; Ask why / why not is explanation-only
  - model-review hardening added explicit error tone, missing-base-profile mapping, non-branch Apply disablement, branch-key invalidation, and stronger presentation tests
  - no checker runtime, event/audit store, auto-apply engine, base-profile versioning, agent runtime, app-builder runtime, or DSL runtime was added

The remaining open decisions are:
  1. User-fit projection over proposal events.
  2. Context assembly/event/apply implementation sequencing - which context-pack and typed-operation slice ships first.
  3. Base profile versioning - how accepted operations safely target base profiles.
  4. Agent/subagent execution ontology brief.
  5. Self-building-app framework brief.

Recommended next implementation slice, if the human wants code next:

```text
User-fit projection or context assembly slice:
  - proposal review/apply events are now stored as append-only facts
  - next user-fit work should derive signals from those events instead of mutating proposal/trust rows
  - next context work should assemble branch/profile-scoped evidence/proposal context packs without applying changes
  - keep checker runtime, auto-apply, historical undo execution, and base/core mutation out of this slice
```

Strict boundaries:

- no checker execution
- no new profile patch storage shape
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

Default:

- Use Codex directly. The user has dropped Pi/Kimi as the default implementation workflow.
- Do not spawn/delegate unless explicitly approved by the user for a model or harness experiment.

Historical harness notes only:

- Pi/Qwen and Kimi Code CLI have prior accepted slices, but they are no longer the default path.
- If the user explicitly asks for a worker/model experiment, use a strict bounded ticket and keep Codex as reviewer.

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

The correction evidence persistence decision is locked and v1 storage is implemented (doc 12). Evidence-first persistence: correction evidence is stored as a fact, not a mutation. Patch suggestions require user approval and are stored separately as profile change proposals. No automatic ontology/profile mutation. Direct user-authored ontology changes are allowed. Model/checker suggestions require approval. Correction evidence stores active selection context where the mistake happened, but no `branchId`, `targetLayerId`, or apply target in v1. No checker runtime/UI, auto-apply, agent/app-builder runtime, or DSL runtime was added.

The branch/overlay persistence decision is locked and v1 DB plumbing is implemented (doc 13). Persist branch layers separately, not composed runtime profiles. V1 uses `profile_branches` rows with inline `overlay_json`; composition is derived. Active selection, base profile definitions, and correction evidence storage are separate implemented boundaries. Merge proposals stay separate. No UI activation selector, automatic merge, checker runtime, patch suggestion table, merge proposal table, agent/subagent runtime, app-builder runtime, Racket/DSL implementation, or MCP/adapters is implemented.

The project-scoped profile selection persistence slice is implemented. `profile_selections` stores one selection per project: base profile id plus ordered project/learning/personal branch id arrays. The ontology data boundary owns the repo/codec. Backup/export/import/clear supports the table. Runtime composition remains derived and caller-owned; the runtime activation helper can read selections through a caller-supplied store, but no UI route wires this table automatically yet.

The runtime activation wiring decision is locked and implemented (doc 16). The runtime bridge is explicit: project/context -> selection store -> profile registry -> branch store -> pure selection resolver -> pure runtime coordinator -> composed DomainProfile -> service `options.profile`. Repos remain fact storage, services remain dumb in the good way, and no global active profile is introduced.

The domain-only ProfileBranch model is now implemented and tested. `ProfileBranchKind` and `ProfileBranch<TItemTypeNodeId>` live in `types.ts`; `profileBranches.ts` provides pure helpers that convert branches to overlays/grouped activation input/runtime profiles without duplicating composition logic. No DB, migration, storage API, UI selector, automatic merge, correction branch fields, MCP/adapters, agent runtime, app-builder runtime, or DSL runtime was added.

The profile selection and branch resolution decision is locked (doc 14). Branch persistence, active selection, branch resolution, and runtime composition are separate boundaries. `ProfileSelection` is per-context and id-based: one `baseProfileId` plus ordered project/learning/personal branch id arrays. A resolver later turns ids into branch values before the Runtime Profile Coordinator composes the runtime `DomainProfile`. No global active selection singleton, DB, UI, MCP, agent runtime, app-builder runtime, DSL runtime, or multi-base composition is part of this slice.

The domain-only ProfileSelection helper slice is now implemented and tested. `ProfileSelection` lives in `types.ts`; `profileSelection.ts` provides `resolveProfileSelection` and `composeRuntimeDomainProfileFromSelection`. The resolver requires base id match, resolves selected branch ids from caller-provided branch values, throws on missing ids and wrong-kind ids, preserves selection order within each kind, normalizes kind order project -> learning -> personal, and delegates runtime composition through `composeRuntimeDomainProfileFromBranches`. No DB, storage API, profile registry, UI selector, global active selection, MCP, agent runtime, app-builder runtime, DSL runtime, multi-base composition, merge, or promotion logic was added.

The ProfileRegistry/ProfileSource v1 static source helper is implemented (doc 15). Base profiles resolve through a source-based `ProfileRegistry`, separate from `ProfileBranchStore`. The interface leaves room for future built-in/file/DB/adapter sources. V1 implements only static/in-memory profile source helpers. Duplicate profile ids throw structured duplicate-id errors across all sources. Future UI/import/profile-manager flow may catch duplicate errors and ask create new version / rename / replace / merge later / cancel.

The ProfileBranchStore v1 static helper is implemented. `ProfileBranchStore<TItemTypeNodeId>` lives in ontology types, and `createStaticProfileBranchStore({ branches })` lives in `profileBranchStore.ts`. This is in-memory only: it snapshots the branch array at construction, returns branch objects by reference, preserves requested id order, skips missing ids, preserves duplicate requested ids, and lists branches by parent profile in constructor order. No DB, migration, backup, persistent adapter, UI selector, global active selection, automatic merge, MCP/adapters, agent runtime, app-builder runtime, or DSL runtime was added.

Latest source/test verification after trust setting storage: TypeScript clean; targeted trust-setting repo/codec/migration/backup/guard tests 129/129 passed across 5 files; full suite 723/723 passed across 76 files; `git diff --check` clean with CRLF warnings only.

Latest verification after minimal proposal review UI: TypeScript clean; targeted review/apply/proposal/branch/guard tests 101/101 passed across 7 files; full suite 749/749 passed across 80 files; `git diff --check` clean with CRLF warnings only.

Latest docs-only verification after doc 24: `stage10-architecture-guards.test.ts` 55/55 passed; `git diff --check` clean with CRLF warnings only.

Latest doc/source guard verification after proposal storage: `stage10-architecture-guards.test.ts` 53/53 passed.

Latest proposal-storage verification: TypeScript clean; targeted proposal migration/codec/backup/guard tests 121/121 passed across 4 files.

The base profile persistence / user-created cores decision is locked and v1 storage is implemented (doc 17). User-created base profiles are their own durable source, not `profile_branches` and not composed runtime profiles. `profile_definitions` stores full base DomainProfile payloads behind the ontology data boundary, and `createProfileDefinitionSource({ id, definitions })` plugs loaded definitions into ProfileRegistry without changing ProfileRegistry to async. The profile registry bootstrap v1 loads persisted definitions through the ontology data boundary and exposes them as synchronous `ProfileSource` / `ProfileRegistry` values alongside built-in profiles. New domains such as photography, work-notes, or lisp are independent base profiles by default; branches such as night-photography or react specialize one selected base. No UI, automatic LLM creation, duplicate-id resolution UI, checker runtime, MCP, agent runtime, app-builder runtime, or DSL runtime was added.

The adaptive suggestion policy decision is locked (doc 18). Evidence remains factual, suggestions remain separate, the default is conservative suggest-first, and adaptive behavior combines semantic confidence, user-fit confidence, risk score, and trust mode. Risk overrides trust. Personal layer means `branchKind: 'personal'`. Relationship tags/edges use the same policy as tag/subtag changes. Manual ontology creation is allowed, but it should be validated, previewed, target-layered, audited, and undoable. No implementation was added in this docs-only decision.

The patch/merge proposal storage decision is locked and storage-only v1 is implemented (doc 19). Patch suggestions, relationship suggestions, branch merge proposals, and manual drafts share one `profile_change_proposals` table. Proposals store source/evidence, explicit target layer, `ProfilePatch`, risk/confidence, and review status. Proposals do not apply themselves; apply/merge is explicit and later. No review UI, checker runtime, apply service, trust storage, auto-apply, or base-profile versioning was added.

The Conceptualize preview/correction-surface decision is locked (doc 20). The first correction surface is the Conceptualize preview before final save. The preview turns raw input into a draft Kortex learning card; user corrections store mistake-understanding evidence, including what Kortex proposed, what the user corrected, and where the mistake happened. Conceptualize starts as a safe correction doorway, not the full ontology editor.

The checker/proposal/context/apply decision is locked (doc 21). Explanation, evidence, and proposal are separate outputs. Proposal review includes freshness/revalidation. Context assembly is a first-class layer. Accepted proposals compile to typed Kortex operations, not raw patch writes. Normal apply is atomic, large backfills are chunked, and historical undo is an impact-reviewed reversal proposal.

The Conceptualize first implementation scope is locked and implemented (doc 22). Existing type corrections save immediately with evidence. Explicit new subtype labels save the corrected type id and create guarded pending profile-change proposals. Unknown model-generated type ids normalize to the profile default for saving, with the raw invalid id preserved on correction evidence when a correction is written. No silent base/core or branch overlay mutation was added.

The trust setting storage decision is locked and storage-only v1 is implemented (doc 23). Trust settings are separate user policy, not evidence and not proposals. `profile_trust_settings` stores base-profile or branch-target policy with `suggest_first` as default and strictly bounded future auto-apply fields. Model-review hardening preserves existing `id` and `createdAt` on trust-setting upserts by `scopeKey`. User-fit learning remains future event/audit projection work.

The branch-local proposal review/apply decision is locked (doc 24) and the helper/service plus minimal UI slices are implemented. First apply is explicit, branch-local, revalidated, and atomic. First review actions are Apply, Reject, Postpone, and Ask why / why not. `branchLocalProposalApply.ts` compiles pending branch-target proposals into typed operations, merges `ProfilePatch` into copied branch overlay values, and returns accepted proposal values. The service commits branch/proposal updates atomically with conditional writes. The UI exposes a Learning Hub entry and queue/detail modal for pending proposals without edit support. Model-review hardening added explicit error tone, missing-base-profile mapping, non-branch Apply disablement, branch-key invalidation, and stronger presentation tests. It does not mutate base/core profiles, sibling branches, old cards, checker output, or external systems. Risk and confidence are distinct: confidence is likelihood of correctness; risk is blast radius if wrong.

The proposal event audit storage decision is locked and implemented (doc 25). `profile_proposal_events` stores append-only decision facts. Apply / Reject / Postpone insert audit events inside the same guarded transactions as the branch/proposal state changes. If a conditional write conflicts, no event is written. User-fit learning remains a future projection over those events.

Remaining open decisions:

1. User-fit projection over proposal events.
2. Context assembly/event/apply implementation sequencing - which context-pack and typed-operation slice ships first.
3. Base profile versioning - how accepted operations safely target base profiles.
4. Agent/subagent execution ontology brief.
5. Self-building-app framework brief.
