# Rule-model interview — prepared, not decided

2026-11-09. Prepared for the owner after K1 review, **before storage design**.
The scenario is the repository's stale-apply experience in the
[core roadmap](../progress/2026-11-09-core-roadmap.md). Parent/child A1/B1/C1
remain undecided. No option below changes code or approves a schema.

## First question

Is an accepted rule part of a scoped profile, changed through its proposal
lifecycle, or a distinct knowledge record alongside profiles?

| Choice | What it reuses | What still needs a decision / would be duplicated |
| --- | --- | --- |
| Rule belongs to a scoped profile; existing proposal lifecycle evolves it | Target identity, expected base version or branch snapshot, pure freshness decisions, supported patch validation, pending/rejected/superseded vocabulary and replacement/audit semantics | Existing patches support ontology/profile changes, not a generic executable rule. Decide how rule identity, source, scope and accepted replacement are represented without disguising a rule as a learning capture or category. Transactional orchestration and storage still need portable implementations. |
| Rule is a separate record type | Source/scope principles and reusable validation or revision decisions where their contracts actually match | New record identity and accepted history; potentially a second target model, freshness rule, replacement lifecycle and audit pathway. A separate record need not require duplicated policy, but that shared policy boundary must be demonstrated rather than assumed. |

Recommendation to discuss: start by testing reuse of the scoped-profile proposal
lifecycle against the concrete experience. It already separates candidate and
accepted state. Do not force a rule into an ontology node solely to reuse code:
if its identity/lifecycle cannot be represented faithfully, show the smallest
distinct record and exactly which lifecycle decisions remain shared.

## Consequences to settle after that answer

1. Origin: what source identifies the experience, and what does validation prove?
   Resolving a source does not establish the truth of its prose.
2. Scope: repository, capability, profile or another explicit identity; what
   prevents same-text rules in different scopes from being merged?
3. Conflict: does recency replace an earlier accepted decision automatically,
   or only through an explicitly accepted replacement? Existing invariants
   already exclude silent model-origin mutation.
4. Replacement: which accepted revision does a proposal expect, and which
   lineage remains inspectable after restart? Missing/stale expectations cannot
   bypass guarded apply.
5. Reconsideration: what makes a rule due for review, and what happens to retrieval
   while it awaits review? Do not infer these states from freshness alone.

K1 proves portable decisions and packaging. It does not yet contain a portable
replacement/audit service or an accepted-rule store. Those still live in app
orchestration or remain product decisions; moving pure functions did not move
the whole lifecycle.
