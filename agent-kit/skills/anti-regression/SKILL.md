---
name: anti-regression
description: Review whether a concrete TypeScript change preserves required behavior, compatibility and failure handling. Use for a diff or refactor; use repo-review for broader architecture assessment.
---

# Anti-regression

Paths below are repository-relative. Start from the user's requirement and the
actual staged, unstaged and new files; untracked work is part of the review.

- Trace changed public contracts through callers, persistence, adapters and views.
- Check variant exhaustiveness, old stored/input shapes, cancellation and conflict
  handling. A deleted branch may also have provided necessary type narrowing.
- For each claimed preserved invariant, choose a fitting test from
  `docs/agents/verification.md`. A mocked transaction does not prove rollback.
- Run the relevant checks. For leaves/rules/tools/skills include
  `npm --prefix tools run check`. Do not substitute that gate for application tests.
- Report concrete regressions with inspected source locations, triggering inputs,
  effects and a minimal fix. Distinguish old baseline defects and unverified paths.

Update a durable rule only when the finding justifies it at that scope; prefer
an executable regression check over another broad prose prohibition.
