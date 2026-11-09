# Base Profile Versioning Decision

Date: 2026-05-28

## Decision

Base-profile proposals must carry the base profile version they were created against.

This started as the first base/core safety gate before any apply path could mutate a base profile. A proposal that targets a base profile now has an optional `targetProfileVersion` field. New base-targeted Conceptualize proposals fill it from the active `DomainProfile.version`.

Base apply code must reject the proposal if:

- the proposal does not target a base profile
- the proposal targets a different base profile id
- `targetProfileVersion` is missing
- `targetProfileVersion` no longer matches the current base profile version

Branch-local proposals keep using the existing branch `updatedAt` guard. They must not set `targetProfileVersion`.

## Plain-Language Shape

If Kordex says:

> Add this new tag to the coding core.

it now also remembers:

> I made this suggestion while the coding core was version 1.

Later, if the coding core has already changed to version 2, Kordex must not blindly apply the old suggestion. It has to refresh, revalidate, or create a new proposal.

This is the same safety idea as applying a patch to the file version it was created from, not to a file that may have changed underneath it.

## What This Enables

This made base/core apply safe enough to design and now anchors the implemented helper/service below.

The base apply flow is:

```text
user accepts base-profile proposal
-> load current base profile
-> assert proposal.targetProfileVersion == currentProfile.version
-> revalidate patch against current ontology/profile
-> create next profile version
-> write audit event
```

The version snapshot is not enough by itself. Apply still needs patch revalidation, operation compilation, transaction handling, and audit events. History/reversal semantics remain future work.

## Initial Versioning Slice Boundaries

This boundary list describes the first versioning-only slice. Later sections in this same document record the subsequent base apply helper/service and review UI wiring that became valid after the version guard existed.

This slice does not add:

- base profile apply service
- base profile mutation
- profile version history table
- automatic version creation
- branch merge into base/core
- proposal edit flow
- stale proposal refresh flow
- old-card backfill
- checker runtime
- UI behavior changes
- auto-apply
- agent runtime
- app-builder runtime
- DSL runtime

## Implementation

Added:

- `src/db/migrations/022-profile-change-proposal-target-version.ts`
- `src/db/migrations/__tests__/profile-change-proposal-target-version-migration.test.ts`
- `src/features/ontology/baseProfileVersioning.ts`
- `src/features/ontology/__tests__/baseProfileVersioning.test.ts`

Updated:

- `src/db/migrations/index.ts`
- `src/db/schema.ts`
- `src/features/ontology/types.ts`
- `src/features/ontology/index.ts`
- `src/features/ontology/codecs/profileChangeProposal.ts`
- `src/features/ontology/data/profileChangeProposalRepo.ts`
- `src/features/backup/columnMaps.ts`
- `src/features/backup/format.ts`
- `src/features/backup/__tests__/profile-columns.test.ts`
- `src/features/learning/services/saveConceptualizedCapture.ts`
- `src/features/learning/services/__tests__/conceptualizeCorrections.test.ts`
- `src/features/ontology/__tests__/profileChangeProposalCodec.test.ts`
- `src/__tests__/stage10-architecture-guards.test.ts`

New behavior:

- Migration 022 adds `profile_change_proposals.target_profile_version`.
- Backup `SCHEMA_VERSION` is now 22.
- `ProfileChangeProposal.targetProfileVersion` is persisted and restored.
- Branch-target proposals reject non-null `targetProfileVersion`.
- New base-targeted Conceptualize proposal rows snapshot `context.profile.version`.
- `assertBaseProfileProposalTargetsCurrentVersion(input)` is a pure guard for future apply code.

## Follow-Up Gates

1. Richer missing-concept edit/apply flows once base/core apply is available from review UI.

## Implementation Update - Base Apply Helper/Service

This first base/core apply helper/service seam was implemented before review UI wiring; the later section records the explicit review UI path.

Added:

- `src/features/ontology/baseProfileProposalApply.ts`
- `src/features/ontology/data/baseProfileProposalApplyService.ts`
- `src/features/ontology/__tests__/baseProfileProposalApply.test.ts`
- `src/features/ontology/__tests__/baseProfileProposalApplyService.test.ts`

Updated:

- `src/features/ontology/data/profileDefinitionRepo.ts`
- `src/features/ontology/index.ts`
- `src/features/ontology/data/index.ts`
- `src/__tests__/stage10-architecture-guards.test.ts`

Behavior:

- `compileBaseProfileProposalApplyOperation(input)` creates a typed `apply_profile_patch_to_base_profile` operation only for pending base-target proposals.
- `applyBaseProfilePatchOperation(input)` applies that operation to the expected persisted `ProfileDefinition`.
- `applyBaseProfileChangeProposal(input)` returns the next profile definition version and accepted proposal.
- `applyPendingBaseProfileChangeProposal(input)` loads proposal + profile definition in one transaction, writes the new profile definition version, marks the proposal accepted, and appends an `applied` proposal event.

Safety:

- Base apply calls `assertBaseProfileProposalTargetsCurrentVersion(input)` before mutation.
- Patch revalidation rejects duplicate ids, add-existing-node conflicts, override-missing-node conflicts, item type ids without matching nodes, and duplicate/existing relationship ids.
- Base apply intentionally keeps relationship type ids opaque, matching the locked branch-local decision: ids such as `prerequisite` and `related` do not currently require matching ontology nodes.
- `overrideOntology.nodes` remains a legacy-shaped additive compatibility field and is tested as add-only before UI wiring.
- Base-targeted proposals now validate that `target.profileId` matches `baseProfileId`.
- Service docs call out the three error families UI wiring must handle: service lookup/write conflicts, pure apply errors, and base-versioning errors.
- Profile definition writes are conditional on expected profile version and `updatedAt`.
- Proposal writes are conditional on pending status and expected `updatedAt`.
- Branch merge proposals still require a dedicated future merge helper.
- Root ontology exports only the pure helper; the DB-backed apply service stays behind `src/features/ontology/data`.

## Implementation Update - Review UI Wiring

The proposal review surface can now apply base/core proposals explicitly.

Updated:

- `src/features/ontology/hooks/useApplyProfileChangeProposal.ts`
- `src/features/ontology/ui/ProfileProposalReviewScreen.tsx`
- `src/features/ontology/ui/profileProposalReviewPresentation.ts`
- `src/features/ontology/__tests__/useApplyProfileChangeProposal.test.ts`
- `src/features/ontology/__tests__/profileProposalReviewPresentation.test.ts`

Behavior:

- Branch-target proposals continue to use `applyPendingBranchLocalProfileChangeProposal()`.
- Base-target proposals now use `applyPendingBaseProfileChangeProposal()` directly.
- Apply remains explicit; no trust setting or auto-apply path was added.
- Base/core proposals use stronger blast-radius copy and an `Apply to core` action label.
- Stale/missing base-version, base-definition, write-conflict, unsupported proposal-kind, and base patch-conflict errors map to user-facing review messages.
- Reject, Postpone, and Ask why stay shared and unchanged.

Still not added:

- automatic base/core mutation
- stale proposal refresh flow
- profile version-history table
- branch merge into base/core
- auto-apply
- checker runtime
- old-card backfill
- agent runtime
- app-builder runtime
- DSL runtime
