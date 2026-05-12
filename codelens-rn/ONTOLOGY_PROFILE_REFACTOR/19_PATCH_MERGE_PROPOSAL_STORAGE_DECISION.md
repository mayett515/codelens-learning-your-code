# Patch/Merge Proposal Storage And Review Decision

**Status:** Locked decision on 2026-05-11. Storage-only v1 implemented on 2026-05-11; no review UI or apply service yet.
**Branch:** `refactor/ontology-profile`

## Locked Decision

Use one unified proposal concept for evidence-derived patch suggestions and branch merge proposals:

```text
profile_change_proposals
```

In product language, the app can still say:

```text
patch suggestion
merge proposal
relationship suggestion
manual draft
```

But at the persistence/review boundary, these are all profile change proposals. They share the same lifecycle:

```text
created -> pending review -> accepted / edited / rejected / postponed / superseded
```

No proposal mutates a profile or branch by existing. A proposal is a reviewed draft. An accepted proposal is later applied by an explicit apply/merge operation.

## Implemented Storage V1

The first storage slice is implemented:

- `ProfilePatch` and `ProfileChangeProposal` domain types in `src/features/ontology/types.ts`
- migration 016: `profile_change_proposals`
- Drizzle schema: `profileChangeProposals`
- strict codec: `src/features/ontology/codecs/profileChangeProposal.ts`
- ontology data-boundary repo: `src/features/ontology/data/profileChangeProposalRepo.ts`
- backup/export/import/clear/columnMaps support
- `FORMAT_VERSION` bumped 5 -> 6 and `SCHEMA_VERSION` bumped 15 -> 16
- stage10 boundary guard allows `profile_change_proposals` only in planned persistence files and tests
- focused migration, codec, backup, and guard tests

The implemented slice remains storage-only. It does not add review UI, checker runtime, apply/merge service, trust setting storage, auto-apply, old-data backfill, or base-profile versioning.

## Why One Proposal Store

Patch suggestions and merge proposals look different in the UI, but the durable data they need is almost the same:

- what change is proposed
- why it is proposed
- what evidence or source branch supports it
- where it would apply
- how risky it is
- whether the user accepted, edited, rejected, or postponed it

Using two storage systems would duplicate review state, risk/confidence fields, evidence linking, audit behavior, and status transitions. One proposal store keeps the decision model coherent while still allowing different UI labels.

## Core Flow

```text
Correction evidence accumulates
  -> checker/model creates profile change proposal
  -> user reviews proposal
  -> accepted proposal applies to a selected target layer

Branch accumulates useful overlay changes
  -> system/user creates profile change proposal
  -> user reviews selected merge patch
  -> accepted proposal applies to parent/base or another branch
```

The same review surface can handle both.

## Proposed V1 Domain Shape

```text
ProfileChangeProposal
  id: string
  proposalKind:
    | 'classification_patch'
    | 'ontology_node_patch'
    | 'relationship_patch'
    | 'branch_merge'
    | 'manual_draft'
  sourceKind:
    | 'checker'
    | 'model'
    | 'user'
    | 'system'
  baseProfileId: string
  sourceBranchId?: string | null
  target: {
    kind: 'base_profile' | 'profile_branch'
    profileId?: string | null
    branchId?: string | null
  }
  evidenceIds: string[]
  patch: ProfilePatch
  title: string
  summary: string
  reason: string
  riskScore: number
  semanticConfidence?: number | null
  userFitConfidence?: number | null
  status:
    | 'pending'
    | 'accepted'
    | 'rejected'
    | 'postponed'
    | 'superseded'
  supersededByProposalId?: string | null
  createdAt: number
  updatedAt: number
  reviewedAt?: number | null
  appliedAt?: number | null
```

## ProfilePatch

`ProfilePatch` should be overlay-like but not identical to `ProfileOverlay`.

Reason:

- `ProfileOverlay` is a durable branch layer with `kind` and `id`.
- A proposal patch is not yet a branch. It is a proposed change that can later apply to a branch or base profile.
- Base profile changes should not fake a project/learning/personal overlay kind.

Recommended shape:

