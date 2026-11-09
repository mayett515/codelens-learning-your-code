# Milestone execution — 2026-11-09

User authorization: work in order on a separate branch, commit each bounded
slice, push and open a PR. No merge into main, force-push or history rewriting.
Stop for product decisions, unavailable required checks, scope/dependency
expansion, contradictory evidence or two failed attempts at the same fix.

## Sequence and decision gates

| Milestone | Scope and proof | Status |
| --- | --- | --- |
| M0 | Commit rule/skill/leaf adoption, open PR, observe real GitHub gate | Completed: push and PR runs succeeded for 088ef3d |
| M0b | Install existing app dependencies; run suite, compiler and lint once; record failures | Completed: 1117 tests and compiler pass; pre-existing lint failures recorded below |
| A | Newly found branch proposal snapshot gap: reject missing/stale revisions before writes | Completed; legacy recovery remains for B |
| B | Explicit refresh of missing-snapshot branch proposals as reviewed replacements | Authorized; next slice |
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

## M0b — application baseline, 2026-11-09

Inspected revision: `5493b0852d4cd7ee6df20716c45182fbf79a6fc7`; application
source and lockfile unchanged. Windows, Node 24.19.0, npm 11.17.0.
Responsibility: establish the starting evidence, without repairing unrelated
application behavior. No capability state changed.

Commands run from `codelens-rn/`:

| Command | Observed result |
| --- | --- |
| `npm ci --no-audit --no-fund --fetch-retries=0 --fetch-timeout=30000` | Exit 0; locked dependencies installed, repository postinstall ran |
| `npm test` | Exit 0; 120 files, 1117 tests passed |
| `node node_modules/typescript/bin/tsc --noEmit` | Exit 0; no diagnostics |
| `npm run lint` | Exit 1; 4 errors and 213 warnings |

All four existing errors are left unchanged:

- `src/features/bookmarks/index.ts:14` and `:15`: duplicate exported
  `BookmarkId` (`import/export`, two errors).
- `src/ui/components/ChatBubble.tsx:28`: missing component display name
  (`react/display-name`).
- `src/ui/components/CodeViewer.tsx:67`: missing component display name
  (`react/display-name`).

The [complete lint output](2026-11-09-app-baseline-lint.txt) records every warning
and error, including locations and rule names. No automatic fixes were applied.
Install reported deprecated transitive packages and npm allow-scripts warnings;
no package, lockfile or script-policy change was made. Tests and compiler ran
successfully despite those warnings.

This establishes the Node suite/compiler/lint baseline, not native UI behavior or
real SQLite rollback. No required baseline check was unavailable. Subsequent
slices must preserve the passing suite/compiler and introduce no new lint issue.
Next milestone: M1a; the separately requested parent/child design note prepares
M4 and does not authorize implementing its undecided contracts.

## Slice A — branch proposal snapshot guard

The user inserted this slice before M1a after the design inspection reproduced
an old invariant violation. Owner: `applyPendingBranchLocalProfileChangeProposal`;
caller: `applyProfileChangeProposal` / review hook. The existing pure freshness
decision now checks the stored proposal revision after pure patch validation and
before any service write. The existing conditional write remains unchanged.
The review error formatter handles the new `proposal_not_fresh` error code.
Parent-state tracking, base ownership, schemas and transaction structure are out
of scope. The base version guard was inspected and has no equivalent omission.

Failing first: the three new service cases (snapshot 10, null, undefined against
branch 20) all failed because the old service resolved with an accepted proposal.
After the fix they reject without branch/status/event write calls, and retain
unchanged input records. This proves rejection before attempted effects with
injected repositories; it does not prove real SQLite rollback or concurrency.

Validation on 2026-11-09:

- Focused branch/base service, presentation and photography forkability tests:
  31 passed in four files.
- `npm test`: 1120 passed in 120 files; all previous tests still pass.
- `node node_modules/typescript/bin/tsc --noEmit`: exit 0.
- Local ESLint on the four touched TS files: exit 0, no errors, the same five
  pre-existing warnings (four `import/first`, one `array-type`). Repository-wide
  M0b failures remain unchanged: duplicate `BookmarkId` exports at lines 14/15,
  and missing display names in ChatBubble/CodeViewer; full baseline output above.
- `npm --prefix tools run generate`, then `npm --prefix tools run check`:
  map updated, tooling compiler and 27 fixtures passed; expected dirty-owner
  warning was inspected against the actual diff.

Leaf transition: `branch-proposal-apply` was corrected from `implemented` to
`partial` when the defect was reproduced. It remains `partial` solely for the
separately authorized recovery gap: until B, missing-snapshot proposals are
blocked and must be recreated. No unknown proposal is treated as fresh.
Next slice B adds explicit validated replacement/supersession; it does not apply
that replacement automatically.
