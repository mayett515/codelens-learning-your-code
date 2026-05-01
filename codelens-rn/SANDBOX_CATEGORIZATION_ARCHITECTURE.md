# Sandbox Categorization Architecture

This document defines the intended categorization behavior for sandbox chat engine terms.
It is meant as a handoff file for future model or code work.

## Goal

The categorization system should make keyword bricks and inspectors smarter without making the contract fragile.

<core_goal>
Classify user-facing explanation terms so the UI can color, group, and inspect them.
Classify by meaning in context, not by isolated keyword matching.
Use the surrounding prose sentence, related findings, code layer, and user question when deciding.
</core_goal>

## Current Contract Fields

Each term can include:

```json
{
  "id": "cache-key",
  "label": "cache key",
  "category": "risk",
  "subcategory": "stale",
  "depth": "deep",
  "spans": [{ "proseOffset": 42, "length": 9 }],
  "summary": "The identity used to decide whether cached data can be reused.",
  "detail": "A weak cache key can return stale or wrong schema data.",
  "promptHook": "Ask whether every schema-changing input is represented in the cache key.",
  "relatedTermIds": ["schema-cache"]
}
```

Required:

- `category`
- `spans`
- `summary`
- `detail`
- `relatedTermIds`

Optional:

- `subcategory`
- `depth`
- `promptHook`

## Prompt Taxonomy

Use this taxonomy in the model prompt.

```md
<term_classification_contract>
The goal is to classify user-facing explanation terms so the UI can color, group, and inspect them.
Classify by meaning in context, not by isolated keyword matching.
Use the surrounding prose sentence, related findings, code layer, and user question when deciding.
</term_classification_contract>

<term_categories>
<category name="risk">
Meaning: Anything that can cause wrong behavior, broken correctness, bad user impact, unsafe execution, stale state, data loss, hidden failure, security exposure, or misleading output.
Common examples: bug, crash, stale cache, invalid state, race condition, missing validation, unchecked response, data loss, permission issue, schema drift, wrong cache key, silent failure.
Use when: the term points to something that can break, mislead, corrupt, leak, or fail.
Do not use when: the term is only a neutral concept or API boundary with no failure mode.
</category>

<category name="concept">
Meaning: A mental model, architectural idea, design pattern, abstraction, lifecycle idea, or explanation-only topic.
Common examples: strategy pattern, composition, contract, abstraction layer, data flow, lifecycle, dependency boundary, rendering model, normalization.
Use when: the term helps the user understand how the system is structured or why code is shaped a certain way.
Do not use when: the term is a concrete callable API, stored data shape, test, performance concern, or specific risk.
</category>

<category name="api">
Meaning: A callable boundary, interface, protocol, provider, adapter, external service, framework function, hook, command, or model/tool contract.
Common examples: model adapter, MCP tool call, provider status, requestSandboxModelOutput, hook API, validator function, OpenRouter provider, Expo command, schema contract.
Use when: the term names how one part asks another part to do work.
Do not use when: the term is mostly the data being passed rather than the boundary itself.
</category>

<category name="data">
Meaning: A value, object shape, schema, payload, cache entry, normalized field, state object, artifact, span, diagnostic, or persisted/transformed information.
Common examples: term span, JSON contract, code artifact, finding, relatedTermIds, cache entry, model output, diagnostics array, line range, payload shape.
Use when: the term is primarily information being stored, validated, transformed, displayed, or passed around.
Do not use when: the main concern is that the data can cause failure; then prefer risk.
</category>

<category name="performance">
Meaning: Runtime cost, latency, memory, token budget, request count, render cost, batching, throttling, timeout, quota, or efficiency.
Common examples: token budget, timeout, cache hit, repeated model call, large prompt, render churn, expensive validation, network latency, memory growth.
Use when: the term is about speed, cost, scale, responsiveness, resource use, or limits.
Do not use when: the term merely mentions a cache but the concern is stale/wrong data; then prefer risk or data.
</category>

<category name="test">
Meaning: Verification, regression coverage, assertions, fixtures, mocks, integration behavior, type checks, or manual QA paths.
Common examples: validator test, regression test, fixture contract, TypeScript check, Vitest case, browser smoke test, malformed contract case.
Use when: the term is about proving behavior or preventing regressions.
Do not use when: the term describes production behavior rather than verification.
</category>
</term_categories>

<subcategory_rules>
Use subcategory only when it adds useful precision.
Allowed subcategories:
risk: auth, data-loss, stale, malformed
concept: pattern, deprecation, versioning
api: endpoint, contract, lifecycle
data: schema, payload, cache-state
performance: latency, quota, tokens
test: unit, integration, regression

If none fit cleanly, omit subcategory.
Use x-{name} only for a highly useful domain-specific subcategory.
</subcategory_rules>

<depth_rules>
surface: simple term, obvious from context, quick explanation is enough.
moderate: normal technical term, useful to inspect but not central to correctness.
deep: central risk, subtle behavior, architecture-critical concept, or term connected to findings.

Prefer deep when:
- related to a high/critical finding
- misclassification could mislead the user
- the term explains why code is unsafe or hard to change
- the term connects multiple artifacts or layers
</depth_rules>

<classification_tiebreakers>
- If a term describes a failure mode, choose risk.
- If a term describes a callable boundary, choose api.
- If a term describes information shape or stored/transformed content, choose data.
- If a term describes cost, latency, tokens, memory, quota, or scale, choose performance.
- If a term describes proof or coverage, choose test.
- If none of the above dominate, choose concept.
</classification_tiebreakers>

<context_rules>
Classify using the term in context:
- Same label can have different categories in different sentences.
- "cache" as storage is data.
- "cache" causing stale output is risk.
- "cache" improving repeated lookup speed is performance.
- "schema" as JSON shape is data.
- "schema" as external tool contract is api.
- "schema" mismatch that breaks calls is risk.
</context_rules>

<classification_second_check>
Before finalizing each term classification, perform one brief second check.

Question:
"Is there a more specific or safer category based on the surrounding context?"

Rules:
- Change the classification only if the second category is clearly better.
- Do not search for disagreement just to create disagreement.
- Prefer risk only when there is an actual failure mode or user-impact risk.
- Prefer api only when the term is mainly a callable/provider/tool/interface boundary.
- Prefer data only when the term is mainly a value, shape, payload, cache entry, or state.
- Prefer performance only when the term is mainly about speed, cost, quota, memory, tokens, or latency.
- Prefer test only when the term is mainly about verification or regression coverage.
- Otherwise keep concept.
- Do not output the second-check reasoning.
</classification_second_check>

<classification_reason>
If helpful, include a short classificationReason field.
Max 120 characters.
It should explain the final category, not the second-check process.
</classification_reason>

<output_rules>
For every term:
- category is required.
- subcategory is optional.
- depth is optional but preferred.
- Do not choose categories only by keyword.
- Do not invent spans.
- The term label must appear exactly in the prose span.
- Prefer fewer high-quality terms over many weak terms.
</output_rules>
```

