# Sandbox Engine Contract Specification

> Version: 1.0.0
> Branch: sandboxtexttesting-worktree
> Route: /sandboxtexttesting

This document is the single source of truth for the structured contract that drives the Review Contract Engine, chat rendering, and future Under-The-Hood Canvas Engine. Every field, constraint, and relationship is defined here so that both humans and models can produce and validate output deterministically.

---

## Architecture Overview

```
User Prompt
     │
     ▼
┌─────────────┐     ┌──────────────────┐
│  LLM Output │────►│  Contract Parser  │────►  Diagnostics
│  (prose +   │     │  (extract +       │
│   JSON)     │     │   validate +      │────►  Repair Attempt
│             │     │   normalize)      │
└─────────────┘     └────────┬─────────┘────►  Fallback Contract
                              │
                              ▼
                     ┌────────────────┐
                     │  Renderable    │
                     │  Contract      │
                     │  (versioned,   │
                     │   normalized)  │
                     └───────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
        Chat Pane      Code Pane      Inspector Pane
        (prose +       (artifacts +   (terms +
         keywords)      layers)        calculations)
```

---

## Contract Schema

### Top-Level Contract

```json
{
  "$schema": "codelens-chat-engine-contract",
  "version": 1,
  "prose": "...",
  "codeArtifacts": [],
  "terms": [],
  "calculations": [],
  "findings": []
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `version` | `integer` | **yes** | Must be `1`. Other values are rejected. |
| `prose` | `string` | **yes** | `1 ≤ length ≤ 8000`.Visible answer text the user reads. May contain inline code with single backticks. Must not contain fenced JSON blocks. |
| `codeArtifacts` | `array<CodeArtifact>` | **yes** | `0 ≤ length ≤ 10`. Each entry must pass CodeArtifact validation. |
| `terms` | `array<Term>` | **yes** | `1 ≤ length ≤ 30`. Each entry must pass Term validation. |
| `calculations` | `array<Calculation>` | no | `0 ≤ length ≤ 10`. Each entry must pass Calculation validation. |
| `findings` | `array<Finding>` | no | `0 ≤ length ≤ 20`. Each entry must pass Finding validation. |

---

### CodeArtifact

```json
{
  "id": "skeleton-js",
  "title": "skeleton.js",
  "language": "js",
  "code": "// source code here\nconst x = 1;",
  "layers": []
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `id` | `string` | **yes** | `1 ≤ length ≤ 64`. Must match `^[a-z0-9][a-z0-9\-]*[a-z0-9]$`. Must be unique within `codeArtifacts`. Stable across regenerations for the same file. |
| `title` | `string` | **yes** | `1 ≤ length ≤ 128`. Human-readable filename or descriptor. |
| `language` | `string` | **yes** | Must be one of: `js`, `ts`, `tsx`, `jsx`, `py`, `json`, `yaml`, `md`, `sql`, `rust`, `go`, `css`, `html`, `sh`, `text`. |
| `code` | `string` | **yes** | `1 ≤ length ≤ 10000`. Must contain at least one non-whitespace character. Newline count must be `0 ≤ n ≤ 300`. |
| `layers` | `array<Layer>` | **yes** | `0 ≤ length ≤ 15`. Each entry must pass Layer validation. |

---

### Layer

```json
{
  "id": "cache-identity",
  "kind": "state",
  "title": "Cache Identity",
  "summary": "How the cache key is constructed",
  "detail": "The cache key concatenates server name and tool name without version, so duplicate tool names across servers collide.",
  "lineStart": 5,
  "lineEnd": 8
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `id` | `string` | **yes** | `1 ≤ length ≤ 64`. Must match `^[a-z0-9][a-z0-9\-]*[a-z0-9]$`. Must be unique within parent artifact. |
| `kind` | `string` | **yes** | Well-known values: `surface`, `imports`, `state`, `api`, `render`, `calculation`, `expansion`, `callflow`, `closure`, `runtime-order`, `abstraction`. Custom values allowed if prefixed with `x-`. |
| `title` | `string` | **yes** | `1 ≤ length ≤ 128`. |
| `summary` | `string` | **yes** | `1 ≤ length ≤ 256`. One-line explanation shown in hover/tooltip. |
| `detail` | `string` | **yes** | `1 ≤ length ≤ 2000`. Full explanation shown in inspector. |
| `lineStart` | `integer` | **yes** | `≥ 1`. Must be ≤ `lineEnd`. Must be ≤ total lines in parent artifact code. |
| `lineEnd` | `integer` | **yes** | `≥ lineStart`. Must be ≤ total lines in parent artifact code. |

---

### Term

```json
{
  "id": "schema-cache",
  "label": "schema cache",
  "category": "risk",
  "spans": [{ "proseOffset": 42, "length": 13 }],
  "summary": "In-memory storage of tool schemas fetched from MCP servers",
  "detail": "The schema cache stores tool descriptions from MCP servers, keyed by server name plus tool name. Because no version or timestamp is included, stale or duplicate entries cannot be detected or evicted.",
  "promptHook": "How could we add cache invalidation to this schema store?",
  "relatedTermIds": ["cache-key", "stale-data"]
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `id` | `string` | **yes** | `1 ≤ length ≤ 64`. Must match `^[a-z0-9][a-z0-9\-]*[a-z0-9]$`. Must be unique within `terms`. Stable across regenerations for the same concept. |
| `label` | `string` | **yes** | `2 ≤ length ≤ 64`. Must appear verbatim in the `prose` field at every offset listed in `spans`. Case-sensitive. |
| `category` | `string` | **yes** | Must be one of: `risk`, `concept`, `api`, `data`, `performance`, `test`. |
| `spans` | `array<ProseSpan>` | **yes** | `1 ≤ length ≤ 10`. Each span must reference a valid position in `prose`. The substring at each span must exactly match `label`. |
| `summary` | `string` | **yes** | `1 ≤ length ≤ 256`. One-line explanation for keyword hover and inspector summary. |
| `detail` | `string` | **yes** | `1 ≤ length ≤ 2000`. Full explanation for inspector detail panel. |
| `promptHook` | `string` | no | `1 ≤ length ≤ 256`. Suggests a follow-up prompt the user might ask. |
| `relatedTermIds` | `array<string>` | no | `0 ≤ length ≤ 5`. Each value must reference an `id` that exists in the same contract's `terms` array. No self-references. No duplicates. |

---

### ProseSpan

```json
{ "proseOffset": 42, "length": 13 }
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `proseOffset` | `integer` | **yes** | `≥ 0`. Zero-indexed character offset into `prose`. Must not exceed `prose.length - length`. |
| `length` | `integer` | **yes** | `≥ 1`. `proseOffset + length ≤ prose.length`. The substring `prose.slice(proseOffset, proseOffset + length)` must exactly equal the parent Term's `label`. |

---

### Calculation

```json
{
  "id": "token-budget-analysis",
  "title": "Token Budget Under Compression",
  "kind": "reasoning",
  "steps": [
    {
      "label": "Average tool description",
      "value": 180,
      "unit": "tokens"
    },
    {
      "label": "Tools after compression",
      "value": 12,
      "unit": "tools"
    },
    {
      "label": "Total estimated cost",
      "value": 2160,
      "unit": "tokens",
      "note": "Before compression this would be ~5400 tokens"
    }
  ],
  "conclusion": "Lossy compression saves approximately 60% of the token budget but risks dropping critical details from tool descriptions."
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `id` | `string` | **yes** | `1 ≤ length ≤ 64`. Must match `^[a-z0-9][a-z0-9\-]*[a-z0-9]$`. Unique within `calculations`. |
| `title` | `string` | **yes** | `1 ≤ length ≤ 128`. |
| `kind` | `string` | **yes** | Must be one of: `reasoning`, `tradeoff`, `risk-trace`. |
| `steps` | `array<CalcStep>` | **yes** | `2 ≤ length ≤ 10`. Each entry must pass CalcStep validation. |
| `conclusion` | `string` | **yes** | `1 ≤ length ≤ 1000`. |

---

### CalcStep

```json
{
  "label": "Average tool description",
  "value": 180,
  "unit": "tokens",
  "note": "Before compression this would be ~5400 tokens"
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `label` | `string` | **yes** | `1 ≤ length ≤ 128`. |
| `value` | `number` | **yes** | Any finite number. |
| `unit` | `string` | **yes** | `1 ≤ length ≤ 32`. |
| `note` | `string` | no | `1 ≤ length ≤ 256`. |

---

### Finding

```json
{
  "id": "stale-cache-risk",
  "severity": "high",
  "category": "reliability",
  "termId": "schema-cache",
  "title": "Stale schema cache has no eviction path",
  "description": "The cache key does not include a version or timestamp, so refreshed tool schemas cannot replace stale entries.",
  "artifactId": "skeleton-js",
  "lineStart": 5,
  "lineEnd": 8,
  "suggestedFix": "Include a content hash or version tag in the cache key so that updated schemas replace stale entries."
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `id` | `string` | **yes** | `1 ≤ length ≤ 64`. Must match `^[a-z0-9][a-z0-9\-]*[a-z0-9]$`. Unique within `findings`. |
| `severity` | `string` | **yes** | Must be one of: `critical`, `high`, `medium`, `low`, `info`. |
| `category` | `string` | **yes** | Must be one of: `bug`, `security`, `reliability`, `performance`, `maintainability`, `accessibility`, `design`. |
| `termId` | `string` | no | If present, must reference an `id` in `terms`. Links the finding to a clickable keyword. |
| `title` | `string` | **yes** | `1 ≤ length ≤ 128`. |
| `description` | `string` | **yes** | `1 ≤ length ≤ 1000`. |
| `artifactId` | `string` | no | If present, must reference an `id` in `codeArtifacts`. Anchors the finding to a code file. |
| `lineStart` | `integer` | no | If present, `≥ 1`. Must be ≤ `lineEnd`. Requires `artifactId`. Must be ≤ total lines in referenced artifact. |
| `lineEnd` | `integer` | no | If present, `≥ lineStart`. Requires `artifactId`. Must be ≤ total lines in referenced artifact. |
| `suggestedFix` | `string` | no | `1 ≤ length ≤ 500`. |

---

## Cross-Reference Integrity Rules

These constraints cannot be expressed per-field and must be validated globally.

| Rule ID | Description |
|---------|-------------|
| `XR-001` | Every `relatedTermIds` entry must resolve to an existing `terms[].id`. |
| `XR-002` | Every `findings[].termId` must resolve to an existing `terms[].id`. |
| `XR-003` | Every `findings[].artifactId` must resolve to an existing `codeArtifacts[].id`. |
| `XR-004` | Every `findings[].lineStart`/`lineEnd` must be within the line count of its referenced `codeArtifacts[].code`. |
| `XR-005` | Every `terms[].spans[].proseOffset + length` must not exceed `prose.length`. |
| `XR-006` | Every `terms[].spans` substring must exactly equal `terms[].label`. |
| `XR-007` | Every `codeArtifacts[].layers[].lineStart/lineEnd` must be within the line count of `codeArtifacts[].code`. |
| `XR-008` | No duplicate `id` values within the same collection (codeArtifacts, terms, calculations, findings). |

---

## Generating the Contract: LLM Instructions

When a model generates a `codelens-chat-engine` contract, it must:

1. **Emit valid JSON only.** The contract must appear inside a single fenced code block with the exact marker `codelens-chat-engine`. No markdown inside the JSON. No trailing commas. No comments.

2. **Set `version` to `1`.**

3. **Write `prose` first**, then produce the contract. The prose is the user-visible answer. The contract is the machine-readable structure behind it.

4. **Anchor every term label in the prose.** Each term's `label` must appear verbatim in `prose`. Every occurrence that the user should see highlighted must have a corresponding `spans` entry with exact character offset and length. Zero-indexed. UTF-16 neutral (count characters as `String.prototype.length` would).

5. **Keep term count between 1 and 30.** Every term must be a real concept, risk, API, data structure, performance characteristic, or test concern from the review. Do not invent terms that do not appear in prose. Do not repeat the same concept with different labels.

6. **Use specific labels, never generic.** Bad: `"label": "risk"`. Good: `"label": "schema cache"`. The label should be something the user can see in the prose and want to click.

7. **Assign categories honestly.**
   - `risk` → something that can go wrong
   - `concept` → an idea the user needs to understand
   - `api` → an interface, function, or protocol
   - `data` → a data structure, field, or value
   - `performance` → a speed, memory, or efficiency concern
   - `test` → a testing scenario or gap

8. **Link terms with `relatedTermIds`.** If two concepts are connected, reference the other term's `id`. Never self-reference. Never reference a non-existent id.

9. **Calculate spans accurately.** Use JavaScript-style string indexing: `prose.slice(proseOffset, proseOffset + length)` must return exactly the label text.

10. **Prefer findings over loose terms for code review.** If the prompt asks about code review concerns, use `findings` with severity, category, and optional suggestedFix. Link findings to terms and artifacts when possible.

11. **Do not exceed field length limits.** Summary fields are short. Detail fields can be longer. Respect every constraint in the schema.

---

## Rendering Contract: UI Behavior

### Chat Pane (Left)

- Render `prose` as markdown.
- When `Visualize keywords` is on, locate each term's `spans` offsets in the rendered text and insert a highlighted brick. Do not regex-match labels; use spans only.
- Category determines brick style:
  - `risk` → red-tinted
  - `concept` → blue-tinted
  - `api` → green-tinted
  - `data` → purple-tinted
  - `performance` → orange-tinted
  - `test` → teal-tinted
- Clicking a brick opens the inspector for that term.

### Code Pane (Middle)

- Render each code artifact with syntax highlighting.
- List layers below the artifact. Clicking a layer highlights lines `lineStart` through `lineEnd`.
- If a finding references an artifact and line range, show a severity-colored gutter marker.

### Inspector Pane (Right)

- When a term is clicked, show: category badge, label, summary, detail, promptHook, and related terms as clickable links.
- When a layer is clicked, show: kind badge, title, summary, detail.
- When a finding is clicked, show: severity badge, category badge, title, description, suggestedFix (if present), and link to the referenced term and artifact.
- Calculations render as step-by-step breakdowns with conclusion.

### Session Persistence

- Each assistant answer is stored with its parsed contract.
- `Open review` restores that answer's artifact, terms, layers, calculations, and findings to the active state.
- Keep at most 5 previous reviewable answers per session.

---

## Fallback Contract

When parsing fails and repair also fails, the engine produces a deterministic fallback contract:

```json
{
  "version": 1,
  "prose": "The model did not return a valid review contract. This is a fallback response.",
  "codeArtifacts": [],
  "terms": [
    {
      "id": "fallback-note",
      "label": "fallback response",
      "category": "concept",
      "spans": [{ "proseOffset": 38, "length": 19 }],
      "summary": "The model output could not be parsed into a valid contract.",
      "detail": "The model was asked to return a codelens-chat-engine JSON block but the output was malformed or missing. Diagnostics are available in the inspector.",
      "promptHook": "Try sending the prompt again with Local mode to see a working example."
    }
  ],
  "calculations": [],
  "findings": []
}
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-05-01 | Initial contract specification. Added `version` field, `spans` on terms, `findings`, cross-reference integrity rules, explicit UI rendering contract, generation instructions, fallback contract. |