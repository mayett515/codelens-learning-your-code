# Edit Then Apply Decision

Date: 2026-05-28

Status: locked decision; first draft meaning/provenance, target readout, proposal-review handoff, superseding lifecycle, superseding hook-boundary, proposal event-history readout, edited replacement service/hook, and first visible proposal editor UI slices are complete.

## Decision

Richer missing-concept edit/apply must be a review-time draft flow over a pending proposal, not an automatic ontology mutation and not a hidden rewrite of the original model output.

When Kordex suggests a missing concept and the user wants to adjust it before applying, the next implementation should let the user edit a draft proposal and then explicitly apply or save that draft through the already-guarded proposal paths:

```text
suggested missing concept
  -> user reviews and edits label / parent / meaning / reason / target
  -> Kordex validates the edited draft
  -> accepted draft either creates or supersedes a pending proposal
  -> explicit Apply uses branch-local doc 24 or base/core doc 38 paths
```

The edited draft is not the ontology source of truth. It is a candidate patch that must be validated against the current active profile/branch/base state before it can become durable proposal state or an applied profile change.

## Plain-Language Shape

Kordex can say:

> I do not see a good existing bucket. Maybe create "long exposure planning" under Night Photography.

The user can answer:

> Close, but call it "exposure planning", put it under Camera Settings, and explain that it covers shutter/aperture/ISO tradeoffs.

Kordex should then show the edited change as a draft. The user can still decide whether to apply it, save it as a pending proposal, postpone it, or reject it.

This is the polished path for "Kordex was close, but not quite right." It preserves the user's correction intent instead of forcing a reject-and-recreate workflow.

## Scope

The first edit/apply slice should support missing-concept proposal drafts created from Conceptualize review context.

Editable fields:

- proposed node label
- proposed parent item-type node
- proposed meaning / description
- user reason
- target layer: active branch or base/core when the proposal is already safely base-targeted

The edited draft must preserve provenance:

- source capture / candidate id when available
- original `suggestedNewConcept` label and reason when available
- active selection snapshot
- whether the user edited label, parent, meaning, reason, or target
- previous proposal id when the edit supersedes an existing pending proposal

## Target Rules

Branch and base/core targets stay separate:

- branch-targeted drafts become branch-local `ProfileChangeProposal` rows and later apply through doc 24.
- base/core-targeted drafts must carry `targetProfileVersion` and later apply through doc 38.
- a draft must not silently switch from branch to base/core because the model prefers it.
- switching target layer is an explicit user action with blast-radius copy.

Sibling branches do not receive the change automatically. Upward merge remains a separate future proposal path.

## Superseding Behavior

Editing an existing pending proposal should not mutate historical evidence.

The preferred durable shape is:

```text
old pending proposal
  -> superseded status or superseded event
  -> new pending proposal with edited patch and supersedesProposalId
```

The current durable implementation can mark the old proposal as `superseded` and link it through `supersededByProposalId` after the replacement pending proposal exists. The replacement proposal remains the reviewed draft; the old row stays as history.

The current hook boundary exposes `supersedeProfileChangeProposal()` / `useSupersedeProfileChangeProposal()` for the future editor UI. That boundary assumes the replacement proposal already exists; it does not create or edit replacement proposal content by itself.

Rejected, applied, or stale proposals must not be edited in place.

## Validation Rules

Before an edited draft can be saved or applied, Kordex must revalidate:

- target profile/branch still exists
- base/core target version is current when targeting base/core
- selected parent is still a valid item-type node in the target profile
- proposed normalized node id does not collide with an existing non-item ontology node
- proposed node id does not duplicate an existing item type in the same target unless the operation is an explicit override flow
- patch compiles into the correct typed operation for its target

Validation failures should keep the draft visible and explain the specific conflict. They must not silently coerce the proposal into a different parent, target, or node id.

## Apply Semantics

`Edit then apply` is still explicit Apply.

```text
user edits draft
user clicks Apply
  -> validate edited draft
  -> create or supersede proposal record if needed
  -> call the target-specific apply service
  -> append proposal event/audit facts
```

The apply operation must not:

- call an LLM to invent a new patch at apply time
- ignore target-profile versioning
- widen a branch proposal into base/core
- rewrite old cards
- mutate correction evidence
- update trust settings
- auto-apply similar future proposals

