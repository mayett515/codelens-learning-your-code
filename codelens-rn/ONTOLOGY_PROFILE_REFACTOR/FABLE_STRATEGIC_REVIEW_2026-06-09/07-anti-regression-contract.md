---
version: "1.0.0"
model_target: "anti-regression-reviewer"
protocol_compat: "not-runtime-protocol"
dependencies: ["05_ANTI_REGRESSION_RULES.md", "33_CONCEPTUALIZE_EXTRACTOR_FLIP_DECISION.md"]
last_updated: "2026-06-09"
priority_schema: "critical > strong > guideline"
authority: "review-guidance"
---

# Anti-Regression Contract From Fable Review

<meta-instruction>
This file converts Fable's strategic warnings into operational regression bans. Use it when
refactoring stable ontology/profile, Conceptualize, proposal, checker, branch, or profile code.
</meta-instruction>

## 1. Historical Context

<failure-modes>
- Risk FABLE-001: Future agents may treat stale root docs as complete and re-decide locked ontology/profile decisions.
- Risk FABLE-002: Future implementation may add seams without user-visible branch/checker value.
- Risk FABLE-003: Checker proposal volume may be added before superseding/stale-refresh lifecycle support.
- Risk FABLE-004: `ProfilePatch` may be stretched into operations it cannot represent cleanly.
- Risk FABLE-005: DSL/agent/MCP/app-builder ambitions may tempt direct mutation paths.
- Risk FABLE-006: Hidden near-miss diagnostics may be mistaken for visible alternative tags.
- Risk FABLE-007: Conceptualize fallback may hide classifier degradation if fallback frequency stays warn-only.
</failure-modes>

## 2. Hard Regression Bans

<absolute-constraints>
- REGRESSION BAN FABLE-001: DO NOT reopen locked decisions without checking numbered docs first.
- REGRESSION BAN FABLE-002: DO NOT persist composed runtime profiles as canonical truth.
- REGRESSION BAN FABLE-003: DO NOT expose hidden near-miss diagnostics as visible extra tags.
- REGRESSION BAN FABLE-004: DO NOT let user-fit, checker confidence, or trust scores auto-apply ontology changes.
- REGRESSION BAN FABLE-005: DO NOT allow DSL, MCP, CLI, or agent paths to mutate profiles outside proposal/apply services.
- REGRESSION BAN FABLE-006: DO NOT implement checker proposal volume without considering superseding and stale-refresh.
- REGRESSION BAN FABLE-007: DO NOT silently widen branch-local Conceptualize proposals to base/core.
- REGRESSION BAN FABLE-008: DO NOT use labels as durable node identity across scopes.
</absolute-constraints>

## 3. Conditional Gates

<conditional-logic>
IF a task touches proposal apply:
THEN verify branch-local and base/core version guard paths remain separate.

IF a task touches checker runtime:
THEN verify it creates proposals only and does not auto-apply.

IF a task touches Conceptualize output:
THEN verify public output remains singular and diagnostics remain internal.

IF a task widens the live Conceptualize extractor flip:
THEN add fallback-frequency visibility before expanding behavior.

IF a task touches branch/profile selection:
THEN verify runtime composition is derived from persisted layers, not persisted as composed truth.

IF a task touches future language/adapter/agent surfaces:
THEN verify it compiles into typed operations and uses existing review/apply guards.
</conditional-logic>

## 4. Examples

<example>
// Good: evidence becomes proposal, proposal waits for user review.
correction_evidence -> checker_context -> profile_change_proposal -> review_screen -> guarded_apply
</example>

<example>
// Bad: confidence directly mutates branch overlay.
user_fit_score > threshold -> write profile_branches.overlay_json
</example>

## 5. Pre-Flight Verification

<pre-flight-checklist>
Before finalizing ontology/profile work:
1. [ ] Did I check the locked docs before changing architecture?
2. [ ] Did I preserve evidence/proposal/apply separation?
3. [ ] Did I avoid hidden-diagnostic UI leakage?
4. [ ] Did I preserve scoped identity?
5. [ ] Did I avoid future-only DSL/agent/app-builder implementation?
6. [ ] Did I add or preserve focused tests/guards for the touched invariant?
</pre-flight-checklist>
