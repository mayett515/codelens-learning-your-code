# Branch/Overlay Persistence Decision

**Status:** Locked persistence model on 2026-05-07. V1 table shape locked and implemented on 2026-05-10.
**Branch:** `refactor/ontology-profile`

## Locked Decision

Persist branch layers separately. Do not persist composed runtime profiles as source of truth.

In plain terms:

```text
Parent profile stays clean.
Child branch extends it.
Runtime composes them.
Merging upward requires approval.
```

Core shape:

```text
Base profile
  -> branch
      -> overlay changes
          -> runtime composed profile
```

The persisted branch/overlay is the durable source. The composed runtime profile is derived.

## V1 DB Shape Decision

V1 persists branch containers as rows. Each branch row owns exactly one inline overlay JSON payload.

```text
profile_branches
  id TEXT PRIMARY KEY
  parent_profile_id TEXT NOT NULL
  branch_kind TEXT NOT NULL CHECK(branch_kind IN ('project','learning','personal'))
  name TEXT NOT NULL
  overlay_json TEXT NOT NULL
  created_at INTEGER NOT NULL
  updated_at INTEGER NOT NULL
```

This means:

- `ProfileBranch` is the durable container: identity, parent reference, kind, name, timestamps.
- `ProfileOverlay` is the actual diff/change set inside that container.
- `overlay_json` stores the branch's one overlay.
- Runtime composition reads selected branch rows, extracts overlays, and composes them with the base profile.
- The composed runtime `DomainProfile` is never stored as source of truth.

V1 does not create separate `profile_overlays`, `active_profile_selection`, or `profile_merge_proposals` tables.

## V1 Implementation Note

Implemented on 2026-05-10:

- Migration `012-profile-branches`
- Drizzle `profileBranches` schema
- Ontology data-boundary repo and codec under `src/features/ontology/data` and `src/features/ontology/codecs`
- Backup export/import/clear/column-map support
- Architecture guards that allow only `profile_branches` in the planned persistence boundary and keep composed runtime profiles, active selections, standalone overlay tables, and merge proposals out of v1

The DB-backed repo is intentionally not exported from the root ontology barrel. Pure ontology imports must not pull in `db/client` or native SQLite dependencies.

## Definitions

- **Parent profile:** The profile/layer a branch extends. In this app lineage, the current base is the coding profile.
- **Branch:** A durable child layer with identity, parent reference, and branch kind.
- **Overlay:** The actual set of changes inside a branch/layer. An overlay adds or overrides ontology nodes, tags, relationship labels, examples, metadata fields, and boundary rules on top of its parent.
- **Runtime profile:** The temporary composed `DomainProfile` produced by composing a base profile with overlays. Services receive this composed profile. It is never persisted as source of truth.
- **Sibling branches:** Branches with the same parent. They do not affect each other automatically.
- **Promotion upward:** A proposed merge from child to parent. Never automatic.
- **Merge:** Explicit approved change from one layer into another. Never automatic.

## First Persisted Branch Shape

This shape is the source-level model that maps to the v1 `profile_branches` table.

```text
ProfileBranch
  id: string
  parentProfileId: string
  branchKind: 'project' | 'learning' | 'personal'
  name: string
  overlay: ProfileOverlay
  createdAt: number
  updatedAt: number
```

In DB terms, `overlay` maps to `overlay_json`.

Important adapter boundary:

```text
src/features/ontology/data/...
```

The persistent branch repo/adapter should live behind the ontology data boundary. Do not export DB-backed repo functions from the root `src/features/ontology/index.ts` barrel, because pure ontology imports must not pull in `db/client` or native SQLite dependencies.

## What A Child Branch Can Change

A child branch overlay may:

- Add new ontology nodes
- Add new tags and relationship labels
- Add new examples
- Improve meanings and descriptions
- Add or override profile-owned labels
- Add project-specific metadata fields
- Deprecate inherited nodes locally
- Add relationships between nodes
- Add extraction/classification instructions
- Add boundary rules

A child branch overlay must not silently:

- Mutate its parent profile
- Rewrite old captures or concepts/items
- Apply model-suggested ontology changes without user approval
- Merge project-specific concepts into a general profile without review

## The Key Decision

```text
Persist branch layers.
Do not persist composed runtime profiles as source of truth.
```

This means:

1. **Branch persistence stores overlays, not composed profiles.** When a user creates a project branch, the system stores the branch identity, parent reference, kind, and overlay changes. It does not store a flattened copy of the full composed profile.

2. **Runtime composition stays in TypeScript helpers.** `composeDomainProfile`, activation input helpers, and the runtime profile coordinator compose overlays onto a base profile at runtime. This composition is always derived, never persisted as source.

3. **Merging upward is explicit and requires approval.** A child branch can propose a merge into its parent. The user must accept, edit, reject, or postpone the merge proposal. Nothing changes the parent automatically.

4. **Sibling branches do not affect each other.** Two project branches with the same parent are independent. Changes in one do not appear in the other unless the user merges selected changes through a parent or another explicit target.

5. **Active selection stays separate.** The branch table stores what branches exist. It does not store which branches are active for a project/session/user. Active selection remains a separate boundary.

6. **Merge proposals stay separate.** Merge proposals are not branch rows. A future merge proposal table can reference branch ids and overlay changes, but v1 branch persistence does not implement proposal storage.

## Why This Decision Is Correct

1. **Provenance.** When knowledge appears in a runtime profile, it must be traceable to its source layer. Storing separate overlays preserves where each node, rule, label, and metadata field came from. A flattened composed profile loses this provenance.

2. **Clean parents.** Parent profiles stay immutable until the user approves a change. Projects, learning tracks, and personal corrections cannot silently pollute the base coding profile. This matches the product model from doc 06.

3. **Safe merges.** Because changes live in child overlays first, merging upward is an intentional act. The user can inspect, select, edit, and approve before any parent change happens. Compare mode and patch suggestions become possible because provenance is preserved.

4. **Composition flexibility.** Different runtime compositions are possible from the same branch/overlay data. A personal overlay can be added or removed without altering project overlays. A project overlay can be swapped without altering personal corrections. If the composed profile were persisted instead, every composition change would require persisting a new full profile.

5. **Consistent with existing decisions.** Doc 10/A2 locks that services receive composed `DomainProfile`, not branch ingredients. Doc 11 locks that the Runtime Profile Coordinator composes runtime profiles above services. This decision is the persistence mirror of those runtime decisions: the persisted source is the branch/overlay, and the composed profile is the derived result.

## Rejected Alternatives

### 1. Store only composed profiles

Store the fully composed runtime profile as the persisted source of truth.

Rejected because:

- Loses provenance. It becomes unclear where knowledge came from.
- Merging becomes guesswork. Without knowing which changes belong to which overlay, the system cannot propose targeted merges.
- Composition changes are destructive. Removing a personal correction from a stored composed profile requires diffing or regenerating.
- Runtime composition helpers already exist and are tested. The persistence shape should match the provenance structure, not flatten it.

### 2. Let child branches mutate parents directly

When a child branch adds an ontology node or boundary rule, immediately write it into the parent profile.

Rejected because:

- Project-specific nodes would pollute the general coding profile.
- Learning-specific labels would leak into the base.
- Personal corrections would silently change every other branch's view of the ontology.
- The product model (doc 06) explicitly requires promotion/merge approval, not automatic mutation.

### 3. Make everything event-sourced immediately

Store every change as an immutable event and derive profiles by replaying events.

Rejected because:

- May be powerful later but is too heavy now.
- The current profile composition helpers are pure functions over base + overlays. Adding event sourcing before basic branch persistence works would add unnecessary complexity.
- Event sourcing can be introduced later beneath the overlay layer without changing the branch/overlay/persistence decision. The branch layer is the right abstraction boundary; event sourcing would be an implementation detail inside overlay storage.

### 4. Make branches full profile copies

Store a complete copy of the base profile whenever a branch is created.

Rejected because:

- Simple initially but messy for merge, provenance, and conflict review.
- When the base profile changes (via approved merge), every branch copy would need updating or drift detection.
- Provenance is lost because it is unclear whether a node in a branch copy came from the base or was added locally.
- Storage grows with every branch creation.
- Merge proposals become harder because the system must diff full profiles instead of inspecting explicit overlays.

## What This Decision Is Not

This decision document locks the branch/overlay persistence model. It does not implement:

- No migration or source implementation in this document
- No UI for branch selection, overlay editing, or merge review
- No automatic merge logic
- No checker runtime
- No patch suggestion table
- Correction evidence storage is implemented separately as `ontology_correction_evidence`
- No agent/subagent runtime
- No self-building-app runtime
- No final relationship taxonomy decision
- No Racket/DSL implementation
- No MCP/adapters/source sync

