# Branch-Local Proposal Review And Apply Decision

**Status:** Locked decision on 2026-05-13. First pure helper, persistence-backed service, and minimal review UI implementation added on 2026-05-13.
**Branch:** `refactor/ontology-profile`

This document narrows doc 21 and doc 19 into the first concrete proposal review/apply shape.

The first implementation adds pure branch-local typed operation/helpers, a minimal persistence-backed service that loads a pending branch proposal, applies the pure helper, and commits the branch/proposal updates atomically, plus a minimal review queue/detail UI. Proposal event/audit storage was added later in doc 25. Checker runtime, auto-apply engine, base-profile versioning, edit-then-apply, and branch-merge runtime are still outside this document.

## Locked Decision

The first proposal apply flow is explicit and branch-local.

```text
proposal = suggestion
review = user decision
apply = actual branch update
```

Proposals never mutate a branch, base profile, card, graph, or ontology by existing. A stored proposal is inert until a review/apply operation runs.

## Proposal Sources

The first proposal review/apply path handles proposals from two main sources:

```text
1. User correction or edit during Conceptualize
2. Checker/system suggestion from evidence or graph/profile analysis
```

Conceptualize example:

```text
Kortex proposed: ISO
User corrected to: noise_control
```

Kortex stores evidence, and may create a pending proposal:

```text
Add or strengthen "noise_control" in the active Night Photography branch.
```

Checker example:

```text
Kortex notices repeated corrections from ISO to noise_control.
```

Kortex may create the same kind of pending branch-local proposal.

Both paths feed the same queue:

```text
evidence or checker observation
  -> profile_change_proposal
  -> review
  -> explicit apply
  -> branch overlay change
```

## First Apply Target

The first apply implementation should only apply proposals whose target is:

```text
target.kind = profile_branch
target.branchId = selected branch id
```

This means a Night Photography proposal can update:

```text
Photography Core
  -> Night Photography branch
```

It must not update:

```text
Photography Core
Daylight Photography branch
Astrophotography branch
```

## Explicit Non-Targets

The first apply flow does not handle:

- base/core profile mutation
- upward branch merge
- sibling branch propagation
- auto-apply runtime
- old-card backfill
- historical undo/reversal
- proposal editing
- base-profile versioning
- external write-back

These are still valid future directions. They are deliberately outside the first apply seam.

## Review Actions

The first review actions should be:

```text
Apply
Reject
Postpone
Ask why / why not
```

Meaning:

- **Apply:** revalidate and apply the branch-local patch.
- **Reject:** keep the proposal as rejected so future user-fit can learn.
- **Postpone:** keep it pending/deferred without applying.
- **Ask why / why not:** explanation-only; no mutation.

## Edit Then Apply

`Edit then apply` is architecturally reserved but not part of the first apply implementation.

Reason:

Editing a proposal requires:

- proposal editor UI
- patch mutation rules
- validation preview
- proposal superseding history
- revalidation of the edited patch
- likely audit/event records

That is real product value, especially when Kortex is almost right but the user wants different wording, scope, or boundaries. It should exist later.

But the first apply path should stay smaller:

```text
Apply / Reject / Postpone / Ask why
```

If the proposal is wrong enough to need editing, the user can reject/postpone it or create a better correction/proposal through Conceptualize until the edit flow exists.

## Risk And Confidence

Risk and confidence must stay distinct.

```text
confidence = is Kortex probably right?
risk = how much could Kortex break if it is wrong?
```

User-facing risk should not be a bare number without meaning.

For a Night Photography proposal:

```text
Low risk
This adds one branch-local subtag. It does not change the Photography Core or rewrite old notes automatically.
```

For a high-impact proposal:

```text
High risk
This would affect the Photography Core or many branches/items.
```

Internally, proposals still store `riskScore`, `semanticConfidence`, and `userFitConfidence`. The UI should translate them into scope/blast-radius language.

## Apply Semantics

Apply must:

1. Load the pending proposal.
2. Confirm the proposal target is a profile branch.
3. Revalidate the proposal against the current branch/profile state.
4. Compile the proposal patch into typed Kortex operations.
5. Apply those operations to the target branch overlay.
6. Mark the proposal accepted/applied.
7. Keep the operation atomic: branch mutation and proposal status change commit together or not at all.

Apply must not:

