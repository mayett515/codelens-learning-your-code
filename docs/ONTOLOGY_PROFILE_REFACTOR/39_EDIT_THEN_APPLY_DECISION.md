# Edit Then Apply Decision

Date: 2026-05-28

Status: locked decision; first draft meaning/provenance, target readout, proposal-review handoff, superseding lifecycle, superseding hook-boundary, proposal event-history readout, edited replacement service/hook, first visible proposal editor UI slices, target-switching implementation scope, pure target-switch helper, target-switch data service, hook, and review control slices are complete.

## Decision

Richer missing-concept edit/apply must be a review-time draft flow over a pending proposal, not an automatic ontology mutation and not a hidden rewrite of the original model output.

When Kordex suggests a missing concept and the user wants to adjust it before applying, the implemented flow lets the user edit a draft proposal and then explicitly apply or save that draft through the already-guarded proposal paths:

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

The implemented first edit/apply slice supports missing-concept proposal drafts created from Conceptualize review context.

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

- direct Apply from the edit flow
- automatic target widening
- branch/base mutation during edit
- old-card backfill
- auto-apply

## Implementation Note - Target-Layer Switching First Slice

Target-layer switching is already allowed only as explicit user action by the Target Rules above. This note narrows the first implementation slice; it does not reopen the branch-vs-core decision.

The first target-switching slice should support only this direction:

```text
pending branch-local additive new-node proposal
  -> explicit user chooses "move proposal to base/core"
  -> Kordex shows branch-local vs base/core blast-radius copy
  -> Kordex creates a new base-targeted pending replacement proposal
  -> old branch-targeted proposal is superseded
```

Why branch-to-base first:

- It matches the documented user story: a proposal that started local may be valuable enough to promote to the shared base/core layer.
- Doc 38 already provides the version-guarded base/core proposal apply path.
- Doc 42 now gives the review surface enough selection context to explain what is local branch scope versus base/core blast radius.
- Base-to-branch narrowing, branch-to-branch retargeting, sibling targeting, and bulk target changes are lower-value and carry different UX semantics. They need their own later gates.

The first slice must keep these mechanics:

- Switching creates a replacement proposal and supersedes the old proposal. It must not rewrite the old proposal in place.
- The replacement keeps the same `baseProfileId`, patch, evidence ids, reason, title/summary intent, `semanticConfidence`, `userFitConfidence`, and audit provenance unless the user separately edits those fields through the existing editor.
- The replacement preserves the original `sourceKind`; a checker-discovered idea remains checker-discovered even when the user explicitly switches its target. The user action is captured by the superseding audit event actor/reason.
- The replacement re-derives `riskScore` from the new target and operation shape by Kordex policy. Risk describes blast radius, so a branch-local risk score must not be carried onto a base/core replacement.
- The replacement target becomes `target.kind = 'base_profile'` with `target.profileId = baseProfileId`.
- The replacement snapshots the current base/core version as `targetProfileVersion`.
- The replacement clears branch-only target basis by setting `targetBranchUpdatedAt = null`.
- The patch is dry-run through the existing base-profile proposal compiler before the replacement is inserted.
- Insertion of the replacement and superseding of the old pending proposal happen in one transaction, reusing the existing superseding lifecycle semantics.
- Validation failures keep the original branch-targeted proposal pending and visible. They must not coerce the patch, parent, node id, or target.
- Apply remains a separate explicit action after the replacement exists. Switching target is not Apply.

The UI must make the blast radius explicit:

- branch-local means the change applies only to the target branch if later applied;
- base/core means the change affects the shared base profile for future composed runtime profiles if later applied;
- the user must explicitly confirm the switch before the base-targeted replacement is created.

Non-goals for the first target-switching slice:

- base-to-branch switching;
- branch-to-branch or sibling-branch switching;
- target switching for checker-created proposals without user action;
- target switching initiated by a model;
- bulk switching multiple proposals;
- applying immediately after switching;
- branch merge/upward promotion of already-applied branch overlay content;
- target switching for non-additive or future typed operation kinds;
- base/core checker targeting;
- old-card backfill;
- auto-apply or trust-setting mutation.

Recommended implementation order:

1. Add a pure target-switching draft helper that decides whether a proposal can be switched and produces user-facing blast-radius copy.
2. Add a data-layer service that creates the base-targeted replacement and supersedes the old proposal atomically.
3. Add a hook with proposal/event/freshness invalidation only.
4. Add a small review-surface control for eligible pending branch-local proposals.
5. Add guards proving no in-place retargeting, no model calls, no checker path, no apply path, and no sibling/branch-merge path.

## Implementation Update - Target-Switch Pure Helper

The first target-switching implementation slice is a pure eligibility/blast-radius helper. It does not create replacement proposals, supersede proposals, call apply services, or render UI.

Implemented files:

