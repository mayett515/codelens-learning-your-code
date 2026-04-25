# CodeLens — Regression Guard

> Non-negotiable rules that override stage specs if there is a conflict.
> Every LLM session must read this before implementing or editing any stage.

---

## Core

<core_guard>
CodeLens is capture-first.

Capture = moment of understanding.  
Concept = organization across captures.

If an implementation makes concepts primary during save, it is wrong.
</core_guard>

---

## Save Rules

<save_rules>
- Save must always succeed if the DB write succeeds.
- Save must NEVER depend on concept creation.
- Save must NEVER depend on concept linking.
- Save must NEVER depend on embedding success.
- If concept linking is uncertain, save unresolved.
- Capture persistence is the core promise.
</save_rules>

---

## Card Separation

<card_separation_rules>
- Candidate = decision.
- Compact = scanning.
- Full = reading / understanding.
- NEVER mix these roles.
- NEVER reuse Full capture UI in the save modal.
- NEVER introduce variant props for card density.
- NEVER introduce a shared base card abstraction.
- Correct product shape beats component-count purity.
</card_separation_rules>

---

## Hub Rules

<hub_rules>
- Hub is for navigation and awareness only.
- Hub MUST NOT contain full explanations.
- Hub MUST NOT contain full snippets.
- Hub MUST NOT become a deep reading surface.
- Deep understanding happens in Full views.
</hub_rules>

---

## Concept Rules

<concept_rules>
- One concept across languages.
- NEVER create duplicates like "Closure (JS)" or "Closure (Python)".
- Concepts are language-agnostic ideas.
- Same idea across languages attaches to one concept.
- Same intent with different approaches creates separate related concepts.
- Link first. Never auto-merge.
</concept_rules>

---

## Evidence Rules

<evidence_rules>
- Captures are the source of truth.
- Concepts reference captures.
- Concepts do not duplicate snippet text.
- rawSnippet text is immutable.
- Only boundaries can be adjusted.
</evidence_rules>

---

## Scoring Rules

<scoring_rules>
- familiarity_score and importance_score live on concepts only.
- familiarity_score MUST NOT change on save.
- capture count MUST NOT imply mastery.
- Review/revisit flows may update familiarity when explicitly defined.
</scoring_rules>

---

## Review Rules

<review_rules>
CodeLens is NOT Anki.

Forbidden:
- flashcards
- streaks
- pressure systems
- "you have X due" queues
- quiz-first review surfaces

Allowed:
- Review this concept
- Revisit this session
- contextual recall during chat
</review_rules>

---

## UI Language Rules

<ui_language_rules>
User-facing UI should use:
- Capture
- Save
- What clicked

Forbidden in user-facing UI:
- Learning Capture
- classification questions
- quiz language
</ui_language_rules>

---

## Final Rule

<final_rule>
If UX gets worse, reject the change.
Product correctness > implementation convenience.
</final_rule>