- call an LLM
- invent a new patch
- mutate evidence
- mutate base/core profiles
- mutate sibling branches
- auto-promote changes upward

## Trust Settings

Trust settings can be read by future review/apply code, but this decision does not enable auto-apply.

For the first apply flow:

```text
user clicks Apply
  -> explicit apply
```

Not:

```text
trust setting says low risk
  -> invisible background apply
```

Doc 23 remains the storage boundary for trust policy. Runtime auto-apply needs a later decision with audit/events and undo/review.

## Night Photography UX Example

User saves a note:

```text
Long exposure at ISO 3200 made the sky noisy.
```

Kortex classifies it as:

```text
ISO
```

User corrects it to:

```text
noise_control
```

Kortex may show:

```text
Suggested branch improvement

Add "noise_control" to Night Photography.

Low risk
This adds one branch-local subtag. It does not change the Photography Core or rewrite old notes automatically.

[Apply] [Ask why] [Postpone] [Reject]
```

If the user clicks Apply:

```text
Night Photography branch gets "noise_control".
Photography Core remains unchanged.
Old notes remain unchanged unless a later backfill proposal is reviewed.
```

If this appears across many photography branches later, Kortex may separately propose an upward merge:

```text
Promote "noise_control" to Photography Core?
```

That is not part of this first branch-local apply flow.

## Relationship To Existing Decisions

- **Doc 19:** proposals are stored as `profile_change_proposals` and do not apply themselves.
- **Doc 20:** Conceptualize is the first correction surface and can create evidence/proposals.
- **Doc 21:** accepted proposals compile to typed Kortex operations after revalidation.
- **Doc 23:** trust settings store user policy but do not run auto-apply.
- **Doc 13:** parent/base profiles stay clean until an approved merge path exists.

## Implemented Slices And Next Work

The first pure helper slice is implemented:

```text
src/features/ontology/branchLocalProposalApply.ts
src/features/ontology/__tests__/branchLocalProposalApply.test.ts
```

Implemented behavior:

- compile a pending branch-target `ProfileChangeProposal` into a typed `apply_profile_patch_to_branch_overlay` operation
- reject `branch_merge` proposals because upward merge has a separate future runtime
- revalidate target kind, branch id, base profile id, branch kind, apply timestamp, branch drift after compile, duplicate patch ids, and basic patch freshness
- apply the operation to a copied branch value by merging the `ProfilePatch` into that branch's overlay
- return an accepted proposal value with `reviewedAt`, `appliedAt`, and `updatedAt`
- clone patch payloads on both the operation and accepted proposal result
- treat relationship type ids as opaque profile relationship ids for now; they are not required to have matching ontology nodes because the current coding profile uses bare ids such as `prerequisite`, `related`, and `contrast`
- keep the helper pure: no DB/client imports, no repo calls, no UI, no LLM calls

Verification after this helper slice:

```powershell
node node_modules\typescript\bin\tsc -p tsconfig.json --noEmit
npm.cmd test -- --run src/features/ontology/__tests__/branchLocalProposalApply.test.ts src/features/ontology/__tests__/profileChangeProposalCodec.test.ts src/features/ontology/__tests__/profileBranches.test.ts src/__tests__/stage10-architecture-guards.test.ts
```

Result: TypeScript clean; targeted branch-local apply/proposal/branch/guard tests 84/84 passed across 4 files; full suite 732/732 passed across 77 files; `git diff --check` clean with CRLF warnings only.

The first persistence-backed apply service slice is also implemented:

```text
src/features/ontology/data/branchLocalProposalApplyService.ts
src/features/ontology/__tests__/branchLocalProposalApplyService.test.ts
```

Implemented behavior:

- loads the pending proposal by id inside a DB transaction
- requires a profile-branch target before loading a branch
- loads the target `ProfileBranch`
- accepts the caller-provided `baseProfile` instead of resolving runtime activation inside persistence
- calls the pure `applyBranchLocalProfileChangeProposal()` helper
- conditionally writes the updated branch only if the branch row still has the expected `updatedAt`
- conditionally marks the proposal accepted only if the proposal row is still `pending` and still has the expected `updatedAt`
- throws explicit service conflicts if either conditional write fails, so accidental double-apply/concurrent apply does not silently overwrite
- exports only from the ontology data barrel, not the root ontology barrel

