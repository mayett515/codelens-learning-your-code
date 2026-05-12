# Conceptualize Preview And Correction Surface Decision

**Status:** Locked decision on 2026-05-11. Docs-only decision; no source/UI implementation in this slice.
**Branch:** `refactor/ontology-profile`

## Locked Decision

The first correction surface should live inside the **Conceptualize** flow.

In product terms, the current "save as learning" action should grow into:

```text
Conceptualize
  Turn selected code/text into a structured Kortex learning card.
```

Conceptualize is not only a save button. It is the point where raw input becomes a structured Kortex object:

```text
raw input
  -> draft card
  -> classification
  -> optional correction
  -> mistake-understanding evidence
  -> safe branch-local ontology improvement or later proposal
```

## Core Rule

Kortex must always understand what it got wrong.

When the user corrects a proposed classification, relationship, boundary, title, or summary, Kortex should store more than the final corrected value. It should preserve:

- what Kortex proposed
- what the user corrected it to
- where the mistake happened: active base profile plus active project/learning/personal branches
- optional user reason or boundary note
- whether the correction used an existing ontology node or required a new one

This remains true even when no new tag, subtag, relationship, or boundary is created.

## First Conceptualize Shape

The first Conceptualize implementation should be a safe correction doorway, not the full Kortex ontology editor.

Recommended first flow:

```text
select code/text
  -> click Conceptualize
  -> show draft learning card before final save
  -> user accepts or corrects the draft
  -> save corrected card
  -> store correction evidence for any model/user mismatch
```

The preview should show the user enough to catch obvious mistakes:

- title
- summary
- proposed item type/tag/subtag
- active core/profile/branch context when relevant
- any obvious proposed relationship or boundary if the extractor already has it

The preview should allow:

- accept as-is
- correct to an existing tag/subtag/type
- create a new tag/subtag if missing
- add a short "why this is X / why this is not Y" correction note
- save the corrected card

## New Tags And Subtags During Conceptualize

If the user creates a new tag/subtag during Conceptualize, that is an ontology/profile change, not just a one-off label.

Kortex should validate the new node against the composed active profile:

```text
base profile
  + project branch
  + learning branch
  + personal branch
  = active composed profile
```

Validation should check whether:

- the tag/subtag already exists
- a very similar node already exists
- the proposed parent makes sense
- the new node conflicts with existing `is` / `is not` boundaries
- the change belongs in the active branch/layer or should become a proposal

Default target for new ontology nodes created from Conceptualize:

```text
active branch/local layer first
```

Do not silently mutate the base/core profile. If the new node seems broadly useful, Kortex can later suggest an upward merge.

## Existing Correction Vs New Ontology

Different corrections produce different outcomes:

| User action | Immediate result |
|---|---|
| Correct to an existing tag/subtag | Save corrected card and store mistake evidence. |
| Create a new tag/subtag | Validate, apply branch-local ontology change if approved, save corrected card, store mistake evidence. |
| Add an `is not` / boundary note | Store evidence now; create a branch-local rule or proposal depending on risk. |
| Correct a relationship | Store evidence; branch-local relationship edges may be low-risk, relationship type semantics usually need proposal/review. |
| Suggest base/core change | Create proposal; require explicit review/approval. |

## Fully Polished Direction

The full mature Conceptualize flow can become a knowledge compiler:

- understand the item
- classify it into the active core/branch
- explain `is` and `is not` boundaries
- connect it to existing items
- detect mismatch and uncertainty
- let the user correct or teach Kortex
- store mistake-understanding evidence
- apply safe branch-local changes
- create proposals for broader changes
- suggest older items for review/backfill
- improve future behavior through accepted/rejected corrections

That larger capability should be layered. The default UI should stay simple, with advanced classification, relationship, and boundary controls available only when needed.

## What Conceptualize Is Not

Conceptualize must not become an invisible background ontology editor.

It does not implement:

- full ontology editor
- broad relationship designer
- automatic base/core mutation
- automatic upward merge
- old-item rewrite/backfill
- trust setting UI
- checker runtime
- proposal queue UI
- apply/merge service
- agent/subagent execution policy
- app-builder runtime
- external write-back

## Relationship To Existing Decisions

- **Doc 12:** Every correction produces factual correction evidence and does not mutate profiles by itself.
- **Doc 13:** Branch overlays are the durable container for branch-local ontology changes.
- **Doc 14:** Active selection tells Kortex where the correction happened.
- **Doc 18:** Default behavior is conservative suggest-first; risk overrides trust.
- **Doc 19:** Broader fixes become `profile_change_proposals`; proposals do not apply themselves.

## Recommended Next Implementation Slice

After this docs-only decision, a good first implementation slice is:

```text
Rename/wire the save-as-learning entry toward Conceptualize preview behavior.
Add a draft preview surface before final save.
Allow correction to an existing type/tag/subtag.
Persist correction evidence when the user changes the model proposal.
Do not create new ontology nodes yet unless that branch-local creation flow is explicitly scoped.
```

The next decision before implementation should lock the exact first UI scope:

```text
existing-tag correction only
or
existing-tag correction + branch-local new tag/subtag creation
```

## Hard Boundaries

- Do not treat Conceptualize as the whole Kortex ontology editor.
- Do not mutate base/core profiles from Conceptualize without explicit proposal review.
- Do not rewrite older cards automatically.
- Do not discard the model's wrong proposal when the user corrects it.
- Do not store only the final corrected label; store what Kortex misunderstood.
- Do not let relationship creation bypass the same trust/risk policy as tags and subtags.
