# Adaptive Suggestion Policy Decision

**Status:** Locked decision on 2026-05-11. Docs-only decision; no runtime/source implementation in this slice.
**Branch:** `refactor/ontology-profile`

## Locked Decision

Correction evidence, patch suggestions, manual ontology edits, relationship changes, and merge proposals use one shared safety policy:

```text
evidence stays factual
suggestions stay separate
user trust controls how much help the system may apply
risk overrides trust
base/core changes always require explicit approval
```

In plain terms:

1. **Correction evidence remains a fact.** It records what the user corrected and where it happened. It does not mutate a profile, branch, relationship type, or old capture.
2. **Suggestions are separate from evidence.** A checker/model can later propose a tag, subtag, boundary rule, relationship, or merge target, but that proposal is not the same object as the evidence.
3. **Default mode is conservative suggest-first.** The app should normally say "I found a possible change. Review?" rather than silently changing the ontology.
4. **Manual creation is allowed.** A user may directly create a tag, subtag, relationship type, or boundary rule. That is a structured ontology edit, not correction evidence.
5. **Manual creation still needs structure.** The app should validate the edit, preview impact, ask where it belongs, and preserve audit/undo.
6. **Personal layer is a branch kind.** In Kortex terms, a personal layer is functionally a branch with `branchKind: 'personal'`. It uses the same branch/overlay machinery, but its product meaning is "this user's preferences and corrections".
7. **Relationship tags are also adaptive.** Relationship labels such as `invalidates`, `depends_on_query_key`, `refetches_after`, `causes_stale_state`, or `fixes` can be suggested, reviewed, trusted, or manually created under the same policy as tags/subtags.
8. **Adaptive behavior uses confidence plus risk.** The system combines semantic confidence, user-fit confidence, scope/risk, and the user's trust mode.
9. **Risk overrides trust.** Even a user who trusts the system a lot should still be asked before broad rewrites, parent/base mutations, upward merges, or high-blast-radius relationship changes.
10. **Low-risk branch-local changes may auto-apply only if trust allows.** If auto-applied, the app must notify the user, keep an audit trail, and provide undo/review.

## Key Objects

| Object | Meaning |
|---|---|
| Correction evidence | A factual record: the user corrected something. |
| Patch suggestion | A proposed profile/branch/ontology change backed by evidence IDs and reasons. |
| Manual ontology edit | A user-authored change such as adding a tag, subtag, relationship, boundary rule, or example. |
| Relationship suggestion | A proposed new or changed relationship type/edge/label. |
| Trust mode | User setting that controls how much the app may do without asking first. |
| Semantic confidence | How sure the model/checker is that the change is technically/domain-correct. |
| User-fit confidence | How likely the change matches this user's past approvals and preferences. |
| Risk score | Estimated blast radius of applying the change. |

## Default Trust Mode

Default:

```text
Suggest first / Conservative
```

That means:

- A single correction stores evidence only.
- Repeated similar corrections can produce a suggestion.
- The suggestion is shown to the user before changing ontology or branch state.
- The user can accept, edit, reject, postpone, or manually create a different tag/rule/relationship.
- The app should not silently change the base profile, parent profile, or old captures.

This default is intentionally conservative because the ontology is not just UI text. Tags, subtags, relationship types, and boundary rules affect future extraction, graph structure, retrieval, review, and agent/app behavior.

## Trust Modes

Future UI can expose trust modes like:

```text
Manual only
  The system records evidence and can show possible suggestions, but never applies changes automatically.

Suggest first
  Default. The system proposes changes and waits for approval.

Trusted low-risk auto
  The system may auto-apply low-risk branch-local changes and notify the user.

Adaptive
  The system adjusts how often it asks based on accepted/rejected suggestions, but risk still overrides trust.
```

The exact labels can change later. The policy shape should not change without a new decision.

## Adaptive Confidence Model

Adaptive behavior should not rely on one vague "confidence" number.

Use separate inputs:

```text
semanticConfidence
  Is the proposed ontology/relationship change likely correct in the domain?

userFitConfidence
  Does this match the user's prior accepted/rejected suggestions and manual edits?

riskScore
  What is the blast radius if this is wrong?

trustMode
  How much permission has the user granted?
```

Examples:

- If the user repeatedly accepts "React hook state bug -> stale state" suggestions, user-fit confidence rises for that pattern.
- If the user rejects broad new relationship labels, user-fit confidence falls for that class of suggestion.
- If the model is semantically confident but the change affects the base coding profile, risk stays high and the user must approve.
- If the change is personal-branch-only, reversible, and similar to prior accepted changes, risk can be low enough for trusted auto-apply.

User-fit confidence is not a hidden personality file. It is derived from concrete system events: accepted suggestions, rejected suggestions, edited suggestions, undone changes, and manual creations.

## Risk Policy

Approximate risk bands:

```text
0-25:
  Low risk. Branch-local, reversible, narrow, no old data rewrite.
  May auto-apply only when trust mode allows.

26-50:
  Moderate risk. Still local, but affects future classification or relationship suggestions.
  Usually suggest first; adaptive mode may auto-apply only with strong user-fit history.

51-75:
  High risk. Affects many future items, creates a new relationship family, or changes behavior beyond one branch.
  Ask the user.

76-100:
  Very high risk. Parent/base mutation, upward merge, broad rewrite, old data rewrite, external write-back, agent policy, or app-builder behavior.
  Always ask the user.
```