## Relationship To Existing Decisions

- **Doc 20:** Conceptualize is the first correction surface. This decision makes the missing-concept correction path richer without turning it into a full ontology editor.
- **Doc 24:** branch-local Apply remains the branch-target apply path.
- **Doc 25:** proposal events remain the audit stream for apply/reject/postpone/ask-why and should also record superseding/edit decisions when implemented.
- **Doc 36:** `suggestedNewConcept` remains review metadata. Editing it is user action, not automatic proposal creation.
- **Doc 37:** user-fit signals may inform copy or ranking, but they do not mutate the draft.
- **Doc 38:** base/core Apply is allowed only through version-guarded base-profile apply.

## Non-Goals

This decision does not add:

- automatic missing-concept apply
- automatic proposal creation from model output without user action
- a full ontology editor
- stale proposal refresh/rebase
- branch merge into base/core
- sibling branch propagation
- old-card backfill
- historical undo execution
- checker runtime
- graph/vector retrieval
- trust-setting updates
- auto-apply
- agent runtime
- app-builder runtime
- DSL runtime

## Recommended First Implementation Slice

Start with the smallest durable edit/apply slice:

1. Add draft/presentation helpers that convert `suggestedNewConcept` plus user edits into a validated proposal draft.
2. Add UI state for editing label, parent, meaning, reason, and target with explicit branch/base blast-radius copy.
3. Reuse existing manual new-subtype proposal creation for save-as-pending where possible.
4. Route explicit Apply through doc 24 or doc 38 based on target.
5. Add focused tests for validation failures, target switching, base-version requirements, and no hidden mutation from model output.

Do not add stale refresh or historical undo in the same slice unless the schema already supports them cleanly.

## Implementation Update - Draft Meaning And Provenance

The first implementation slice keeps the existing Conceptualize save/proposal path and makes missing-concept drafts richer and more auditable.

Updated:

- `src/features/learning/state/save-learning.ts`
- `src/features/learning/ui/ConceptualizeCorrectionControls.tsx`
- `src/features/learning/ui/SaveAsLearningModal.tsx`
- `src/features/learning/services/saveConceptualizedCapture.ts`
- `src/features/learning/services/__tests__/conceptualizeCorrections.test.ts`
- `src/features/learning/state/__tests__/stage3-save-learning-store.test.ts`
- `src/features/learning/ui/cards/__tests__/stage3-card-guards.test.ts`

Behavior:

- Correction drafts now carry editable `newTypeMeaning`.
- `Use suggestion` copies the suggested label, meaning, reason, and valid parent into the editable draft.
- The store still does not auto-fill missing-concept suggestions when candidates are loaded.
- New subtype proposal nodes use the edited meaning when present, otherwise the original `suggestedNewConcept.meaning`, otherwise the user reason/fallback text.
- When a missing-concept suggestion is edited into a proposal, the proposal reason preserves the original suggested label, parent, meaning, reason, and which fields the user changed.
- Conceptualize correction controls now show the current proposal target with blast-radius copy when the candidate is a missing-concept review or the user starts a new subtype draft.
- The readout is display-only in this slice. It reflects the already-locked target rule: active branch/local first; base/core only explicit and version-guarded; no silent widening.
- Saving a draft that creates a profile-change proposal now returns that pending proposal to the modal.
- Saved candidate cards with a created proposal show `Review proposal`, which opens the existing proposal review surface with that proposal selected.
- Apply still happens only through the doc 24/doc 38 review/apply services. Conceptualize does not apply directly and does not mutate ontology/profile state outside the guarded proposal path.

Still not added:

- one-click direct Apply from the Conceptualize modal
- target-layer switching controls
- stale proposal refresh/rebase
- old-card backfill
- checker runtime
- auto-apply
- graph/vector retrieval
- trust-setting updates
- agent runtime
- app-builder runtime
- DSL runtime

## Implementation Update - Superseding Lifecycle

The first durable superseding slice is implemented behind the ontology data boundary.

Updated:

