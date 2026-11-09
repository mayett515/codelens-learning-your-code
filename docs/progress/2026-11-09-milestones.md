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
| B | Explicit refresh of missing-snapshot branch proposals as reviewed replacements | Completed; replacement remains pending and Apply remains explicit |
| M1a | Foreign-parent rejection in profile-selection, failing-first decision test | Completed: shared resolver guard and regression evidence |
| M1b | Preserve non-coding scope across learning-chat route/store/modal/save/read-back | Approved Node scope completed; leaf remains partial pending native route/read-back proof |
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

## Slice B — explicit recovery for missing branch snapshots

Owner: existing `refreshStaleProfileChangeProposal`; decision:
`evaluateProfileProposalFreshness`; callers: freshness loader and existing review
screen/hook. Missing branch snapshots remain `unknown` and cannot apply, but can
refresh with a known current branch revision and a validated patch. The refresh
service dry-runs again inside its existing transaction, inserts a pending
replacement, conditionally supersedes the old proposal and records its audit.
The screen already uses `canRefresh`; explanatory copy now describes review of
the replacement. Base unknown snapshots, new operation vocabulary, schemas and
transaction restructuring are out of scope.

The existing refresh service owns this transaction directly; it does not call
`supersedePendingProfileChangeProposal`. The replacement leaf's earlier caller
description was corrected, and the refresh owner/evidence were added there.
No structural consolidation was mixed into this behavior change.

Failing first: five cases failed on the old implementation (unknown eligibility,
null/undefined replacement and null/undefined patch-conflict dry-run). Afterward:

- Focused freshness/service/presentation/apply tests: 56 passed in five files.
- `npm test`: 1127 passed in 120 files; all baseline tests pass.
- Local compiler: exit 0.
- ESLint on six touched TS files: exit 0, no errors; the same eight pre-existing
  warnings (five `import/first`, two unused error imports, one `array-type`).
  The four repository-wide M0b errors remain unchanged as recorded above.
- Map generation and `npm --prefix tools run check`: exit 0, tooling compiler
  and 27 fixtures pass; the modified owner was explicitly inspected.

Proof limits: tests demonstrate pending replacement, preserved patch/evidence,
old-to-new audit lineage, unchanged supplied branch, and no writes on invalid
patches. They use injected repositories; real SQLite rollback/concurrency and
native screen interaction remain unproved. The transaction protocol is unchanged.

Leaf result: `proposal-replacement` remains `implemented` with its newly explicit
refresh owner; `branch-proposal-apply` returns from `partial` to `implemented`
after A's enforcement and B's recovery evidence. `inspectedOn` remains the actual
inspection day, 2026-11-09. Next slice: M1a, foreign-parent selection rejection.

## M1a — selected branches must belong to the base

Owner: `resolveProfileSelection` / private `resolveIds`. Callers include
`composeRuntimeDomainProfileFromSelection` and `resolveRuntimeProfileForProject`.
Only selected branches are checked; the branch pool may contain unrelated bases.
No changes to composition order, persistence, defaults or UI were made.

Failing first: coding-owned project, learning and personal branches in a
photography selection all failed their new expected-rejection tests. After the
guard, resolution and composition reject each case. A valid reversed selection
with an unselected foreign branch still resolves in requested order.

The first full check also exposed invalid pre-existing happy-path fixture parent
IDs in runtime activation and a generic type inference issue in the new test.
The fixture parents now match their `test-base`; the new heterogeneous test
explicitly selects the supported string generic. Existing assertions were retained.

Final proof on 2026-11-09:

- `npm test`: 1131/1131 passed in 120 files.
- Local TypeScript compiler: exit 0.
- ESLint on the three touched TS files: exit 0; six pre-existing warnings
  (three unused fixture imports, three `array-type`), no new errors/warnings.
  The four M0b repository-wide lint errors remain unchanged.
- Map generation and `npm --prefix tools run check`: exit 0, tooling compiler
  and all 27 fixtures passed. The dirty owner warning was reviewed against its diff.

Leaf `profile-selection` moves `partial -> implemented` for this pure responsibility.
The meaning parent and dated baseline were updated. No native or DB behavior is
claimed from these tests.

## M1b — verification boundary before implementation

