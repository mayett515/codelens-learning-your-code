# CodeLens — Completeness Guard

> Prevents "almost correct" specs. Use this when reviewing any stage.

---

## Rule 1 — No Silent Gaps

<completeness_rule>
If a system surface exists, it MUST define:

- purpose: what it is for
- primary user action
- ordering logic, if it is a list
- grouping logic, if it is a list
- tie-breaker, if it is a list
- visibility rules: when it appears

If any of these are missing, the spec is incomplete.
</completeness_rule>

---

## Rule 2 — Lists Must Define Ordering

<ordering_rule>
Every list UI MUST define:

- sort order
- grouping, if any
- tie-breaker

Forbidden:
- "default sort" without field names
- "recent first" without defining the timestamp field
- implicit ordering
</ordering_rule>

---

## Rule 3 — Every Screen Has One Job

<screen_rule>
Each surface MUST answer: "What is the user trying to do here?"

Examples:
- Learning Hub → navigation + awareness
- Recent Captures → see what was recently saved
- Concept List → find a concept to open
- Capture Full → understand one moment
- Concept Full → understand one pattern
- Knowledge Health → visualize knowledge state

If multiple primary jobs exist, the surface is wrong.
</screen_rule>

---

## Rule 4 — No Hidden Secondary Systems

<no_shadow_systems>
If a concept appears in the spec — sessions, chains, health, review, graph, promotion — it MUST be declared as either:

- primary surface
- secondary metadata
- deferred/future work

Never leave it ambiguous.
</no_shadow_systems>

---

## Rule 5 — Review Protocol

<review_protocol>
When reviewing specs, check for:

- missing ordering
- missing purpose
- missing primary action
- missing visibility
- architectural contradictions
- regression against capture-first
- UI surfaces becoming reading surfaces accidentally

Do NOT say "looks good" unless no missing definitions and no contradictions exist.
</review_protocol>

---

## Final Rule

<final_rule>
A system that is 95% defined is not done.
</final_rule>
