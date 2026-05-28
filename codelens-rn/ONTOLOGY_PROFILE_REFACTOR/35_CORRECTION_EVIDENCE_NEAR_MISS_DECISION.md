# Correction Evidence Near-Miss Decision

Status: locked and implemented.

## Decision

Hidden Conceptualize diagnostic candidates may be snapshotted only when a user correction creates correction evidence.

The snapshot is stored as inert evidence on `ontology_correction_evidence.near_miss_candidates_json`. It is not a public tag list, not a proposal, not a confidence update, and not an ontology/profile mutation.

## Why

Conceptualize now has a singular public output:

- one primary classification
- confidence
- optional no-strong-match / suggested-new-concept state
- internal diagnostics

Those internal diagnostics can be useful after a correction. If Kordex suggested `star_trails`, but `long_exposure` was already its hidden second candidate, that is a near miss. The system should preserve that fact so a later checker or user-fit projection can understand the mistake pattern.

But saving every hidden candidate from every successful save would turn diagnostics into noisy durable state. The durable snapshot belongs only on correction evidence, where it explains an actual user correction.

## Stored Shape

```ts
interface OntologyCorrectionNearMissCandidate {
  scopeId: string;
  nodeId: string;
  rank: number;
  score?: number | null | undefined;
}
```

Persistence:

```text
ontology_correction_evidence.near_miss_candidates_json
```

Rules:

- `rank` starts at 2 because rank 1 is the public primary candidate.
- `score` is optional and bounded to 0..1 when present.
- refs are scoped: `(scopeId, nodeId)`.
- malformed JSON or malformed candidate records are rejected by the codec.

## Runtime Flow

```text
Conceptualize output diagnostics
  -> SaveModalCandidateData.conceptualizeNearMissCandidates
  -> user changes / confirms a correction
  -> OntologyCorrectionEvidence.nearMissCandidates
  -> ontology_correction_evidence.near_miss_candidates_json
```

Successful uncorrected saves do not persist near-miss diagnostics.

## Explicit Non-Goals

This slice does not add:

- visible extra tags.
- missing-concept UX.
- checker runtime.
- proposal creation from diagnostics.
- user-fit projection.
- automatic confidence/ranking updates.
- automatic ontology/profile mutation.
- DB-backed history readers.
- retrieval or graph traversal.
- old-card backfill.
- auto-apply.

## Product Meaning

Near-miss evidence helps Kordex learn from correction patterns later.

Example:

```text
previous public choice: star_trails
user corrected to: long_exposure
hidden candidate rank 2: long_exposure
```

That means Kordex was not totally wrong; it was unsure in a useful way. A later checker can use repeated near misses as evidence for a boundary-rule proposal, but this slice does not create or apply that proposal.
