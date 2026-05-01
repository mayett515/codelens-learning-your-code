# Sandbox Keyword Categorization

This document describes the current keyword categorization behavior in the sandbox chat engine.

## Contract Shape

Keywords live in the contract `terms` array:

```json
{
  "id": "schema-cache",
  "label": "schema cache",
  "category": "risk",
  "subcategory": "stale",
  "depth": "deep",
  "spans": [{ "proseOffset": 72, "length": 12 }],
  "summary": "A memory cache for fetched and compressed tool schemas.",
  "detail": "The cache improves repeated lookups, but it needs a complete identity.",
  "promptHook": "Ask the model to identify cache key inputs and invalidation triggers.",
  "relatedTermIds": ["cache-key"]
}
```

`category` and `spans` are the important renderer fields. `subcategory` and `depth` are optional metadata for better inspection and future routing experiments.

## Categories

| Category | Meaning | UI Color |
|---|---|---|
| `risk` | Something that can go wrong or produce incorrect behavior. | Red |
| `concept` | An idea the user should understand before changing code. | Blue |
| `api` | A function, protocol, service call, provider contract, or interface. | Green |
| `data` | A data structure, field, cached value, schema shape, or payload. | Purple |
| `performance` | Speed, memory, latency, token budget, quota, or efficiency. | Orange |
| `test` | A test case, assertion, fixture, regression, or validation scenario. | Teal |

## Subcategories

Allowed subcategories:

| Area | Values |
|---|---|
| Risk | `auth`, `data-loss`, `stale`, `malformed` |
| Concept | `pattern`, `deprecation`, `versioning` |
| API | `endpoint`, `contract`, `lifecycle` |
| Data | `schema`, `payload`, `cache-state` |
| Performance | `latency`, `quota`, `tokens` |
| Test | `unit`, `integration`, `regression` |

Custom subcategories may use the `x-` prefix, for example `x-plugin`.

## Depth

Allowed depth values:

| Depth | Meaning |
|---|---|
| `surface` | Brief, lightweight explanation. |
| `moderate` | Normal explanation depth. |
| `deep` | More detailed analysis. |

The current UI displays depth in the term inspector and on term bricks. It does not yet route to different models based on depth.

## Span Rules

Inline keyword highlighting uses spans only.

Rules:

- `proseOffset` is zero-based.
- `proseOffset` must be a finite non-negative integer.
- `length` must be a finite positive integer.
- `prose.slice(proseOffset, proseOffset + length)` must exactly equal `label`.
- Matching is case-sensitive.

The UI does not guess inline highlights from labels. If a term has no valid span, its brick can still render below the message, but no inline highlight is inserted.

## Smart Categorization

`categorizationEngine.ts` provides a small strategy-based helper:

- `keywordStrategy` suggests metadata from label words.
- `contextStrategy` can use nearby severity/category context.
- `suggestCategorization()` returns a category/subcategory/depth suggestion plus votes.

The parser uses this conservatively:

- It does not override a valid model-provided `category`.
- It does not override valid model-provided `subcategory` or `depth`.
- It may infer missing `subcategory` and `depth` from the term label.
- Invalid explicit `subcategory` or `depth` values are dropped with diagnostics.

This keeps the model contract authoritative while making incomplete model output a bit more useful.

## Local Mode Terms

Local mode currently emits:

| Label | Category | Subcategory | Depth |
|---|---|---|---|
| `schema cache` | `risk` | `stale` | `deep` |
| `cache key` | `risk` | `stale` | `deep` |
| `tool schema` | `api` | `contract` | `moderate` |
| `stale data` | `data` | `cache-state` | `moderate` |
| `token budget` | `performance` | `tokens` | `surface` |

The starter sample also includes `malformed schemas` as `data / malformed / deep`.

## Inspector Behavior

Clicking a term shows:

- Category and subcategory
- Label
- Summary
- Detail
- Related term ids
- Prompt hook, if provided
- Depth

`promptHook` is currently displayed as guidance. It is not automatically sent as a second model request.

## Diagnostics

Relevant diagnostics:

- `term-category-{id}`: invalid category defaulted to `concept`.
- `term-subcategory-{id}`: invalid subcategory dropped.
- `term-depth-{id}`: invalid depth dropped.
- `term-spans-{id}`: term has no valid spans.
- `xr-005-{id}`: span exceeds prose length.
- `xr-006-{id}`: span substring does not match the label.

## Current Limitations

Model reliability is still prompt-based. Future work could add structured output, targeted span repair, or a real second-interaction follow-up flow, but those are not implemented in this slice.
