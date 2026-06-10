---
version: "1.0.0"
model_target: "universal-architecture-reviewer"
protocol_compat: "not-runtime-protocol"
dependencies: ["ONTOLOGY_PROFILE_REFACTOR/README.md", "05_ANTI_REGRESSION_RULES.md"]
last_updated: "2026-06-09"
priority_schema: "critical > strong > guideline"
source_review: "Claude Fable strategic architecture review, 2026-06-09"
status: "review-pack"
authority: "review-guidance"
---

# Fable Strategic Review Pack

<meta-instruction>
This folder preserves the 2026-06-09 Claude Fable strategic architecture review of Kordex.
It is not a new product decision layer by itself. It routes future agents to the locked
ontology/profile decisions and summarizes Fable's external architecture critique.
</meta-instruction>

<lifecycle>
After the planned documentation consolidation pass, fold durable bans into
`05_ANTI_REGRESSION_RULES.md`, fold durable routing guidance into `README.md` or
`00_DOC_SYNC.md`, and mark this review pack historical.
</lifecycle>

## 1. Routing Logic

<routing-logic>
IF the task is about understanding what Kordex is:
THEN read `01-kordex-architecture-review.md`.

IF the task is about contradictions, stale docs, or architecture drift:
THEN read `02-coherence-and-drift.md`.

IF the task is about DSL, Racket, MCP, CLI, agents, adapters, or future app-builder surfaces:
THEN read `03-future-dsl-adapter-review.md`.

IF the task is about prioritizing next implementation work:
THEN read `05-next-gates.md`.

IF the task is about preventing regression in future LLM runs:
THEN read `07-anti-regression-contract.md`.

IF the task is onboarding another LLM:
THEN read `06-minimal-reading-bundle.md`.
</routing-logic>

## 2. Review Scope

<context>
Fable reviewed the full Kordex ontology/profile direction, including:

- local-first personal knowledge and learning system
- Kordex core and child/domain profiles
- coding as the first child profile, not the final product boundary
- branches, overlays, active selections, profile registry, runtime composition
- Conceptualize save/correction/proposal flow
- singular public classification and hidden near-miss diagnostics
- missing-concept UX and proposal-first apply
- correction evidence, proposal events, and user-fit projection
- checker/proposal review/apply architecture
- branch-local apply, base/core version guards, and no silent widening
- future graph, retrieval, chat, old-card review, and branch workflows
- future adapter, agent, MCP, CLI, app-builder, and possible Racket/DSL direction
</context>

## 3. High-Level Verdict

<review-verdict>
Fable judged the architecture as strongly coherent. The strongest praised invariant was:
Kordex treats being wrong as a first-class product surface. It records mistakes as facts,
turns repeated evidence into proposals, and changes its meaning system only through explicit,
audited, user-approved apply operations.
</review-verdict>

## 4. Active Source Of Truth

<absolute-constraints>
- DO NOT treat this review pack as overriding numbered decision docs.
- DO NOT use this review pack to reopen locked decisions without a concrete contradiction.
- DO NOT implement DSL, Racket runtime, MCP adapters, agent runtime, or app-builder runtime from this folder.
- DO NOT convert hidden near-miss diagnostics into visible extra tags.
- DO NOT convert user-fit or checker confidence into auto-apply authority.
</absolute-constraints>

## 5. File Map

<context>
- `01-kordex-architecture-review.md` - product and technical architecture map.
- `02-coherence-and-drift.md` - what Fable found coherent and what docs are stale.
- `03-future-dsl-adapter-review.md` - future language/adapter review.
- `04-risks-and-weak-spots.md` - ranked risk register.
- `05-next-gates.md` - recommended implementation order.
- `06-minimal-reading-bundle.md` - compact reading bundle for future LLMs.
- `07-anti-regression-contract.md` - bans and gates derived from Fable's warnings.
- `SPEC-01-review-pack-generation.md` - local generation rules for this review-pack format.
</context>

## 6. Pre-Flight Checklist

<pre-flight-checklist>
Before using this folder to guide work:
1. [ ] Did I identify whether the topic is already locked in the numbered docs?
2. [ ] Did I route to the specific review file instead of reading everything blindly?
3. [ ] Did I treat Fable's points as review guidance, not as new product law?
4. [ ] Did I keep future DSL/agent/app-builder ideas as future consumers of core operations, not current implementation?
</pre-flight-checklist>
