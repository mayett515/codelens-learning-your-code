---
version: "1.0.0"
model_target: "implementation-planner"
protocol_compat: "not-runtime-protocol"
dependencies: ["21_CHECKER_PROPOSAL_REVIEW_CONTEXT_AND_APPLY_DECISION.md", "39_EDIT_THEN_APPLY_DECISION.md"]
last_updated: "2026-06-09"
priority_schema: "critical > strong > guideline"
authority: "review-guidance"
---

# Recommended Next Gates

<meta-instruction>
Use this file to choose next implementation work without reopening locked architecture decisions.
</meta-instruction>

## 1. Fable's Recommended Order

<positive-directives>
1. Finish proposal lifecycle: superseding and stale-refresh.
2. Build the first manual checker runtime slice.
3. Add minimal branch/profile selection UI.
4. Decide richer operation vocabulary before checker proposes split/merge/deprecate/rename.
5. Do a doc consolidation pass.
6. Decide event/evidence retention for mobile storage.
7. Wire graph projection through composed profiles.
8. Prove forkability with a second base profile demo.
</positive-directives>

## 2. Gate 1 - Proposal Lifecycle

<context>
Why first:

- Checker will create more proposals.
- Existing apply guards prevent corruption but do not prevent stale queue clutter.
- `supersededByProposalId` already exists in proposal shape.
- Doc 39 already frames edit-then-apply and superseding as the durable path.
</context>

Implementation intent:

- Editing a pending proposal creates or marks a superseding proposal.
- Old proposal state reflects superseded status.
- Event audit records the transition.
- Stale proposal refresh has explicit UX and does not silently mutate targets.

## 3. Gate 2 - Manual Checker

<context>
Why second:

The evidence pipeline becomes product value only when a checker reads correction evidence,
near-misses, proposal events, and user-fit signals to create useful proposals.
</context>

Implementation intent:

- Manual "Run checker now" first.
- Create proposals only.
- No auto-apply.
- Use existing proposal review surface.
- Use bounded context and strict output validation.

## 4. Gate 3 - Branch/Profile Selection UI

<context>
Why third:

The architecture already supports profiles, branches, selections, registries, and runtime activation.
The user needs a way to create/select/see those layers before Kordex's core product loop is fully felt.
</context>

Implementation intent:

- Show active core/profile/branch.
- Let user create/select a branch through existing persistence and selection seams.
- Keep branch-local behavior explicit.
- Do not create sibling propagation or base mutation.

## 5. Gate 4 - Operation Vocabulary

<conditional-logic>
IF the checker starts proposing split, merge, rename, deprecate, move, or boundary-rule changes:
THEN define typed operation vocabulary before implementing those proposal kinds.
</conditional-logic>

## 6. Gate 5 - Documentation Consolidation

<context>
Fable considered this a sanctioned, high-leverage consolidation pass:

- Fix `00_DOC_SYNC.md`.
- Update root architecture map to include ontology/profile implementation.
- Rationalize `WHERE_WE_STAND.md`, `NEXT_LLM_CONTEXT.md`, and `implementation_handoff.md`.
- Preserve detailed logs but keep future LLM entrypoints short.
</context>

## 7. What Not To Do Next

<absolute-constraints>
- DO NOT start DSL/Racket implementation now.
- DO NOT start agent runtime now.
- DO NOT start app-builder runtime now.
- DO NOT add auto-apply.
- DO NOT widen branch-local proposals to base/core silently.
- DO NOT build checker proposal volume before lifecycle/stale handling is ready.
</absolute-constraints>

## 8. Pre-Flight Checklist

<pre-flight-checklist>
Before selecting the next slice:
1. [ ] Is this one of the recommended next gates?
2. [ ] Does this create user-visible loop value?
3. [ ] Does this preserve proposal-first apply?
4. [ ] Does this avoid implementing future-only DSL/agent/app-builder work?
5. [ ] Does this reduce, rather than increase, future architecture ambiguity?
</pre-flight-checklist>
