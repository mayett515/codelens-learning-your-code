# Branch/Overlay Persistence Decision

**Status:** Locked decision on 2026-05-07.
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

## Definitions

- **Parent profile:** The profile/layer a branch extends. In this app lineage, the current base is the coding profile.
- **Branch:** A durable child layer with identity, parent reference, and branch kind.
- **Overlay:** The actual set of changes inside a branch/layer. An overlay adds or overrides ontology nodes, tags, relationship labels, examples, metadata fields, and boundary rules on top of its parent.
- **Runtime profile:** The temporary composed `DomainProfile` produced by composing a base profile with overlays. Services receive this composed profile. It is never persisted as source of truth.
- **Sibling branches:** Branches with the same parent. They do not affect each other automatically.
- **Promotion upward:** A proposed merge from child to parent. Never automatic.
- **Merge:** Explicit approved change from one layer into another. Never automatic.

## Conceptual First Persisted Branch Shape

This shape is a future target. It is not implemented in this slice.

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

The exact DB rows and schema are deferred. This shape documents the concept, not a migration.

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

- No DB table, migration, or schema for branches or overlays
- No storage API for branches or overlays
- No UI for branch selection, overlay editing, or merge review
- No automatic merge logic
- No checker runtime
- No patch suggestion table
- No correction storage implementation
- No agent/subagent runtime
- No self-building-app runtime
- No final relationship taxonomy decision
- No Racket/DSL implementation
- No MCP/adapters/source sync

## Relationship To Existing Decisions

- **Doc 06** had the product model for profile branching and merge semantics. This decision (doc 13) backs that product model with a locked persistence-source decision: branches persist as overlays, not as composed profiles. The product model in doc 06 is now supported by both the runtime composition helpers (docs 10, 11) and this persistence decision.
- **Doc 10/A2** remains true. Services receive composed `DomainProfile`, not branch ingredients. The persistence decision is consistent because the composed profile is always derived at runtime from persisted branch/overlay sources.
- **Doc 11** remains true. The Runtime Profile Coordinator composes runtime profiles above services. The persistence decision is consistent because the coordinator reads from persisted overlays, not from stored composed profiles.
- **Doc 12** remains true. Correction evidence stays `profileId`-only first. `branchId` and `targetLayerId` come later when branch persistence exists. This decision establishes that branch persistence will store overlays, which gives doc 12 a clear path for adding `branchId` without redesigning correction evidence.
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

- DB/schema/migration code for branches or overlays
- AsyncStorage for branch state
- Zustand/store/global mutable active branch
- setter functions for branch activation
- automatic profile mutation
- branch persistence table or store
- overlay persistence table or store
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

Doc/guard worker:

```text
opencode-go/glm-5.1 with --thinking high
```

TypeScript implementation worker (after this decision is locked):

```text
opencode-go/qwen3.6-plus with --thinking high
```

## Next Open Decisions

After this decision:

1. Branch/overlay persistence implementation - DB schema, migration, and store for `ProfileBranch` (deferred, not this slice).
2. Branch selection and activation - how the user selects which branches are active at runtime (deferred).
3. Merge proposal storage and review UI - how merge proposals are stored, presented, and approved/rejected/postponed (deferred).
4. Correction storage implementation - DB/migration/store for profileId-only `OntologyCorrectionEvidence`; `branchId`/`targetLayerId` come later with branch persistence.
5. Checker runtime and approval UI - patch suggestion generation and review.
6. Agent/subagent execution ontology brief.
7. Self-building-app framework brief.