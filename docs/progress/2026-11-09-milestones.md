# Milestone execution — 2026-11-09

User authorization: work in order on a separate branch, commit each bounded
slice, push and open a PR. No merge into main, force-push or history rewriting.
Stop for product decisions, unavailable required checks, scope/dependency
expansion, contradictory evidence or two failed attempts at the same fix.

## Sequence and decision gates

| Milestone | Scope and proof | Status |
| --- | --- | --- |
| M0 | Commit rule/skill/leaf adoption, open PR, observe real GitHub gate | Local gate passed; remote execution pending |
| M0b | Install existing app dependencies; run suite, compiler and lint once; record failures | Pending |
| M1a | Foreign-parent rejection in profile-selection, failing-first decision test | Pending |
| M1b | Preserve non-coding scope across learning-chat route/store/modal/save/read-back | Pending |
| M1c | Registry/bootstrap and base apply ownership; real persistence proof | User decision required before implementation |
| M2 | Concrete agent-context acceptance scenario and distinct other planned scenarios | Pending |
| M3 | Headless leaf query; proves repository-description access, not the Kordex lifecycle | Pending |
| M4 | Rule-model type interview: origin, scope, conflict, replacement, reconsideration | User decision required |
| M5 | One full rule lifecycle outside the app, durable retrieval/replacement and stale rejection | Pending preceding decisions |

## M0 — local evidence before publication

Responsibility: portable repository instructions and capability metadata checks.
Owners: root/nested instructions, shared docs/skills, `tools/` and the GitHub
workflow. Callers: agents, local check commands and CI. Capability states are
unchanged; existing application TypeScript and runtime behavior are out of scope.

Base: `main` at `e93822c5281e9d11e0a0a719b5912ab66866b354`, confirmed equal to
GitHub main immediately before publication. `npm --prefix tools run check`
passed tooling typecheck, all 27 fixtures and the real repository gate. The
earlier failing-first merge/link regressions are recorded in the
[transfer ledger](../engineering/TRANSFER.md). Publication introduces no new
behavior requiring an artificial failing test.

Open evidence: real GitHub workflow execution, application baseline/runtime and
database integration. A green repository gate is not application verification.
Next slice after observed successful CI: M0b.
