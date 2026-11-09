# Milestone execution — 2026-11-09

User authorization: work in order on a separate branch, commit each bounded
slice, push and open a PR. No merge into main, force-push or history rewriting.
Stop for product decisions, unavailable required checks, scope/dependency
expansion, contradictory evidence or two failed attempts at the same fix.

## Sequence and decision gates

| Milestone | Scope and proof | Status |
| --- | --- | --- |
| M0 | Commit rule/skill/leaf adoption, open PR, observe real GitHub gate | Completed: push and PR runs succeeded for 088ef3d |
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

## M0 — observed result

Adoption commit: `088ef3d6364c558866b96c19463cb2bcde740f44` on
`codex/kordex-rule-leaf-adoption`. [PR #1](https://github.com/mayett515/codelens-learning-your-code/pull/1)
is open against main; no merge occurred. The existing GitHub author identity
was verified against prior commits and the authenticated account and supplied
per command; no global Git identity setting was changed.

Observed on 2026-11-09:

- [Push run](https://github.com/mayett515/codelens-learning-your-code/actions/runs/42686848425): completed, success.
- [Pull-request run](https://github.com/mayett515/codelens-learning-your-code/actions/runs/42686927753): completed, success.

These runs cover dependency installation and the tooling gate on GitHub's Linux
runner for the named revision. Application/runtime/database evidence remains
open. Later revisions need their own CI results. Next slice: M0b, baseline only.
