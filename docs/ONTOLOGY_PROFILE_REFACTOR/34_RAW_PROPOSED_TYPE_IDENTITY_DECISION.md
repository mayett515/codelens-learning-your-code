# Raw Proposed Type Identity Decision

Status: locked and implemented.

## Decision

`rawProposedTypeNodeId` remains a legacy string projection. It is no longer the primary in-memory identity for what Kordex originally proposed.

The live save flow now carries a structured `RawProposedTypeIdentity`:

```ts
type RawProposedTypeIdentity =
  | {
      kind: 'scoped_ref';
      scopeId: string;
      nodeId: string;
      source: 'conceptualize' | 'extractor';
    }
  | {
      kind: 'unresolved_raw';
      rawNodeId: string;
      source: 'extractor';
      activeScopeId: string | null;
    };
```

The old `rawProposedTypeNodeId?: string | null` field stays only as compatibility output for existing correction evidence persistence.

## Why

Kordex now supports branch/core scoped ontology refs. A bare string such as `pattern` is no longer enough to say what the system meant:

- `coding:pattern` is a scoped, valid ontology ref.
- `react_branch:pattern` may be a different scoped meaning.
- `hallucinated_runtime_kind` may be a raw extractor mistake that was never a valid node.

Those cases should not be collapsed into one string shape.

## Locked Shape

Conceptualize classifier output:

- Valid classifier refs become `kind: 'scoped_ref'`.
- The legacy string projection is derived with `scopeId:nodeId`.

Legacy extractor normalization mistakes:

- If the old extractor invents an unknown type and the save flow normalizes it to the active profile default, the original raw id becomes `kind: 'unresolved_raw'`.
- `activeScopeId` records where the normalization happened, but it does not pretend the raw id is a valid scoped ontology ref.

Correction persistence:

- Existing correction evidence still receives `rawProposedTypeNodeId` as a string.
- The structured identity is canonical in memory; persistence JSON/columns for structured raw identity are a later migration decision.

## Explicit Non-Goals

This slice does not add:

- DB migration for structured raw identity.
- near-miss diagnostic persistence.
- correction-evidence history readers.
- missing-concept UI.
- proposal creation from diagnostics.
- automatic ontology/profile mutation.
- user-fit projection.
- checker runtime.

## Compatibility Rule

When both structured identity and legacy string are present, structured identity wins and the legacy string is ignored.

This lets callers migrate safely:

```text
RawProposedTypeIdentity -> legacy rawProposedTypeNodeId projection -> existing evidence table
```

The reverse is only a compatibility fallback and should not become the future source of truth.
