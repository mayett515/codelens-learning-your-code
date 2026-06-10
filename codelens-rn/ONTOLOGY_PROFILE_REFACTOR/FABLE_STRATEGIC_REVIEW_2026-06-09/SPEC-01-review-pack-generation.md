---
version: "1.0.0"
model_target: "review-pack-generator"
protocol_compat: "not-runtime-protocol"
dependencies: []
last_updated: "2026-06-09"
priority_schema: "critical > strong > guideline"
authority: "review-guidance"
---

# Review Pack Generation Specification

## Purpose

This file defines how strategic model reviews should be converted into durable repository
documents without turning review commentary into uncontrolled product law.

## 1. Format Selection Matrix

| Format Syntax | Purpose | Rule |
| --- | --- | --- |
| YAML frontmatter | Metadata, routing, dependencies, freshness | Keep compact and machine-readable. |
| XML-style body tags | Operational gates, bans, checklists | Use for constraints future LLMs must notice. |
| Markdown prose | Explanation, review summaries, examples | Use for human-readable architecture context. |

## 2. Generation Rules

<positive-directives>
- Preserve the reviewer's actual claims clearly and concretely.
- Separate review guidance from locked product decisions.
- Route future agents to canonical docs before making architecture changes.
- Keep future-only ideas clearly labeled as future-only.
- Add examples only when they clarify allowed and forbidden architecture paths.
</positive-directives>

## 3. Anti-Regression Strategy

<absolute-constraints>
- DO NOT use review files to override numbered decision docs.
- DO NOT create fake empirical citations.
- DO NOT claim a model reviewed files it did not read.
- DO NOT compress away warnings that affect next implementation order.
- DO NOT turn future direction into current implementation permission.
</absolute-constraints>

## 4. Attention Hygiene

<conditional-logic>
IF a review is broad:
THEN split it into focused files by topic.

IF a review contains next steps:
THEN separate next gates from risk warnings.

IF a review mentions stale docs:
THEN create a coherence/drift file rather than scattering notes across handoff docs.
</conditional-logic>

## 5. Few-Shot Examples

<example>
// Good: preserves a review as guidance.
Fable judged the current architecture coherent, but warned that `ProfilePatch` may be too coarse for future split/merge operations.
</example>

<example>
// Bad: converts a review warning into an unapproved implementation.
Implement a new DSL operation runtime now because Fable mentioned future DSL needs.
</example>

## 6. Pre-Flight Checklist

<pre-flight-checklist>
Before committing a review pack:
1. [ ] Does every file say whether it is review guidance or source-of-truth decision?
2. [ ] Are future-only ideas guarded from accidental implementation?
3. [ ] Are risks, next gates, and reading bundles separated?
4. [ ] Are there no invented claims about the reviewer or sources?
5. [ ] Can a future LLM use the pack without reading the full transcript?
</pre-flight-checklist>