Read-only inspection confirms the existing route/store/modal gap. No M1b code
was edited. `adb` and `emulator` are absent from PATH, the default local Android
SDK directory does not exist, and ANDROID_HOME/ANDROID_SDK_ROOT are unset.
A nonstandard or external installation has not been ruled out. The current
Node suite is not proof of the required native save flow.

Under the user's unavailable-check stop rule, implementation waits for either
a usable runtime or explicit acceptance of a bounded headless fix with its native
verification gap retained in the leaf. This is not an M1b completion claim.

## Additional observed CI

For pushed revision `8872700a79da7e7dc9e8538b5737fe6200d8538e` (design plus A/B),
both [PR run](https://github.com/mayett515/codelens-learning-your-code/actions/runs/42690924821)
and [push run](https://github.com/mayett515/codelens-learning-your-code/actions/runs/42690913004)
completed successfully on 2026-11-09. This remains the tooling CI, not app/native CI.

## M1b — approved Node scope completed, native proof remains open

The user accepted a bounded Node-verified repair without installing native tools.
This supersedes the earlier wait above, but does not waive the native verification
gap or authorize claiming the capture-save leaf implemented.

Responsibility: carry a known base profile into capture creation. Owners/callers:
learning-chat `handleSaveAsLearning` supplies the concept profile to store.open;
`SaveCandidateSource` carries it; `SaveAsLearningModal` passes it into
`resolveConceptualizeProfileContext`, then preparation and the existing save flow.
The resolver loads an explicit profile from the existing registry and refuses
unknown/blank profiles or disagreement with project selection. A project without
selection uses the explicitly supplied base; only absent context retains coding.
Preparation refuses a known source/profile mismatch. Source changes also restart
modal extraction rather than retaining an earlier source's in-flight context.
No change to the save transaction, dependency set, native tools or schema.

Failing first:

- The initial collision fixture incorrectly assumed the built-in coding profile
  already had a `composition` ontology node. Before changing production code,
  the test was corrected to deliberately seed one with a different meaning.
- The actual chain regression then reached the real capture insert mapping and
  observed `profileId: coding` instead of `photography`.
- Explicit missing/blank profiles, a new project's explicit base and conflicting
  project selection also failed the intended expectations on the old resolver.
- A separate preparation case initially accepted a known photography source
  under the coding default; it now rejects that mismatch before extraction.

Test boundary: store.open receives the known concept profile; the test calls
the real resolver, candidate preparation/classification, conceptualized save,
capture save, repository insert mapping and repository read codec. Model replies,
registry data and SQL transport are supplied by the test. The transport records
rows in memory and returns them for decoding; it does not execute SQL predicates,
persist to disk or provide rollback. Route and modal components are not rendered.
This is not a route-to-native-read-back test.

Final checks on 2026-11-09:

- `npm test`: 1139/1139 passed across 121 files, including eight new cases.
- `node node_modules/typescript/bin/tsc --noEmit`: exit 0.
- Local ESLint on the six changed TS/TSX files: exit 0; no errors or new warnings.
  The two existing learning-chat `react-hooks/exhaustive-deps` warnings remain.
  The full baseline's four errors remain unchanged: duplicate BookmarkId exports
  at lines 14/15, missing display names in ChatBubble and CodeViewer. The full
  pre-existing warning inventory remains in the M0b lint artifact.
- `npm --prefix tools run generate` and `npm --prefix tools run check`: exit 0;
  tooling compiler and all 27 fixtures passed. Dirty supporting-owner warnings
  were inspected against their actual diffs; source bindings/map were updated.

Leaf transition: `capture-save` stays `partial`; its old functional gap is replaced
by the remaining verification gap, "Route handover and read-back are not verified
in a running app with native SQLite." Revisit on a device/emulator. Registry
materialization/ownership remains M1c and is not fixed implicitly here.

Review checkpoint requested by the user: Fable can now inspect snapshot guard A,
legacy refresh B, M1a and this M1b slice together. M1c still requires a product
ownership decision before implementation; no later milestone was started.

## Fable's independent review and three follow-ups

The user supplied Fable's independent review on 2026-11-09: no blocking findings
in A/B/M1a/M1b, with 1139 app tests, compiler and 27 tooling fixtures passing on
Fable's run. Fable explicitly did not review the parent/child design note in that
pass. This is attributed reviewer evidence, not a claim of running those checks
again here.

The three requested follow-ups are separate commits:

1. Add an application job to the existing push/PR workflow: Node 24, locked
   dependency installation with postinstall, full app suite and local compiler.
   Lint is not blocking while the four baseline errors remain. YAML/event/job
   wiring and repository checks were checked locally; remote execution must be
   observed on the pushed revision before reporting CI success.
2. Reinspect the branch apply owner/callers and document that proposal-snapshot
   validation belongs to the service, not the pure helper. The service is the
   only inspected production writer applying branch proposals, not the only
   possible branch-storage operation. Map regeneration changed no inventory
   content; the tooling compiler and all 27 fixtures passed.
3. Record the existing no-project, base-only save behavior in the dated baseline,
   with the resolver/route and pre-M1b revision as evidence. No branch-selection
   semantics or application source was changed in these follow-ups.

After remote verification, stop before M1c. Its ownership decision remains with
the user, and Fable's design-note review is still pending. No merge is authorized.

## Fable design review received; M1c options prepared

On 2026-11-09 the user supplied the subsequent positive design-note review.
Fable recommends A1 with a copied-node basis, composition-first B1, deferred
edges/chains and shared lifecycle vocabulary without a generic interpreter.
These are reviewer recommendations, not the user's product decisions.

The design note now includes the two requested refinements. The
[M1c option sheet](../reviews/2026-11-09-m1c-profile-ownership-options.md) compares
ownership at first approved edit, at first use, or never for built-in IDs. It
states the release-drift issue precisely: both inspected built-ins declare
version 1, and their content can change without the numeric guard detecting it;
no historical release frequency was established. Node-local basis does not guard
all profile-wide dependencies.

Scope: documentation only, inspected source at `d020028`; bootstrap/base-apply
leaves stay partial. No failing behavior test is appropriate because this slice
does not implement a policy. Runtime/database/backup experiments were not run;
their required proof is specified for the later implementation. Await the user's
M1c ownership choice. A-C and M4 remain unapproved; no merge.

Local verification for this documentation slice: `npm --prefix tools run check`
passed (tooling compiler, 27/27 fixtures, repository metadata/link checks), and
`git diff --check` passed. The application suite/compiler were not rerun locally
for unchanged runtime code. No new database, native or backup behavior is proved.

## M1c decisions accepted; real persistence preflight failed

The user selected first-use materialization, with Fable now supporting the same
choice, then explicitly authorized legacy adoption of today's template with
permanently unknown earlier origin. The accepted contract is
[Doc 44](../../codelens-rn/ONTOLOGY_PROFILE_REFACTOR/44_BUILT_IN_BASE_MATERIALIZATION_DECISION.md).
Doc 15's duplicate rule has the requested narrow exception; the option sheet and
transfer ledger correct Fable's attribution. First-use command/audit, legacy
adoption, proposal invalidation, template basis and backup proof are specified.

Before any schema or runtime edit, Node's SQLite engine successfully executed
BEGIN/INSERT/ROLLBACK. The subsequent diagnostic exercised the installed Drizzle
op-sqlite driver and actual base apply service/repositories/codecs over a temporary
file database. Its successful-apply control passed. Injecting an audit-insert
failure produced version 2 / accepted / zero events after reopening instead of
version 1 / pending / zero events. SQL order was BEGIN, COMMIT, SELECT, SELECT,
UPDATE, UPDATE. `node scripts/diagnose-profile-rollback.cjs` exited 1 on the
required rollback assertion. Temporary storage was cleaned up.

This is a new proof of an old defect, not a passing integration test or a native
application run. See the [finding](../reviews/2026-11-09-base-apply-rollback-finding.md).
The base-apply leaf remains partial and now names the actual atomicity failure.
The separate driver repair requires the work-order contradiction stop; no M1c
schema, app behavior or dependency changed. No merge.

Documentation/diagnostic checks: `npm --prefix tools run generate` and
`npm --prefix tools run check` passed (27/27 fixtures and tooling compiler);
the generated map now includes the rollback gap. `node --check` on the diagnostic
and `git diff --check` passed. These checks do not turn its failed rollback
assertion into a passing guarantee. The default application suite does not run
this standalone diagnostic; no local full-suite rerun is claimed for this slice.