```text
ProfilePatch
  addOntologyNodes?: OntologyNode[]
  overrideOntologyNodes?: OntologyNode[]
  addItemTypeNodeIds?: string[]
  addRelationshipTypeNodeIds?: string[]
  overrideLabels?: partial DomainLabels
  overrideMetadataFields?: MetadataFieldDefinition[]
  overrideGraph?: partial GraphProfile
  overrideOntology?: partial ontology lists/nodes
```

This mirrors the existing overlay diff language but removes branch identity. Applying the patch later is target-specific:

- to a profile branch: merge the patch into that branch's `overlay_json`
- to a base profile: create an approved base-profile update/version
- to a future external system: not in this repo yet, and always high-risk

## Proposed V1 DB Shape

If implemented next, use a single table:

```text
profile_change_proposals
  id TEXT PRIMARY KEY
  proposal_kind TEXT NOT NULL
  source_kind TEXT NOT NULL
  base_profile_id TEXT NOT NULL
  source_branch_id TEXT NULL
  target_kind TEXT NOT NULL
  target_profile_id TEXT NULL
  target_branch_id TEXT NULL
  evidence_ids_json TEXT NOT NULL
  patch_json TEXT NOT NULL
  title TEXT NOT NULL
  summary TEXT NOT NULL
  reason TEXT NOT NULL
  risk_score REAL NOT NULL
  semantic_confidence REAL NULL
  user_fit_confidence REAL NULL
  status TEXT NOT NULL
  superseded_by_proposal_id TEXT NULL
  created_at INTEGER NOT NULL
  updated_at INTEGER NOT NULL
  reviewed_at INTEGER NULL
  applied_at INTEGER NULL
```

Suggested indexes:

```text
idx_profile_change_proposals_status
idx_profile_change_proposals_base_profile
idx_profile_change_proposals_target_branch
idx_profile_change_proposals_source_branch
idx_profile_change_proposals_updated
```

`evidence_ids_json` stays inline JSON in v1. A normalized proposal-to-evidence link table can be added later if evidence-to-proposal querying becomes important. Evidence is append-only, so inline evidence IDs are enough for the first local-first implementation.

## Target Rules

Exactly one target must be selected:

```text
target.kind = 'profile_branch'
  -> target.branchId is required
  -> target.profileId is null/optional

target.kind = 'base_profile'
  -> target.profileId is required
  -> target.branchId is null/optional
```

Target is not the same as active context:

```text
correction evidence activeSelectionSnapshot = where the mistake happened
proposal target = where the reviewed change might apply
```

This preserves doc 12. Evidence stays factual. The proposal makes the target decision.

## Evidence Requirements

Checker/model proposals should include evidence:

```text
proposalKind != 'manual_draft'
sourceKind in ('checker', 'model', 'system')
  -> evidenceIds should be non-empty unless sourceBranchId explains the proposal
```

Branch merge proposals may be justified by `sourceBranchId` plus a reason, even without correction evidence IDs.

Manual drafts may have no evidence IDs because the user is directly authoring the change. They still need a target, patch, reason, and review/apply flow unless the future UI explicitly creates a direct ontology edit outside the proposal queue.

## Proposal Kinds

### classification_patch

Used when correction evidence suggests a type/tag/subtag classification should change.

Example:

```text
Several captures were corrected from "component" to "state_management".
Suggest adding a boundary rule or subtype.
```

### ontology_node_patch

Used when the system proposes adding, editing, deprecating, or splitting ontology nodes.

Example:

```text
Add "query_key_invalidation" as a child of "state_management".
```

### relationship_patch

Used for relationship labels, relationship type definitions, or relationship edges.

Example:

```text
Add relationship type "refetches_after" in the React project branch.
```

### branch_merge

Used when a child branch has changes that may be promoted upward or copied to another branch.

Example:

```text
Merge selected React branch boundary rules into the coding base.
```

### manual_draft

Used when the user starts a structured change and wants preview/review before applying.

Example:

```text
User manually drafts a new subtag and reviews affected old captures before applying.
```

## Status Flow

```text
pending
  The proposal is waiting for review.

accepted
  The user accepted it. If an apply service exists, it should apply the patch explicitly and set appliedAt.

rejected
  The user said no. Keep the record so user-fit confidence can learn.

postponed
  The user deferred it. It can reappear later.

superseded
  The proposal was replaced by an edited or newer proposal.
```

