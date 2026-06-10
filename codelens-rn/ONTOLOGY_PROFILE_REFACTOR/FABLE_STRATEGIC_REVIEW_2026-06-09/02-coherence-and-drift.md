---
version: "1.0.0"
model_target: "architecture-reviewer"
protocol_compat: "not-runtime-protocol"
dependencies: ["00_DOC_SYNC.md", "README.md", "NEXT_LLM_CONTEXT.md", "ARCHITECTURE.md"]
last_updated: "2026-06-09"
priority_schema: "critical > strong > guideline"
authority: "review-guidance"
---

# Coherence And Drift Review

<meta-instruction>
This file captures what Fable found coherent and where future agents may be misled by stale
or duplicated documentation.
</meta-instruction>

## 1. Coherence Verdict

<review-verdict>
Fable found the architecture strongly coherent across cores, branches, overlays,
Conceptualize, checker/proposals, user-fit, graph/retrieval direction, and future adapter/DSL
direction.
</review-verdict>

## 2. Why It Is Coherent

<positive-directives>
- The same invariants appear across the docs and implementation.
- Later docs amend earlier docs explicitly instead of silently contradicting them.
- Scope, target, evidence, proposal, and apply are separate concepts.
- Apply paths are typed, guarded, and audited.
- Context assembly and scoped identity protect against label collision.
</positive-directives>

Fable called doc 21 the keystone because it connects Conceptualize, checker runs,
graph-selection chat, old-card review, proposal review, and apply under one architecture.

Fable also called doc 26 essential because scoped meaning prevents labels from becoming
global truth.

## 3. Stale Or Risky Documentation

<incident-reports>
- Drift 001: `00_DOC_SYNC.md` is stale and its doc list stops before docs 18-39.
- Drift 002: `WHERE_WE_STAND.md` has become a huge second handoff log while still carrying an old date.
- Drift 003: `NEXT_LLM_CONTEXT.md` has prose for many later docs but its compact reading list skips several important decisions, especially doc 26 scoped meaning.
- Drift 004: `ARCHITECTURE.md` still under-describes the implemented ontology/profile module.
- Drift 005: doc 06 retains pre-doc-12 language around branch-aware correction evidence.
- Drift 006: Kortex/Kordex naming is still mixed, though doc 27 explicitly permits this until cleanup.
- Drift 007: `ONTOLOGY_PROFILE_REFACTOR/` now contains canonical product architecture, but its folder name still sounds like temporary refactor scaffolding.
</incident-reports>

## 4. Why This Matters

<conditional-logic>
IF a future agent reads only root docs:
THEN it may think the ontology/profile layer is mostly planned rather than substantially implemented.

IF a future agent follows stale `00_DOC_SYNC.md` bundles:
THEN it can miss the locked Conceptualize, proposal, user-fit, scoped-meaning, and base-versioning decisions.

IF handoff logs keep duplicating state:
THEN future agents will spend more context reconciling logs than implementing the next locked slice.
</conditional-logic>

## 5. Recommended Doc Fixes

<positive-directives>
- Update `00_DOC_SYNC.md` to route through docs 18-39 or defer clearly to `README.md`.
- Update `MAIN.md` and `ARCHITECTURE.md` so they acknowledge the ontology/profile implementation.
- Collapse or demote overlapping handoff logs after current work is safely committed.
- Keep `README.md` as the numbered decision index.
- Keep `implementation_handoff.md` as detailed historical log, not the first reading path.
</positive-directives>

## 6. Pre-Flight Checklist

<pre-flight-checklist>
Before making architecture decisions:
1. [ ] Did I check the numbered docs first?
2. [ ] Did I avoid relying on stale root summaries alone?
3. [ ] Did I classify the topic as locked, partially implemented, open implementation gap, or actually undecided?
4. [ ] Did I avoid duplicating status in another handoff file unless a summary doc explicitly needs it?
</pre-flight-checklist>