- `src/db/migrations/023-profile-proposal-event-superseded-action.ts`
- `src/db/schema.ts`
- `src/features/backup/format.ts`
- `src/features/ontology/types.ts`
- `src/features/ontology/codecs/profileProposalEvent.ts`
- `src/features/ontology/data/profileChangeProposalLifecycleService.ts`
- `src/features/ontology/data/index.ts`
- `src/features/ontology/hooks/useReviewProfileChangeProposal.ts`
- `src/features/ontology/userFitProjection.ts`
- `src/__tests__/stage10-architecture-guards.test.ts`
- focused migration/codec/service/projection tests

Behavior:

- `profile_proposal_events.action` now accepts `superseded`.
- `supersedePendingProfileChangeProposal(input)` loads the old proposal and replacement proposal in one transaction.
- The old proposal must still be `pending`.
- The replacement proposal must exist, still be `pending`, and belong to the same base profile.
- The service marks the old proposal `superseded`, sets `supersededByProposalId`, stamps `reviewedAt`/`updatedAt`, and writes a `superseded` audit event.
- Conditional writes still fail closed if the old proposal changed before the lifecycle transition.
- Superseded events stay out of user-fit preference scoring; they are audit/lifecycle history, not evidence that the user liked or disliked a proposal kind.
- `supersedeProfileChangeProposal()` and `useSupersedeProfileChangeProposal()` expose the lifecycle service to future UI edit flows without creating a proposal editor yet.
- Regression tests cover self-supersede attempts, already-superseded old proposals, and replacement timestamps newer than the lifecycle timestamp.

Still not added:

- UI edit flow wiring to create the replacement proposal and call the superseding hook/service
- stale proposal refresh/rebase
- one-click direct Apply from the Conceptualize modal
- old-card backfill
- checker runtime
- auto-apply

## Implementation Update - Edited Replacement Service

The first durable edit-replacement primitive is implemented behind the ontology data boundary.

Updated:

- `src/features/ontology/data/profileChangeProposalEditService.ts`
- `src/features/ontology/hooks/useEditProfileChangeProposal.ts`
- `src/features/ontology/data/index.ts`
- `src/__tests__/stage10-architecture-guards.test.ts`
- focused service/hook tests

Behavior:

- `createEditedProfileChangeProposalReplacement(input)` loads an existing pending proposal in a transaction.
- The edited replacement preserves the original target and evidence, switches the replacement source to `user`, writes the edited `ProfilePatch`, and snapshots the current target basis:
  - branch targets receive the current branch `updatedAt` as `targetBranchUpdatedAt`
  - base/core targets receive the current profile definition version as `targetProfileVersion`
- The replacement patch is dry-run through the existing branch-local or base-profile apply compiler before anything is written.
- If validation passes, the service inserts the replacement pending proposal and reuses `supersedePendingProfileChangeProposal()` inside the same transaction to mark the old proposal `superseded` and append the audit event.
- The hook boundary `editProfileChangeProposal()` / `useEditProfileChangeProposal()` adds user actor metadata/current time and invalidates proposal, event, and freshness query keys.

Still not added:

- target-layer switching controls
- direct Apply from the edit flow
- automatic target widening
- branch/base mutation during edit
- old-card backfill
- checker runtime
- auto-apply

## Implementation Update - Visible Proposal Editor UI

The first visible proposal editor slice is implemented in the proposal review surface.

Updated:

- `src/features/ontology/ui/ProfileProposalReviewScreen.tsx`
- `src/features/ontology/ui/profileProposalReviewPresentation.ts`
- `src/features/ontology/__tests__/profileProposalReviewPresentation.test.ts`

Behavior:

- Pending new-node proposals can open an inline editor from the proposal review detail pane.
- The editor can change the proposed node label, parent id, meaning, review reason, and risk score.
- The target remains fixed. Branch proposals stay branch-targeted, and base/core proposals stay base-targeted.
- Saving the edit builds an edited `ProfilePatch`, calls `useEditProfileChangeProposal()`, creates a new pending replacement proposal, supersedes the old proposal, and selects the replacement for review.
- The editor keeps the draft visible on local validation or service errors.
- Parent ids are validated by the shared branch/base proposal compile path, so edit-save, stale refresh, and final Apply all reject parents that are not target item types.
- Unsupported patch shapes stay out of this first editor and continue using the existing review actions.

Still not added:

- target-layer switching controls
- direct Apply from the edit flow
- automatic target widening
- branch/base mutation during edit
- old-card backfill
- checker runtime
- auto-apply