The `profile_branches` migration/schema/repo/backup plumbing is now implemented. Active selection and correction evidence storage are also implemented in separate boundaries. Merge proposal storage, UI, checker runtime, MCP/adapters, agent runtime, app-builder runtime, and Racket/DSL implementation are still deferred.

## Relationship To Existing Decisions

- **Doc 06** had the product model for profile branching and merge semantics. This decision (doc 13) backs that product model with a locked persistence-source decision: branches persist as overlays, not as composed profiles. The product model in doc 06 is now supported by both the runtime composition helpers (docs 10, 11) and this persistence decision.
- **Doc 10/A2** remains true. Services receive composed `DomainProfile`, not branch ingredients. The persistence decision is consistent because the composed profile is always derived at runtime from persisted branch/overlay sources.
- **Doc 11** remains true. The Runtime Profile Coordinator composes runtime profiles above services. The persistence decision is consistent because the coordinator reads from persisted overlays, not from stored composed profiles.
- **Doc 12** remains true, with the 2026-05-11 update. Correction evidence stores the active selection context where the mistake happened, not a target/apply layer. It may snapshot active project/learning/personal branch ids, but it still does not mutate branch overlays or parent profiles.
- **Doc 18** remains true. Evidence-derived suggestions, manual ontology edits, relationship changes, and merge proposals must follow the adaptive suggestion policy: default suggest-first, risk overrides trust, and parent/base changes require explicit approval.
- **Doc 19** remains true. Patch suggestions, relationship suggestions, branch merge proposals, and manual drafts share `profile_change_proposals`. Accepted branch-target proposals later merge `ProfilePatch` data into branch overlays through an explicit apply operation.
- **Parent immutability within a lineage** remains true. A parent profile is immutable by default. Changes go through approved merge proposals. Forks and users can create different ground-zero base profiles later.

## Merge Model

This decision locks the persistence model for branches. The merge behavior follows doc 06:

```text
No merge:
  Keep the branch independent forever.

Partial merge:
  Select specific nodes, rules, examples, metadata fields, or labels
  to copy from a child overlay into the parent.

Full merge:
  Apply all accepted branch changes into the parent after review.

Fork only:
  Create a branch that is intentionally not expected to merge back.
```

Merge proposals are always user-initiated or user-approved. The system may surface merge suggestions, but the user must accept, edit, reject, or postpone them.

## Runtime Composition Precedence

This is already implemented and tested. The precedence rule for runtime composition is:

```text
personal overlay
  > learning overlay
    > project overlay
      > base profile
```

Later overlays of the same kind win deterministically. This runtime precedence stays in TypeScript helpers (`composeDomainProfile`, activation input helpers, runtime profile coordinator) and is not affected by this persistence decision.

## Compatibility Boundaries

Do not rename or remove these in this cycle:

- `LearningConcept.conceptType`
- `ConceptHint.proposedConceptType`
- DB columns: `concept_type`, `proposed_concept_type`, old coding metadata columns
- `learning`, `concept`, structural folder/component names
- `coreConcept`, `architecturalPattern`, `programmingParadigm`

Do not introduce:

- Separate `profile_overlays` table in v1
- `active_profile_selection` table in the same branch-persistence slice
- `profile_merge_proposals` table in the same branch-persistence slice
- AsyncStorage for branch state
- Zustand/store/global mutable active branch
- setter functions for branch activation
- automatic profile mutation
- UI activation selector for branches
- MCP/adapters for profile sync
- agent/subagent runtime
- app-builder runtime
- Racket/DSL runtime

## Model Recommendation

Decision/review:

```text
Codex / GPT-5
```

Implementation/review:

```text
Codex directly unless the human explicitly asks for a worker/model experiment.
```

## Next Open Decisions

After this decision:

1. First correction/proposal UI surface - where users correct type/tag classification and review stored proposals.
2. Checker runtime and approval UI - proposal generation and review over stored correction evidence.
3. Trust setting storage - where conservative/suggest-first/adaptive settings and user-fit learning live.
4. Proposal apply/base-versioning semantics - how accepted `ProfilePatch` changes apply to base profiles safely.
5. Agent/subagent execution ontology brief.
6. Self-building-app framework brief.
