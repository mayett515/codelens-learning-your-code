---
version: "1.0.0"
model_target: "architecture-reviewer"
protocol_compat: "not-runtime-protocol"
dependencies: ["ONTOLOGY_PROFILE_REFACTOR/README.md", "KORTEX_DEVELOPER_EXPLAINER.md"]
last_updated: "2026-06-09"
priority_schema: "critical > strong > guideline"
authority: "review-guidance"
---

# Kordex Architecture Review

<meta-instruction>
Use this file to understand Fable's big-picture read of Kordex. This is a strategic
summary, not a replacement for the numbered decision docs.
</meta-instruction>

## 1. Executive Verdict

<review-verdict>
Fable described Kordex as one of the most internally coherent solo-project architectures
it had reviewed. It said the decision-doc discipline, locked decisions, explicit non-goals,
anti-regression guards, and doc-hygiene rules have produced a system where runtime layering,
persistence boundaries, safety policy, and future extensibility point in the same direction.
</review-verdict>

## 2. Kordex In Plain Language

<context>
Kordex is a local-first personal knowledge system centered on a correctable ontology, not
just notes or tags.

The user captures insights. Today those are mostly coding insights from code and chat.
The system classifies each capture into a profile-owned meaning system: taxonomy, boundary
rules, labels, metadata fields, retrieval rules, prompt behavior, and graph encoding.

The key product loop is around mistakes:

1. The system classifies.
2. The user corrects when it is wrong.
3. The correction is stored as factual evidence.
4. Repeated evidence can become proposals.
5. Proposals can be reviewed, accepted, rejected, postponed, or questioned.
6. Only explicit guarded Apply mutates the durable meaning system.
</context>

## 3. What Makes Kordex Special

<positive-directives>
- Treat mistakes as first-class product data.
- Store corrections as factual evidence before making decisions.
- Turn evidence into reviewable proposals, not silent mutation.
- Version the meaning system like code.
- Keep user authority at the center of ontology change.
</positive-directives>

Fable's strongest line:

> The thing that makes this project special, if polished, is that it treats being wrong as the primary product surface: a knowledge system that records its mistakes as facts, proposes its own corrections under user authority, and versions its meaning system like code.

## 4. Technical Architecture Map

<context>
Fable mapped Kordex as layered architecture:

- Durable facts in SQLite.
- Pure derivation helpers that compose profiles, select context, validate prompts, and project user-fit.
- Guarded mutation paths that compile typed operations and write audit events.
- User-facing surfaces that create drafts and proposals without directly mutating ontology/profile state.
</context>

### Durable Facts

- `profile_definitions`
- `profile_branches`
- `profile_selections`
- `ontology_correction_evidence`
- `profile_change_proposals`
- `profile_proposal_events`
- `profile_trust_settings`

### Pure Derivation

- runtime profile composition
- active selection resolution
- profile registry lookup
- user-fit projection
- context selection
- ContextPack assembly
- Conceptualize prompt building
- strict Conceptualize output validation

### Guarded Mutation

- branch-local proposal apply
- base/core proposal apply with version guards
- proposal review events
- conflict and stale-version checks before mutation

## 5. Core Invariants Fable Saw Working

<absolute-constraints>
- Facts are not mutations.
- Suggestions are not mutations.
- Runtime profiles are derived, not persisted as composed truth.
- Node identity is scoped; labels are not identity.
- Hidden near-miss candidates are internal diagnostics, not visible extra tags.
- User-fit confidence is advisory context, not apply authority.
- Branch-local proposals do not silently widen to core/base.
- Base/core mutation is explicit and version-guarded.
- Sibling branches do not receive silent propagation.
</absolute-constraints>

## 6. Product Gravity Warning

<conditional-logic>
IF future work keeps adding seams without making the user experience branch/profile/checker value,
THEN the architecture risks becoming stronger than the visible product.
</conditional-logic>

Fable's recommendation was to shift from building more seams toward experienced loops:
manual checker, proposal lifecycle, and branch/profile selection UI.