Verification after the service slice:

```powershell
node node_modules\typescript\bin\tsc -p tsconfig.json --noEmit
npm.cmd test -- --run src/features/ontology/__tests__/branchLocalProposalApplyService.test.ts src/features/ontology/__tests__/branchLocalProposalApply.test.ts src/features/ontology/__tests__/profileChangeProposalCodec.test.ts src/features/ontology/__tests__/profileBranches.test.ts src/__tests__/stage10-architecture-guards.test.ts
```

Result: TypeScript clean; targeted service/apply/proposal/branch/guard tests 91/91 passed across 5 files; full suite 739/739 passed across 78 files; `git diff --check` clean with CRLF warnings only.

The first minimal review UI slice is also implemented:

```text
src/features/ontology/ui/ProfileProposalReviewEntry.tsx
src/features/ontology/ui/ProfileProposalReviewScreen.tsx
src/features/ontology/ui/profileProposalReviewPresentation.ts
src/features/ontology/hooks/useProfileChangeProposals.ts
src/features/ontology/hooks/useApplyProfileChangeProposal.ts
src/features/ontology/hooks/useReviewProfileChangeProposal.ts
src/features/ontology/data/profileChangeProposalReviewService.ts
src/features/learning/ui/LearningHubScreen.tsx
```

Implemented behavior:

- shows a Learning Hub entry only when pending profile-change proposals exist
- opens a review queue/detail modal without a new route
- lists pending proposals and shows target, kind, risk blast-radius language, semantic confidence, user-fit confidence, patch summary, reason, and evidence ids
- wires Apply to `applyPendingBranchLocalProfileChangeProposal()` through a React Query hook that resolves the base profile above the data service
- wires Reject and Postpone through a tiny data-layer review-status service with pending/status conditional writes
- keeps Ask why / why not explanation-only with no mutation
- maps branch/proposal conflict and pure apply errors to user-facing messages
- keeps UI out of base/core mutation, upward merge, old-card backfill, edit-then-apply, auto-apply, checker runtime, and event-history presentation

Post-review hardening:

- `useApplyProfileChangeProposal` maps missing base profiles to `base_profile_not_found` and invalidates both proposal keys and future branch keys on success.
- Review messages now carry explicit success/error tone instead of inferring tone from English text.
- Apply no longer auto-closes the modal before the user can see success feedback.
- Non-branch-target proposals are visibly not applicable in this first surface, and Apply is disabled for them.
- The UI resets reason/message state after actions and disables list switching while an action is pending.
- Patch summaries include ontology-node labels/ids where available.
- Presentation tests cover non-branch risk wording, ontology-node summary labels, and every known mapped error code.

Verification after the UI slice:

```powershell
node node_modules\typescript\bin\tsc -p tsconfig.json --noEmit
npm.cmd test -- --run src/features/ontology/__tests__/profileChangeProposalReviewService.test.ts src/features/ontology/__tests__/profileProposalReviewPresentation.test.ts src/features/ontology/__tests__/branchLocalProposalApplyService.test.ts src/features/ontology/__tests__/branchLocalProposalApply.test.ts src/features/ontology/__tests__/profileChangeProposalCodec.test.ts src/features/ontology/__tests__/profileBranches.test.ts src/__tests__/stage10-architecture-guards.test.ts
npm.cmd test -- --run
```

Result: TypeScript clean; targeted review/apply/proposal/branch/guard tests 101/101 passed across 7 files; full suite 749/749 passed across 80 files; `git diff --check` clean with CRLF warnings only.

Follow-up slice implemented after this document:

```text
Doc 25 added proposal event/audit storage.
Apply / Reject / Postpone now append profile_proposal_events inside the same guarded transactions as the proposal/branch state changes.
```

The next code slice should be one of:

1. Broader merge-path tests for `overrideMetadataFields`, `overrideOntology`, and graph sub-maps.
2. Review UI polish once seeded real proposals exist in the app.
3. User-fit projection over proposal events.
4. Context-pack assembly for checker/proposal review.

Recommended next code slice:

```text
User-fit projection over proposal events, or context-pack assembly for checker/proposal review.
```

Reason: the UI can now accept/reject/postpone proposals and those decisions have durable audit events. The next layer can either turn those facts into user-fit signals or assemble better context for checker/proposal review.
