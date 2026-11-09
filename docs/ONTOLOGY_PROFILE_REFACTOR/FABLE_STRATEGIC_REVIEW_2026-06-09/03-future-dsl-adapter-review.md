---
version: "1.0.0"
model_target: "future-language-layer-reviewer"
protocol_compat: "not-runtime-protocol"
dependencies: ["08_KORTEX_LANGUAGE_LAYER_AND_ADAPTERS.md", "21_CHECKER_PROPOSAL_REVIEW_CONTEXT_AND_APPLY_DECISION.md"]
last_updated: "2026-06-09"
priority_schema: "critical > strong > guideline"
authority: "review-guidance"
---

# Future DSL, Racket, Adapter, And Agent Review

<meta-instruction>
This file captures Fable's review of the long-term language-layer direction. DSL/Racket is
one possible future consumer of the core operation seams. It is not current implementation.
</meta-instruction>

## 1. Verdict

<review-verdict>
Fable judged the future DSL/adapter possibility as preserved correctly without premature
implementation.
</review-verdict>

## 2. Why The Future Is Preserved

<positive-directives>
- Current TypeScript helpers expose typed data shapes and operations.
- Profile selection is serializable and id-based.
- ContextPack is deterministic and serializable.
- Proposal apply compiles to typed operations before mutation.
- Audit events are append-only facts.
- Profile sources are already interface-shaped and can later include file, DB, adapter, or external sources.
</positive-directives>

## 3. What Future Consumers Could Use

<context>
Future consumers include:

- Racket/Kordex DSL
- CLI commands
- MCP tools
- agent runtimes
- app-builder runtime
- graph-selection chat
- external adapters
- file-based profile sources
</context>

These should compile into the same validated operations, not bypass them.

## 4. Hard Bans

<absolute-constraints>
- DO NOT implement a Racket runtime in the app now.
- DO NOT add a DSL parser/interpreter now.
- DO NOT let a DSL bypass proposal/apply guards.
- DO NOT make future agents mutate ontology/profile state directly.
- DO NOT fork the core into a second language runtime with separate semantics.
</absolute-constraints>

## 5. Fable's Main Caution

<review-warning>
The current operation vocabulary may become too coarse. `ProfilePatch` is currently add/override-oriented.
Future checker and DSL ambitions include split, merge, rename, deprecate, move, and boundary-rule operations.
Those may require finer operation types before the checker can safely propose them.
</review-warning>

## 6. Decision Implication

<conditional-logic>
IF future work builds checker suggestions for split, merge, rename, deprecate, or move:
THEN decide the typed operation vocabulary first.

IF future work builds DSL, MCP, CLI, or agent entrypoints:
THEN route them through the same proposal/apply services and operation validators.
</conditional-logic>

## 7. Good Architecture Shape

<example>
// Good: future DSL compiles into a typed proposal operation.
dsl_statement -> ProfilePatchOperation -> ProfileChangeProposal -> review -> guarded apply
</example>

<example>
// Bad: future DSL writes branch overlay JSON directly.
dsl_statement -> profile_branches.overlay_json = mutated_value
</example>

## 8. Pre-Flight Checklist

<pre-flight-checklist>
Before adding any future adapter/language layer:
1. [ ] Is the current TypeScript operation seam sufficient?
2. [ ] Does the new entrypoint create proposals instead of applying silently?
3. [ ] Does it use scoped ids, not labels?
4. [ ] Does it preserve branch/base target guards?
5. [ ] Does it write audit events through existing services?
</pre-flight-checklist>