Editing a proposal should create a new proposal or revision and mark the old one as superseded. Do not rewrite the original proposal in place if that would erase review/audit history.

## Review UI Decision

The first review UI should be a proposal queue/detail flow, not an invisible background apply loop.

Minimum review details:

- proposal kind
- target layer: base profile or specific branch
- source: checker/model/user/system and optional source branch
- evidence list or source branch diff
- patch preview
- risk score and why it is risky
- semantic confidence and user-fit confidence when available
- actions: accept, edit, reject, postpone

Accept should not mutate evidence. Accept should not mutate sibling branches. Accept should only apply to the chosen target layer through an explicit apply operation.

Edit should produce a revised proposal, not silently mutate the old evidence.

Reject should improve user-fit confidence for similar future suggestions.

Postpone should keep the proposal visible but out of the immediate queue.

## What Apply Means Later

Applying a proposal is a separate operation from storing a proposal.

For a branch target:

```text
load profile_branches[targetBranchId]
merge ProfilePatch into overlay_json
write updated branch overlay
set proposal.status = accepted
set proposal.appliedAt
```

For a base profile target:

```text
load profile_definitions[targetProfileId]
apply ProfilePatch to create approved next base profile version/update
set proposal.status = accepted
set proposal.appliedAt
```

The exact base-profile versioning operation is not implemented in this decision. Base/core changes are high risk and require explicit approval.

## Rejected Alternatives

### 1. Separate `ontology_patch_suggestions` and `profile_merge_proposals` tables

Rejected for v1.

They would duplicate:

- status fields
- review UI actions
- evidence/source links
- risk/confidence fields
- target layer logic
- audit behavior

The product labels can stay separate while persistence uses one proposal table.

### 2. Store suggestions inside correction evidence rows

Rejected.

Evidence is a fact. A suggestion is a decision draft. Mixing them would make evidence mutable and would violate doc 12.

### 3. Store proposed full profiles

Rejected.

A full profile snapshot loses provenance and makes branch/base merge review harder. Proposals should store a patch/diff, not a composed runtime profile.

### 4. Auto-apply low-risk suggestions without proposal records

Rejected.

Even trusted auto-apply needs a visible audit trail, source evidence, target, risk score, and undo/review path.

## What This Decision Is Not

This decision/storage slice does not implement:

- proposal review UI
- checker runtime
- apply/merge service
- trust setting storage
- user-fit confidence storage
- base profile versioning
- old capture/item backfill queue
- agent runtime
- app-builder runtime
- external write-back

## Relationship To Existing Decisions

- **Doc 12:** Evidence remains factual. Proposals reference evidence IDs but do not mutate evidence.
- **Doc 13:** Branches persist as overlays. Accepted branch-target proposals later merge patches into branch overlays.
- **Doc 14:** Active selection is where a mistake happened. Proposal target is where a reviewed change may apply.
- **Doc 17:** Base profiles are durable profile definitions. Accepted base-target proposals need explicit approval and later version/update mechanics.
- **Doc 18:** Proposal review follows the adaptive suggestion policy. Default is suggest-first. Risk overrides trust. Base/core changes always require approval.
- **Doc 06:** Parent profiles stay clean until an approved merge proposal applies a change.

## Recommended Next Implementation Slice

The next implementation should not apply proposals yet. Pick one of these bounded next slices:

1. First proposal review UI decision and minimal queue/detail surface.
2. Checker runtime decision over stored correction evidence.
3. Trust setting storage for conservative/suggest-first/adaptive behavior.
4. Apply/merge semantics for accepted `ProfilePatch` rows, especially base-profile versioning.

Do not implement invisible auto-apply before the review/apply boundary is explicit.

## Hard Boundaries

- Do not store composed runtime profiles as proposals.
- Do not mutate correction evidence when creating proposals.
- Do not apply proposals just because they exist.
- Do not auto-merge into parent/base profiles.
- Do not let proposal storage import UI, services, checker runtime, MCP/adapters, agent runtime, app-builder runtime, or DSL runtime.
- Do not expose DB-backed proposal repos from the root ontology barrel.