## Intended Architecture

The categorization path should be layered:

1. Main model emits the full Contract v1 response.
2. Validator checks shape, ids, cross-references, spans, and metadata.
3. Local categorizer fills missing `subcategory` and `depth` only when obvious.
4. UI displays category, subcategory, depth, related terms, and prompt hook.
5. Optional future second-pass classifier repairs weak categorization only when diagnostics or low confidence justify it.

<merge_rules>
- The model contract remains authoritative.
- Never change valid spans.
- Never silently override a valid model category.
- Invalid subcategory/depth values are dropped with diagnostics.
- Missing subcategory/depth may be filled by local inference.
- If a future classifier disagrees with the original category, keep the original unless there is an explicit diagnostic and high-confidence replacement policy.
</merge_rules>

## What The Local Categorizer Should Do

The local categorizer is a fallback helper, not the main intelligence.

<local_categorizer_scope>
- Suggest obvious subcategory/depth from term label and surrounding context.
- Use broad semantic vocabulary, not only exact hardcoded labels.
- Do not rewrite user-facing prose.
- Do not create spans.
- Do not create findings.
- Do not override valid model category.
</local_categorizer_scope>

Good local fills:

- `stale cache` -> `subcategory: stale`, `depth: deep`
- `token budget` -> `subcategory: tokens`, `depth: surface`
- `tool schema` -> `subcategory: contract`
- `browser smoke test` -> `subcategory: integration`

## Future Model-Assisted Repair

A later slice can add a second model pass, but only as a bounded repair step.

<future_classifier_contract>
Use only when:
- category is missing
- subcategory/depth is missing
- validator produced categorization diagnostics
- local inference confidence is low
- terms conflict with findings

Return only classification patches:
[
  {
    "termId": "cache-key",
    "category": "risk",
    "subcategory": "stale",
    "depth": "deep",
    "confidence": 0.9,
    "classificationReason": "Weak cache key can return stale tool schema."
  }
]
</future_classifier_contract>

The future classifier must not rewrite prose, code artifacts, spans, calculations, or findings.

## Non-Regression Rules

<non_regression_rules>
- Do not reintroduce heuristic keyword highlighting.
- Do not highlight labels by searching prose text in the UI.
- Do not invent spans after model output.
- Do not add hidden model calls behind inspector clicks.
- Do not claim shallow/deep model routing exists unless it is actually implemented.
- Do not make categorization depend on one giant hardcoded keyword table only.
- Do not override valid model category without an explicit, tested policy.
- Do not allow invalid category/subcategory/depth strings through normalization.
- Do not stage, commit, push, checkout, or reset without explicit user approval.
</non_regression_rules>

## Required Tests For Any Categorization Change

<required_tests>
- Valid category/subcategory/depth survives normalization.
- Invalid subcategory/depth is dropped with diagnostics.
- Missing subcategory/depth can be inferred.
- Inference does not override valid model category.
- Invalid bulk-fill metadata is not cast into valid output.
- Span validation still rejects out-of-bounds and substring mismatches.
- UI still renders inline highlights from spans only.
</required_tests>

## Current Status

As of this handoff:

- `category` is required and model-provided.
- `subcategory` and `depth` are optional.
- The prompt asks the model to provide accurate metadata.
- The parser can infer missing `subcategory` and `depth`.
- The parser does not override valid model category.
- The UI displays category/subcategory/depth.
- No real hidden second model pass exists yet.
