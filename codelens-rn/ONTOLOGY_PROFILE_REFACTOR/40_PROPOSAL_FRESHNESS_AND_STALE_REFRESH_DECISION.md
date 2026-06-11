# Proposal Freshness And Stale Refresh Decision

Date: 2026-06-10

Status: locked decision; branch revision snapshots, pure freshness helper, review readout, and explicit refresh/rebase creation implemented.

## Decision

Proposal freshness is separate from proposal review status.

The current proposal status lifecycle stays:

```text
pending -> accepted
pending -> rejected
pending -> postponed
pending -> superseded
```

Freshness is a derived review condition over a proposal and its target state:

```text
fresh
unknown
stale_refreshable
conflicted
obsolete
```

Do not add `stale` as a proposal status in this layer. A proposal can still be
`pending` while Kordex knows it is stale or conflicted. The user-facing review
surface should show that condition and block or redirect unsafe apply, but the
proposal row remains historical proposal state.

## Why

Review status answers:

```text
What did the user do with this proposal?
```

Freshness answers:

```text
Does this proposal still fit the target it was created for?
```

Those are different facts. Combining them would make proposal history harder to
understand and would turn transient target drift into permanent review state.

## Required Basis Metadata

A proposal needs enough target-basis data to revalidate itself before review,
apply, edit, refresh, or checker reuse.

Already implemented:

- base/core proposals snapshot `targetProfileVersion`
- branch-target proposals snapshot `targetBranchUpdatedAt` from the target
  branch `updatedAt` value at proposal creation time
- proposal rows store target kind/id, evidence ids, patch JSON, created/updated timestamps
- apply services revalidate patches and fail closed on write conflicts
- `evaluateProfileProposalFreshness(input)` derives `fresh`, `unknown`,
  `stale_refreshable`, `conflicted`, or `obsolete` from a proposal plus
  caller-supplied target facts
- proposal review loads current target facts, shows freshness before Apply,
  and blocks Apply unless freshness is `fresh`
- `refreshStaleProfileChangeProposal(input)` creates a refreshed replacement
  pending proposal with the current target-basis snapshot, supersedes the old
  pending proposal, and writes a `superseded` audit event in one transaction
- proposal review shows `Refresh proposal` only when freshness is
  `stale_refreshable`, then selects the replacement proposal for normal review

Legacy behavior:

- older branch proposals without that snapshot have `unknown` freshness, not
  `fresh`

## Freshness Evaluation

Freshness evaluation is read-only. It must not mutate the proposal, target
branch, base profile, evidence, user-fit scores, trust settings, or ontology.

Base/core proposals:

- `fresh` when the target profile exists and `proposal.targetProfileVersion`
  equals the current base profile version
- `unknown` when the proposal lacks a target profile version
- `stale_refreshable` when the target profile exists but the version is older
- `obsolete` when the target profile no longer exists
- `conflicted` when the patch no longer validates against the current target

Branch proposals:

- `fresh` when the target branch exists and the proposal's target branch
  `updatedAt` snapshot equals the current branch `updatedAt`
- `unknown` when the proposal lacks a branch revision snapshot
- `stale_refreshable` when the target branch exists but changed after the
  proposal was created
- `obsolete` when the target branch no longer exists
- `conflicted` when the patch no longer validates against the current composed
  branch/base target

The first implementation can evaluate only the data that exists. Unknown is a
valid and honest result for legacy rows or proposals that lack branch-basis
metadata.

## Refresh / Rebase Semantics

Refresh is explicit and proposal-first.

Refreshing a stale proposal must not edit the old proposal in place and must not
apply the refreshed patch automatically.

Preferred durable shape:

```text
old pending proposal
  -> create refreshed replacement pending proposal
  -> supersede old proposal with supersededByProposalId
  -> user reviews replacement proposal
  -> explicit Apply / Reject / Postpone
```

This reuses the existing superseding lifecycle from docs 25 and 39. The old
proposal stays as history. The replacement proposal contains the refreshed
patch, refreshed reason, target-basis snapshot, and provenance pointing back to
the previous proposal.

If Kordex cannot refresh safely, it should explain why and leave the proposal
pending, postponed, or rejected only through explicit review action.

## What The User Sees

Proposal review should distinguish:

- "Ready to apply"
- "Target changed; refresh before applying"
- "Target changed in a way I cannot safely refresh"
- "Target no longer exists"
- "I cannot verify freshness for this older proposal"

This should be visible before the user clicks Apply when possible. Apply
services still remain the final safety gate and must continue to reject stale,
conflicting, or write-conflicted proposals.

## What Refresh Does Not Do

Refresh does not:

- auto-apply the replacement proposal
- mutate base/core or branch state
- rewrite correction evidence
- rewrite old cards
- silently widen branch proposals to base/core
- propagate to sibling branches
- change trust settings
- create checker volume
- call an agent/app-builder/DSL runtime

## Relationship To Existing Decisions

- **Doc 21:** proposal review must revalidate freshness before showing or
  applying stale proposals.
- **Doc 24:** branch-local apply remains explicit, atomic, and branch-local.
- **Doc 25:** audit events stay append-only; superseding is the durable link
  between old and replacement proposals.
- **Doc 38:** base/core proposals already use `targetProfileVersion` as their
  version basis.
- **Doc 39:** edited/refreshed proposals should create replacements and
  supersede old pending proposals instead of mutating history.

## Recommended Implementation Sequence

1. Add branch target revision snapshot storage for profile-change proposals. Done.
2. Populate branch target snapshots wherever branch-target proposals are
   created. Done for Conceptualize-created new-subtype proposals.
3. Add a pure proposal freshness helper that derives freshness from a proposal
   plus caller-supplied target facts. Done.
4. Show freshness readout in the proposal review surface. Done.
5. Only after that, add explicit refresh/rebase creation that creates a
   replacement pending proposal and calls the existing superseding lifecycle.
   Done.

Refresh creation is explicit and proposal-first. Do not add automatic refresh,
checker proposal volume, or silent Apply in the same path.
