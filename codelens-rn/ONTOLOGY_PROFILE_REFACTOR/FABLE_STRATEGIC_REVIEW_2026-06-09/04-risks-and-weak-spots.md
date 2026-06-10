---
version: "1.0.0"
model_target: "risk-reviewer"
protocol_compat: "not-runtime-protocol"
dependencies: ["33_CONCEPTUALIZE_EXTRACTOR_FLIP_DECISION.md", "21_CHECKER_PROPOSAL_REVIEW_CONTEXT_AND_APPLY_DECISION.md", "39_EDIT_THEN_APPLY_DECISION.md"]
last_updated: "2026-06-09"
priority_schema: "critical > strong > guideline"
authority: "review-guidance"
---

# Risks And Weak Spots

<meta-instruction>
This file records Fable's risk register. These are not blockers; they are the pressure
points most likely to hurt product coherence if ignored.
</meta-instruction>

## 1. Highest-Risk Weak Spots

<risk-register>
- Risk 001: Architecture seams are ahead of lived user experience.
- Risk 002: The checker does not exist yet, so evidence/user-fit has no active consumer.
- Risk 003: Proposal rot can appear without superseding and stale-refresh.
- Risk 004: Documentation entropy can mislead future agents.
- Risk 005: `ProfilePatch` may be too coarse for future split/merge/rename/deprecate operations.
- Risk 006: Append-only evidence/proposal/event tables need future retention or compaction policy.
- Risk 007: Relationship semantics remain partially deferred.
- Risk 008: Conceptualize fallback frequency is currently not visible enough to measure classifier degradation.
</risk-register>

## 2. Risk 001 - Seams Ahead Of Product

<review-warning>
Branches, selections, registries, trust settings, and base apply exist, but the user still
cannot fully experience branch/profile creation and selection. If this continues too long,
the architecture may encode guesses that are not validated by product use.
</review-warning>

## 3. Risk 002 - Checker Missing

<review-warning>
Correction evidence, near-miss snapshots, proposal events, and user-fit projection only
become special when the checker reads them and proposes useful changes. Without checker
runtime, the feedback loop is mostly stored potential.
</review-warning>

## 4. Risk 003 - Proposal Rot

<review-warning>
Revalidation prevents unsafe apply, but stale/conflicted pending proposals can still accumulate.
Superseding and stale-refresh are needed before checker-generated proposal volume grows.
</review-warning>

## 5. Risk 004 - Documentation Entropy

<review-warning>
The docs are valuable, but duplicated status logs and stale indices are becoming expensive.
Future agents may spend too much context reconciling docs instead of respecting locked decisions.
</review-warning>

## 6. Risk 005 - Operation Vocabulary

<review-warning>
The current patch shape is adequate for add/override proposal flows. It may not be expressive
enough for future checker suggestions such as split, merge, rename, deprecate, and move.
</review-warning>

## 7. Risk 006 - Local Storage Growth

<review-warning>
Local-first SQLite storage will eventually need retention/compaction rules for append-only
correction evidence, proposal events, proposals, and near-miss JSON.
</review-warning>

## 8. Risk 007 - Relationship Semantics

<review-warning>
Relationship ids are currently treated as opaque in apply paths. That is safe, but future graph
and checker behavior will need more precise semantics around relationships and boundary rules.
</review-warning>

## 9. Risk 008 - Conceptualize Fallback Observability

<review-warning>
The live Conceptualize extractor flip can fall back to the old extractor placement when strict
validation fails. That fallback is safe, but warn-only visibility makes classifier quality
regressions hard to measure before widening the flip.
</review-warning>

## 10. Pre-Flight Checklist

<pre-flight-checklist>
Before adding new architecture surface area:
1. [ ] Does this produce visible user value soon?
2. [ ] Does this feed the correction/proposal/checker loop?
3. [ ] Does this increase proposal queue volume before lifecycle tooling exists?
4. [ ] Does this add another doc/status surface that duplicates existing handoff state?
5. [ ] Does this require operation types that `ProfilePatch` cannot express cleanly?
6. [ ] Does this make classifier fallback frequency observable before expanding Conceptualize behavior?
</pre-flight-checklist>