- `src/features/ontology/profileProposalTargetSwitch.ts`
- `src/features/ontology/__tests__/profileProposalTargetSwitch.test.ts`
- `src/features/ontology/index.ts`
- `src/__tests__/stage10-architecture-guards.test.ts`

What this implements:

- `createProposalTargetSwitchModel(input)` evaluates whether a proposal is eligible for the first target-switching slice.
- Eligible proposals must be pending, branch-targeted, `ontology_node_patch`, and a single additive item-type node patch.
- The model previews the base/core replacement fields without mutating the original proposal:
  - `target.kind = 'base_profile'`
  - `target.profileId = baseProfileId`
  - current `targetProfileVersion`
  - `targetBranchUpdatedAt = null`
  - original `sourceKind`
  - original patch/evidence/confidence values
  - re-derived base/core additive risk score
- The helper produces branch-local vs base/core blast-radius copy and states that switching target is not Apply.
- Unsupported proposals return explicit block reasons instead of coercing target, patch, or status.
- Stage10 guards keep the helper pure and branch-to-base-only: no DB/data imports, React, model calls, apply compilers/services, proposal writes, superseding service calls, checker/trust paths, sibling/bulk/branch-merge paths, or non-additive proposal kinds.

Still not implemented:

- branch/base mutation or Apply

## Implementation Update - Target-Switch Data Service

The second target-switching implementation slice is a data-layer replacement/supersede service. It creates a base-targeted replacement proposal and supersedes the original branch-targeted proposal atomically, but it still does not render UI or Apply the replacement.

Implemented files:

- `src/features/ontology/data/profileChangeProposalTargetSwitchService.ts`
- `src/features/ontology/__tests__/profileChangeProposalTargetSwitchService.test.ts`
- `src/features/ontology/data/index.ts`
- `src/__tests__/stage10-architecture-guards.test.ts`

What this implements:

- `switchProfileChangeProposalTargetToBase(input)` loads the pending branch-targeted proposal, source branch row, and current profile definition inside one transaction.
- The service reuses `createProposalTargetSwitchModel(input)` for eligibility and replacement-field policy.
- The replacement preserves the original producer provenance through `sourceKind`, preserves patch/evidence/confidence values, re-derives base/core additive risk, sets `target.kind = 'base_profile'`, snapshots current `targetProfileVersion`, and sets `targetBranchUpdatedAt = null`.
- The replacement patch is codec-cloned before insertion so caller-owned draft objects cannot leak into persistence.
- The service dry-runs the exact replacement through `compileBaseProfileProposalApplyOperation` before any insert. Base conflicts, including branch-only parent ids, fail before writes.
- After dry-run success, the service inserts the replacement and calls the existing superseding lifecycle in the same transaction. Supersede drift rolls the transaction back.
- Stage10 guards keep the service behind the ontology data boundary and branch-to-base only: no root-barrel export, branch-local compiler, apply services, updater/upsert/delete proposal paths, trust settings, checker/model paths, schedulers, sibling/bulk/branch-merge paths, or non-additive proposal kinds.

Still not implemented:

- branch/base mutation or Apply

## Implementation Update - Target-Switch Review Control

The third target-switching implementation slice wires the data service into the proposal review surface. It exposes an explicit user action for eligible pending branch-local additive proposals and keeps the replacement in the normal review flow.

Implemented files:

- `src/features/ontology/hooks/useSwitchProfileChangeProposalTarget.ts`
- `src/features/ontology/__tests__/useSwitchProfileChangeProposalTarget.test.ts`
- `src/features/ontology/ui/ProfileProposalReviewScreen.tsx`
- `src/features/ontology/ui/profileProposalReviewPresentation.ts`
- `src/features/ontology/__tests__/profileProposalReviewPresentation.test.ts`
- `src/__tests__/stage10-architecture-guards.test.ts`

What this implements:

- `switchProfileChangeProposalTarget(input)` calls the data service with user actor metadata and current time.
- `useSwitchProfileChangeProposalTarget()` invalidates proposal lists, the old and new proposal event histories, and proposal freshness. It does not invalidate branch/profile state as if switching had applied a profile mutation.
- The review surface builds `createProposalTargetSwitchModel(input)` for the selected proposal using the current base profile summary.
- Eligible branch-local proposals show blast-radius copy and a "move proposal to core" action. The action creates a new pending base-targeted replacement, selects it, and leaves Apply as a separate explicit action.
- Target-switch conflicts use branch-specific copy when a patch only fits the branch target, such as a parent id that exists only in the branch overlay.
- Stage10 guards keep the hook/control review-only: no branch/selection/base-profile invalidation in the hook, no direct apply/compiler paths in the hook, no checker/model paths, and no data-service import from the UI screen.

Still not implemented:

- branch/base mutation during switching
- automatic Apply after switching
- base-to-branch, branch-to-branch, sibling, bulk, or non-additive target switching

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

- direct Apply from the edit flow
- automatic target widening
- branch/base mutation during edit
- old-card backfill
- auto-apply
