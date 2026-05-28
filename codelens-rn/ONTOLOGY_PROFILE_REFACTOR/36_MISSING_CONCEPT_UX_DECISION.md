# Missing-Concept UX Decision

Status: locked and implemented.

## Decision

`noStrongMatch` becomes an explicit review state in the Conceptualize modal.

When Conceptualize cannot find a strong existing ontology placement:

- the capture candidate remains unresolved by default.
- Kordex shows that the type needs review.
- if the model supplied `suggestedNewConcept`, Kordex shows it as review metadata.
- the user may explicitly copy the suggestion into the existing new-subtype correction fields.
- saving without a selected existing type or filled new subtype remains an unresolved capture.

The suggestion is not copied into `conceptHint.proposedConceptType`, not treated as an existing node, and not applied automatically.

## Why

The product should not fake certainty when the current ontology is missing a good bucket.

But it also should not silently create ontology nodes just because the model suggested one. A missing concept is a useful draft for the user to inspect, not an ontology mutation.

This keeps the Conceptualize flow honest:

```text
Kordex says:
  "I do not see a strong existing type."

Optionally:
  "This might need a new subtype called X."

User decides:
  save unresolved
  choose an existing type
  manually enter a new subtype
  copy the suggestion into the new-subtype fields
```

## Implemented Shape

`SaveModalCandidateData` now carries optional review metadata:

```ts
conceptualizeMissingConcept?: {
  status: 'no_strong_match'
  confidence: number
  rationale: string
  suggestedNewConcept: null | {
    label: string
    kind: 'category' | 'subcategory' | 'tag' | 'relationshipType'
    parentNodeRef: null | { scopeId: string; nodeId: string }
    parentLabel: string | null
    meaning: string
    reason: string
  }
}
```

`conceptualizeClassification.ts` maps validated `noStrongMatch` output into that review metadata while keeping:

```text
conceptHint = null
rawProposedTypeIdentity = null
rawProposedTypeNodeId = null
```

The modal/card UI now:

- shows "Needs type review" on the candidate card.
- shows "No strong existing type" in correction controls.
- shows the suggested label/reason when present.
- exposes "Use suggestion" only as an explicit copy action into `newTypeLabel` / `reason`.

The Zustand save-learning store still initializes:

```text
newTypeLabel = ''
```

so suggestions are not auto-filled or auto-applied.

## Existing Apply Behavior

This slice reuses the already existing correction path:

- choosing an existing type and saving writes correction evidence.
- manually entering a new subtype and saving creates a guarded pending `ProfileChangeProposal`.
- copying a suggestion merely fills the same manual new-subtype fields.
- the new-subtype save path revalidates the explicit parent type id before creating a proposal.
- the new-subtype save path rejects labels that normalize to an existing non-item ontology node id.

No new proposal path was added.

## Explicit Non-Goals

This slice does not add:

- automatic missing-concept apply.
- automatic proposal creation from `suggestedNewConcept`.
- ontology/profile mutation from model output.
- branch overlay mutation.
- checker runtime.
- user-fit projection.
- DB-backed correction/proposal history readers.
- vector retrieval or graph traversal.
- confidence/ranking updates.
- old-card backfill.
- auto-apply.

## Product Meaning

In layman terms:

Kordex can now say, "I do not have the right bucket for this yet."

If it has a good idea for a new bucket, it can show that idea. But the user still has to choose it before it becomes a real pending ontology change.
