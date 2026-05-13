# Trust Setting Storage Decision

**Status:** Locked and storage-only v1 implemented on 2026-05-13.
**Branch:** `refactor/ontology-profile`

## Locked Decision

Trust settings are separate from correction evidence and separate from proposals.

```text
evidence = what happened
proposal = possible change
trust setting = what the user lets Kortex do without asking
```

The first implementation stores trust policy per base profile or per profile branch:

```text
profile_trust_settings
  base_profile target
  or
  profile_branch target
```

Default behavior is still `suggest_first`.

## Why This Is Separate

Trust settings are not evidence because they are not facts about a correction.

Trust settings are not proposals because they are not suggested ontology changes.

Trust settings are user policy. Later proposal review/apply code can read that policy, but this slice does not apply anything.

## Implemented Storage V1

Implemented:

- `ProfileTrustMode`
- `ProfileTrustSetting`
- migration 018: `profile_trust_settings`
- Drizzle schema
- strict codec
- ontology data-boundary repo
- backup/export/import/clear/columnMaps support
- backup format 7 / schema version 18
- migration, codec, repo, backup, and stage10 guard tests

No UI, checker runtime, apply service, event store, user-fit projection store, or auto-apply engine was added.

Model review hardening follow-up:

- `scopeKey` is the durable natural key: one trust setting per target scope.
- `id` is still stable row identity for future audit/event references.
- `upsertProfileTrustSetting` preserves the existing `id` and `createdAt` on `scopeKey` conflicts and only updates mutable policy fields plus `updatedAt`.

## Trust Modes

Stored modes:

```text
manual_only
suggest_first
trusted_low_risk_auto
adaptive
```

Rules:

- `manual_only`: records evidence and can show suggestions, but does not auto-apply.
- `suggest_first`: default; proposals wait for review.
- `trusted_low_risk_auto`: may later allow low-risk branch-local auto-apply.
- `adaptive`: may later use user-fit history, but risk still overrides trust.

## Auto-Apply Boundary

The storage shape has fields for future auto-apply policy:

```text
autoApplyEnabled
maxAutoApplyRiskScore
autoApplyProposalKinds
```

But this slice does not run auto-apply.

Validation keeps the stored policy conservative:

- base-profile targets cannot enable auto-apply
- disabled auto-apply settings must have risk threshold `0`
- `manual_only` and `suggest_first` cannot enable auto-apply
- `trusted_low_risk_auto` cannot exceed risk score `25`
- `adaptive` cannot exceed risk score `50`
- `branch_merge` and `manual_draft` cannot be auto-applied

Allowed future auto-apply proposal kinds are only:

```text
classification_patch
ontology_node_patch
relationship_patch
```

Even those still require a future apply engine, audit events, notifications, and undo/review.

## User-Fit Learning

This slice did not add a separate user-fit history table.

2026-05-13 update: doc 25 now implements the first append-only proposal event table, `profile_proposal_events`. That table records accepted/rejected/postponed/asked-why proposal decisions as raw facts. It still does not calculate or store user-fit confidence projections.

Reason: user-fit confidence should be derived from concrete events:

- proposal accepted
- proposal rejected
- proposal edited
- proposal postponed
- auto-applied change undone
- manual ontology creation
- repeated correction patterns

Those event/audit records are a later decision from doc 21. For now, proposal rows can still carry `userFitConfidence`, but the durable setting row only stores user policy.

## Target Shape

Exactly one target is stored:

```text
target.kind = base_profile
  target.profileId = baseProfileId
  target.branchId = null

target.kind = profile_branch
  target.branchId = selected branch id
  target.profileId = null
```

`scopeKey` is stored so there is only one setting row per target scope:

```text
base_profile:coding
profile_branch:coding:personal-branch
```

## What This Decision Is Not

This does not implement:

- proposal review UI
- auto-apply
- apply/merge operations
- event/audit trail
- user-fit confidence projection
- checker runtime
- backfill
- base-profile versioning
- graph selection chat
- agent/app-builder runtime
- external write-back

## Relationship To Existing Decisions

- **Doc 18:** This implements the storage for trust modes from the adaptive suggestion policy.
- **Doc 19:** Proposals already store risk and confidence. Trust settings tell a future review/apply layer how much permission the user granted.
- **Doc 21:** User-fit learning belongs in future event/audit projections, not in the setting row.
- **Doc 22:** Conceptualize can create evidence/proposals now; later review/apply can consult these trust settings.
- **Doc 24:** The first review/apply seam stays explicit and branch-local; trust settings do not enable invisible background apply.

## Next Work

The next practical choices after doc 25's audit-event slice are:

1. User-fit projection over proposal events.
2. Context-pack assembly for checker/proposal review.
3. Base-profile versioning for accepted base/core changes.
4. Proposal event-history presentation in the review surface.
