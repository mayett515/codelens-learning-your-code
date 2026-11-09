---
version: "1.0.0"
model_target: "llm-onboarding-router"
protocol_compat: "not-runtime-protocol"
dependencies: ["README.md", "NEXT_LLM_CONTEXT.md"]
last_updated: "2026-06-09"
priority_schema: "critical > strong > guideline"
authority: "review-guidance"
---

# Minimal Reading Bundle For Future LLMs

<meta-instruction>
Use this file to onboard future LLMs without drowning them in historical logs.
</meta-instruction>

## 1. Fable's Ten-File Bundle

<positive-directives>
1. `KORTEX_DEVELOPER_EXPLAINER.md`
2. `README.md`
3. `07_KORTEX_CORE_AND_CHILD_CORES.md`
4. `13_BRANCH_OVERLAY_PERSISTENCE_DECISION.md`
5. `14_PROFILE_SELECTION_AND_BRANCH_RESOLUTION_DECISION.md`
6. `18_ADAPTIVE_SUGGESTION_POLICY_DECISION.md`
7. `21_CHECKER_PROPOSAL_REVIEW_CONTEXT_AND_APPLY_DECISION.md`
8. `26_SCOPED_MEANING_AND_BRANCH_CORE_SEMANTICS_DECISION.md`
9. `28_CONTEXT_ASSEMBLY_DECISION.md`
10. `05_ANTI_REGRESSION_RULES.md`
11. `NEXT_LLM_CONTEXT.md`
</positive-directives>

Fable called this a "ten-file" bundle but listed `NEXT_LLM_CONTEXT.md` as the current-state add-on.
Use it as 10 conceptual entries plus the current-state file.

## 2. Routing Notes

<routing-logic>
IF the task touches persistence or migrations:
THEN also read `PERSISTENCE.md`.

IF the task touches Conceptualize:
THEN also read docs 20, 22, 30, 31, 32, 33, 34, 35, 36, and 39 as needed.

IF the task touches proposal/apply:
THEN also read docs 19, 24, 25, 38, and 39.

IF the task touches DSL, agent, app-builder, MCP, CLI, or adapters:
THEN also read doc 08 and doc 09.

IF the task touches graph/chat/retrieval behavior:
THEN also read doc 21 and the current source modules for graph/retrieval.
</routing-logic>

## 3. What To Avoid

<absolute-constraints>
- DO NOT begin with `implementation_handoff.md` unless investigating a specific slice.
- DO NOT use stale root docs alone to infer ontology/profile state.
- DO NOT reread every numbered doc when a scoped bundle is enough.
- DO NOT ignore `README.md` as the decision-doc index.
</absolute-constraints>

## 4. Pre-Flight Checklist

<pre-flight-checklist>
Before briefing another LLM:
1. [ ] Did I include the project intent, not only implementation files?
2. [ ] Did I include the relevant numbered decision docs?
3. [ ] Did I avoid old handoff logs unless needed?
4. [ ] Did I state what is locked versus open?
</pre-flight-checklist>