Risk inputs:

- Personal branch only: lower risk.
- Project branch only: medium risk.
- Learning branch only: medium risk.
- Parent/base profile: high risk.
- Merge upward into parent/base: high risk.
- Rewrite old captures/items: high risk.
- Add a new relationship type: medium/high risk depending on scope.
- Change an existing relationship type meaning: high risk.
- Change agent/app execution policy: very high risk.
- External system write-back: very high risk.

## Relationship Trust

Relationship changes follow the same policy as tag/subtag changes.

Examples:

```text
invalidates
depends_on_query_key
refetches_after
causes_stale_state
fixes
```

The system may notice patterns and propose:

- a new relationship type
- a clearer relationship label
- a boundary rule for when a relationship should or should not be used
- relationship edges between existing items
- a relationship-family split when one label is doing too much

Default behavior:

```text
Propose -> user reviews -> accepted change applies to selected branch/layer
```

Trusted behavior can later allow low-risk relationship edges to be added inside a branch with a visible notification, audit trail, and undo.

High-risk relationship changes always need approval:

- creating/changing relationship type semantics in a base profile
- merging relationship type changes upward
- rewriting many existing relationship edges
- changing relationships that drive agent permissions, app generation, or external write-back

## Manual Tag/Subtag/Relationship Creation

Manual creation is allowed because the user may know the right ontology before the model does.

The safe flow should be:

```text
define
  User names the tag/subtag/relationship/rule and gives meaning/examples.

validate
  The app checks duplicates, conflicts, empty fields, invalid parent, and boundary rules.

preview impact
  The app shows possible affected older items and future classification behavior.

choose target layer
  Personal branch, project branch, learning branch, or base profile.

apply with audit
  Store the ontology/profile change as a durable branch/base operation with timestamp/provenance.

review backfill
  The app may say: "I found older items that may belong here. Review?"
```

Old data should not be rewritten automatically. Backfill is a separate reviewed suggestion queue.

## Personal Layer

The personal layer is not a different storage mechanism.

It is:

```text
ProfileBranch.branchKind = 'personal'
```

Product meaning:

- user-specific naming habits
- user-specific correction preferences
- preferred ontology boundaries
- trusted relationship patterns
- personal examples and "is not" rules

Because it is still a branch, it composes with the same runtime precedence rules:

```text
personal overlay
  > learning overlay
    > project overlay
      > base profile
```

Personal changes should not silently mutate the base profile or sibling branches. They can later be suggested for merge upward, but that requires review.

## Notifications, Audit, And Undo

Any auto-applied low-risk change must leave a visible trail.

The app should be able to tell the user:

```text
I added 3 low-risk relationship edges in your personal branch.
Review / Undo
```

Audit should record:

- what changed
- why it changed
- evidence IDs or source events
- confidence inputs
- risk score
- target branch/layer
- whether the user accepted, edited, rejected, or undid it

This audit trail is also what improves `userFitConfidence` later.

## What This Decision Is Not

This docs-only decision does not implement:

- `ontology_patch_suggestions` table
- merge proposal table
- trust setting storage
- adaptive confidence storage
- auto-apply engine
- relationship checker runtime
- correction UI
- manual ontology edit UI
- backfill review queue
- audit/undo implementation
- agent runtime
- app-builder runtime
- external write-back
- Racket/Kortex DSL runtime

## Relationship To Existing Decisions

- **Doc 12:** Correction evidence remains evidence-shaped. This policy explains what can happen later after evidence accumulates.
- **Doc 13:** Branches and overlays remain the durable change containers. Suggestions may target a branch/base later, but only after review policy allows it.
- **Doc 14:** Active selection tells the system where the mistake happened. It is not the same as the apply target.
- **Doc 17:** User-created base profiles remain independent cores by default. A new photography/lisp/work-notes core does not inherit coding ontology unless the user deliberately imports/forks/links it.
- **Doc 19:** Patch suggestions, relationship suggestions, branch merge proposals, and manual drafts share the `profile_change_proposals` concept. This document defines the safety policy; doc 19 defines the proposal storage/review shape.
- **Doc 06:** Parent profiles stay clean. Upward merge requires approval.
- **Doc 07:** Agent/subagent and self-building-app behavior remain future architecture. Risk for those areas is always very high until explicitly implemented.

## Next Implementation Candidates

After this decision, good next slices are:

1. First correction/proposal UI surface decision: where the user corrects type/tag classification and reviews stored proposals.
2. Trust setting storage decision: where conservative/suggest-first/adaptive settings live.
3. Relationship suggestion decision: how relationship type suggestions differ from relationship edge suggestions.
4. Proposal apply/base-versioning decision: how accepted `ProfilePatch` rows safely change base profiles.

## Hard Boundaries

- Do not merge evidence and suggestions into one object.
- Do not auto-apply parent/base changes.
- Do not rewrite old captures/items automatically.
- Do not let personal branch changes mutate sibling branches.
- Do not make relationship changes bypass review just because they are model-generated.
- Do not implement agent/app-builder/external write-back behavior under this policy without a separate decision.
