# Conceptualize First Implementation Scope Decision

**Status:** Locked and implemented on 2026-05-13.
**Branch:** `refactor/ontology-profile`

## Locked Decision

The first implemented Conceptualize correction loop supports:

```text
existing type correction
  + guarded new subtype proposal
```

This is the practical "B, but guarded" shape.

## What Ships Now

When the user opens the current save/capture flow, the modal now behaves as the first Conceptualize preview:

```text
selected code/text
  -> draft capture cards
  -> editable type classification
  -> optional why / why-not note
  -> save corrected card
  -> persist mistake-understanding evidence
```

Existing type corrections are applied immediately to the saved capture. If Kortex proposed `mechanism` and the user chooses `pattern`, the saved capture stores `pattern`, stale concept-link hints are cleared, and `ontology_correction_evidence` records:

- what Kortex proposed
- what the user corrected it to
- the active base/branch selection snapshot
- the user's optional note
- the saved capture id

## New Subtype Shape

The user can type a new subtype label from Conceptualize.

That label becomes a profile-defined type node id for the saved capture, but it does **not** silently mutate the base/core profile.

Instead, Conceptualize stores:

- correction evidence for the saved capture
- a pending `profile_change_proposals` row with an `ontology_node_patch`
- `addOntologyNodes` for the proposed new type node
- `addItemTypeNodeIds` for the new type id
- the highest-precedence active branch as target when one exists
- a base-profile target only as a pending proposal when no active branch exists

This means the capture can preserve the user's corrected classification immediately, while the durable ontology/profile change remains reviewable and revalidatable.

## Why Not Direct Branch Mutation Yet

Direct branch mutation from Conceptualize is allowed as a future product capability, but it needs the typed apply/revalidation path from doc 21.

The first implementation deliberately avoids:

- silent base/core mutation
- silent branch overlay writes
- old-card rewrites or backfills
- upward merge
- trust-mode auto-apply
- relationship edits
- proposal review UI
- full ontology editor behavior

## Compatibility Decision

Learning type ids now accept profile-defined strings.

The old coding `concept_type` compatibility column remains safe: custom/profile-defined type ids are written to `type_node_id`, while the legacy constrained column keeps a coding fallback. Existing coding views continue to work, and future branch/base profiles can introduce their own type ids without breaking capture storage.

Model-generated unknown type ids are not silently accepted. If the extractor returns a type id that is not in the active profile, `prepareSaveCandidates` falls back to the active profile default type. Creating a new subtype requires explicit user input in the Conceptualize preview and creates a guarded pending proposal.

2026-05-13 review update: the raw extractor type is still preserved when this fallback happens. The saved preview uses the normalized, profile-safe type id, while correction evidence can store `rawProposedTypeNodeId` so Kortex can later understand that the model originally proposed an invalid type such as `hallucinated_runtime_kind`.

## Source Scope

Implemented source pieces:

- project save sources carry `projectId`
- Conceptualize resolves project runtime profile context when a project id exists
- `prepareSaveCandidates` receives that composed profile
- the preview exposes type correction controls and a new subtype input
- `saveConceptualizedCapture` wraps `saveCapture`
- `saveCapture` supports an atomic `afterInsert` hook for evidence/proposal writes in the same transaction
- correction evidence and new-subtype proposals are written through the ontology data boundary

## Next Work

The next product/architecture decisions are now:

1. Trust setting storage for conservative/suggest-first/adaptive behavior.
2. Proposal review/apply UI for pending profile changes.
3. Typed apply operations that can safely write reviewed patches into branch overlays.
4. Context/event pack shape for checker/proposal/backfill flows.
5. Base profile versioning for accepted base/core operations.
