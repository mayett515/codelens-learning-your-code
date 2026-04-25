# CodeLens — Master Plan & Tracker

> Single source of truth for the capture-first CodeLens learning system.
> Stage files contain implementation detail. This file locks the product semantics and build order.

---

## Required Reading Order

1. `CODELENS_REGRESSION_GUARD.md`
2. `CODELENS_COMPLETENESS_GUARD.md`
3. Current stage spec
4. Relevant previous stage specs

If files conflict: Regression Guard wins for product safety. Stage specs win for implementation details inside their scope.

---

## Status Legend

- 🔒 LOCKED — decided, do not reopen
- 🟡 OPEN — needs decision before build
- 🟢 DONE — implemented and verified
- 🔵 IN PROGRESS — being implemented
- ⚪ PLANNED — locked, not yet started
- ⛔ DROPPED — decided against

---

## Core Model

<core_model>
CodeLens is a capture-first system.

Capture = moment of understanding.  
Concept = pattern across captures.

Captures always stand on their own. Concepts organize captures after the fact.
</core_model>

---

## Hard Constraints

<hard_constraints>
- Save must ALWAYS succeed if DB write succeeds.
- Save must NEVER depend on concept creation.
- Save must NEVER depend on concept linking.
- Save must NEVER depend on embeddings.
- Candidate save UI and capture detail UI are fundamentally different.
- NEVER reuse Full capture UI inside the save modal.
- NO variant props in the card system.
- NO base card component abstraction.
- NO domain abstraction layer.
- NO `src/domain/` layer.
- CodeLens is coding-first.
- User-facing UI says Capture / Save / What clicked, not Learning Capture.
</hard_constraints>

<ui_integrity_rules>
- UI stages MUST NOT depend on future stage decisions.
- Specs must NEVER reference later stages as blockers.
- If something is not critical to correctness, mark it as implementation detail.
- UX polish decisions MUST NOT block core system implementation.
</ui_integrity_rules>

---

## Decision 1 — Architecture Scope 🔒

- CodeLens is a coding-first product.
- No domain abstraction layer.
- No DomainPack.
- No fake math/economy fork architecture.
- Keep code clean naturally, but do not build generic-domain infrastructure.

---

## Decision 2 — concept_type 🔒

12 internal-only values:

```ts
type ConceptType =
  | 'mechanism'
  | 'mental_model'
  | 'pattern'
  | 'architecture_principle'
  | 'language_feature'
  | 'api_idiom'
  | 'data_structure'
  | 'algorithmic_idea'
  | 'performance_principle'
  | 'debugging_heuristic'
  | 'failure_mode'
  | 'testing_principle';
```

Rules:
- single primary type only
- no fallback `other`
- questions/framing stay internal to extractor
- UI may show type as a subtle label/chip, never as classification questions

---

## Decision 3 — Capture Lifecycle 🔒

- 24h edit window for title / whatClicked / whyItMattered / conceptType.
- After 24h, capture content is immutable.
- Concept link can be adjusted any time because it is organization, not evidence.
- rawSnippet text is immutable.
- Boundary adjustment only.
- Continue-from-capture creates a new chat seeded with the capture context.
- New captures from that flow set `derivedFromCaptureId`.
- Chains have single parent, unlimited depth.
- Parent delete does not cascade.

---

## Decision 4 — Scoring 🔒

- `familiarity_score` and `importance_score` live on concepts only.
- `strength` is computed, not stored.
- familiarity_score MUST NOT update on save.
- familiarity_score updates only during explicit review/revisit flows.
- capture count does not equal mastery.
- Phase 1 uses familiarity primarily; importance remains stable until a later stage defines safe update rules.

---

## Decision 5 — Card System 🔒

Six components:

- `CandidateCaptureCard`
- `CaptureChip`
- `CaptureCardCompact`
- `CaptureCardFull`
- `ConceptCardCompact`
- `ConceptCardFull`

<card_rules>
- Candidate = decision.
- Compact = scanning.
- Full = reading / understanding.
- NO variant props.
- NO shared base card.
- ONLY shared primitives.
- If a card feels reused, it is wrong.
</card_rules>

---

## Pattern Transfer & Concept Unification 🔒

<pattern_transfer_rules>
- Concept = idea, not language surface.
- Same idea across languages attaches to the same concept.
- Never create "Closure (JS)" / "Closure (Python)" style concepts.
- `language_or_runtime` accumulates languages/frameworks/platforms seen through captures.
- Different approaches with same intent remain separate concepts linked by relationships.
- Memoization, caching, and indexing are related concepts, not one concept.
</pattern_transfer_rules>

---

## Build Order

### Stage 1 — Data Foundation
Schemas, migrations, branded IDs, codecs, async embedding status.

### Stage 2 — Extractor + Save Flow
Extraction, candidates, concept pre-check, persistence, async embedding enqueue.

### Stage 3 — Card Components
All 6 components and shared primitives.

### Stage 4 — Learning Hub
Recent Captures, concept list, session cards, concept full detail entry, Knowledge Health.

### Stage 5 — Promotion System
Manual promotion, clustering, suggestions, confirmation flow.

### Stage 6 — Retrieval
FTS5 + sqlite-vec hybrid retrieval, ranking, injection contracts.

### Stage 7 — Dot Connector + Review Mode
Memory injection UI, review threshold mode, visible "N memories loaded" indicator.

### Stage 8 — Personas + Chat UX Polish
Personas/Gems, cancel button, selected code preview, line-level mini chat, bookmarks.

### Stage 9 — Native Graph Rewrite
Concept nodes only, structure/recency/strength modes.

---

## Stage 4 Locked Intent Preview

<stage_4_intent>
Learning Hub is for navigation and awareness, not deep reading.

It contains:
- Recent Captures: what did I just save?
- Concept List: what concepts exist?
- Session Cards: what happened in a work session?
- Knowledge Health: what needs attention?

Deep understanding happens in Full views, not in the Hub lists.
</stage_4_intent>

---

## Final Rule

<final_rule>
Product correctness > implementation simplicity.
</final_rule>
