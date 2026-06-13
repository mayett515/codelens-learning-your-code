# Next LLM Context

This is the canonical active handoff for the ontology/profile refactor. Use `implementation_handoff.md` and `WHERE_WE_STAND.md` only for historical slice audits.

## Authority Order

1. Numbered decision docs in `ONTOLOGY_PROFILE_REFACTOR/` are the source of truth.
2. Root docs (`MAIN.md`, `ARCHITECTURE.md`, `PERSISTENCE.md`, `current_state.md`) summarize current repo-wide architecture.
3. Fable strategic review docs are advisory review guidance only. They do not override numbered decisions.
4. Before proposing a new architecture decision, classify the topic as `already locked`, `partially implemented`, `open implementation gap`, or `actually undecided`.

Do not stage, commit, push, reset, or checkout unless the user explicitly asks.

## Current State - 2026-06-12

The ontology/profile refactor is an implemented spine, not just a plan.

Implemented:

- Profile compatibility columns on concepts/captures, with codecs and backup mapping.
- Profile branches, project-scoped active selections, static/base profile sources, runtime activation, and explicit runtime profile composition.
- Versioned `profile_definitions` for base/core profile apply.
- Append-only `ontology_correction_evidence` with active selection snapshots and internal near-miss diagnostics.
- Unified inert `profile_change_proposals` with `profile_proposal_events` for apply/reject/postpone/asked-why/superseded audit history.
- Branch-local apply and base/core version-guarded apply.
- Proposal review UI with Apply, Reject, Postpone, Ask why, event history, base/core review path, freshness readout, stale refresh, edit-then-replace for supported new-node proposals, and explicit branch-to-base target switching for supported pending additive proposals.
- Proposal creation hardening: branch-targeted Conceptualize new-type proposals require a current branch `updatedAt` snapshot before writing evidence/proposals, and checker proposal caps are clamped in tests.
- Conceptualize ContextPack assembly, prompt builder, strict output validator, singular public classification, missing-concept review UX, and guarded proposal creation.
- User-fit projection and data-layer facts reader. User-fit is bounded, advisory, derived on read, and scoped to the active selection where correction happened.
- Manual checker gate end to end: checker prompt/output validator, deterministic mapper, runtime service, UI trigger/readout, concrete model adapter over the existing AI queue, aggregated correction-pattern evidence, and item-type parent hints in checker payloads.
- Root-doc consolidation: root docs now describe the implemented ontology/profile/checker spine; `NEXT_LLM_CONTEXT.md` is the active handoff; `implementation_handoff.md` and `WHERE_WE_STAND.md` are historical pointers; Fable regression bans are folded into `05_ANTI_REGRESSION_RULES.md`.
- Doc 42 locks Gate 3 scope: minimal branch/profile selection UI over existing selection/branch/runtime activation seams. The pure selection-draft helper, focused data hooks, compact selection panel, and project-context wiring are implemented.

Still deferred:

- One-click direct Conceptualize Apply.
- Selection-panel UX polish and later consumers of selection context.
- Doc 43 locks the next forkability proof: a minimal photography second-base-profile demo that exercises existing seams and logs/fixes discovered coding couplings.
- Target-layer switching outside Doc 39's first branch-to-base additive scope.
- Base/core checker proposal targeting.
- Relationship/boundary/split/merge/rename/deprecate/move typed operation vocabulary.
- Temporary/provisional tag and relationship maturity lifecycle.
- Checker-run history table, background/event/scheduled checker modes, and auto-apply.
- DSL/runtime agents, self-building app runtime, source-sync adapters, external write-back, and MCP policy/runtime tools.

## Current Checker Shape

Doc 41 first checker gate is implemented.

- Manual-only `Run checker now`; no auto-run, no background scheduler, no automatic retry.
- AbortSignal is threaded through the hook/adapter path.
- The adapter parses raw JSON and then calls `validateCheckerPromptOutput`; invalid JSON or invalid schema fails closed.
- No fallback to unvalidated prose and no proposals from partial output.
- Supported proposal output is additive branch-local `ontology_node_patch` only.
- Mapper pins `sourceKind: 'checker'`, `sourceBranchId: null`, `proposalKind: 'ontology_node_patch'`, `target.kind: 'profile_branch'`, `targetProfileVersion: null`, current `targetBranchUpdatedAt`, one concept/node per proposal, checker-minted nodes as `createdBy: 'model'` and `status: 'active'`, deterministic risk, and insert-only dedup.
- Runtime loads bounded facts, assembles a checker ContextPack, calls the model outside the write transaction, re-reads branch state inside the write transaction, dry-runs each candidate through the branch-local compiler, skips conflicts/duplicates with explanation, and inserts only valid pending proposals.
- Repeated same-pattern correction evidence is aggregated into one checker claim with real `patternFrequency`; backing correction row ids remain available through `sourceEvidenceIds`.
- Checker ontology payload nodes expose `isItemType`, and output validation rejects non-item parent refs before proposal mapping.
- UI readout shows explanation, relationship/boundary observations, skipped findings, and created proposals in the existing review surface.

## Next Recommended Slice

Gate 3 is implemented, Doc 39's first target-switching path is implemented through the review surface, and the small checker/proposal hardening pass is done. Doc 43 now locks the next likely implementation slice: a minimal photography second-base-profile forkability demo.

Purpose:

- Implement Doc 43 as a proof/audit slice, not a product-profile UX slice.
- Treat every required production-code change outside the photography profile fixture as a discovered coding coupling to fix or log.
- Keep any target-switching extension outside Doc 39's implemented branch-local additive -> base/core path as a new scoped gate.

Still out of scope unless a later decision explicitly opens it:

- Target-layer switching outside Doc 39's locked first-slice scope.
- Cross-base evidence, proposals, checker output, or composition.
- Profile gallery/onboarding/shipping decision for photography.
- Base/core checker targeting.
- Relationship/boundary operation vocabulary.
- Maturity/provisional lifecycle.
- Auto-apply.
- DSL/agent/app-builder/source-sync runtime.

Optional hardening before a larger next gate:

- Add broader screen-level interaction tests around proposal review once the UI stabilizes.
- Add a cross-path born-fresh regression harness if another proposal creation path is introduced.

## Read First

Read these before code:

1. `README.md`
2. `00_DOC_SYNC.md`
3. `05_ANTI_REGRESSION_RULES.md`
4. `06_PROFILE_BRANCHING_AND_MERGE.md`
5. `07_KORTEX_CORE_AND_CHILD_CORES.md`
6. `08_KORTEX_LANGUAGE_LAYER_AND_ADAPTERS.md`
7. `09_KORTEX_OVER_EXISTING_SYSTEMS.md`
8. `10_ACTIVE_PROFILE_RUNTIME_SOURCE_DECISION.md` through `25_PROPOSAL_EVENT_AUDIT_STORAGE_DECISION.md` as needed for the touched boundary.
9. `28_CONTEXT_ASSEMBLY_DECISION.md`, `29_CONTEXT_SELECTOR_DECISION.md`, and `31-33` if touching ContextPack or Conceptualize prompts/model seams.
10. `37_USER_FIT_PROJECTION_DECISION.md` if touching correction/proposal learning signals.
11. `38_BASE_PROFILE_VERSIONING_DECISION.md`, `39_EDIT_THEN_APPLY_DECISION.md`, and `40_PROPOSAL_FRESHNESS_AND_STALE_REFRESH_DECISION.md` if touching proposal review/apply/freshness/editing.
12. `41_CHECKER_RUNTIME_FIRST_SLICE_DECISION.md` if touching checker prompt/mapper/runtime/UI.
13. `42_BRANCH_PROFILE_SELECTION_UI_DECISION.md` if touching branch/profile selection UI, checker target selection, or selection-driven proposal review context.
14. Root docs if touching repo-wide architecture or persistence: `../ARCHITECTURE.md`, `../PERSISTENCE.md`, `../MAIN.md`, `../current_state.md`.

## Current Worktree Notes

Run `git status --short` before working. Expected uncommitted product changes from the current slice include:

- Checker UI trigger/readout and adapter files under `src/features/ontology/hooks/`, `src/features/ontology/ui/`, and related tests.
- Stage10 architecture guard updates.
- Root-doc consolidation updates in root docs and this folder.

Do not include local tool/review folders in commits unless the user explicitly requests it:

- `.claude/`
- `.deepseek/`
- `.pi/`
- `.qwen/`
- `agyreview/`
- `slicereview/`
- `../.claude/worktrees/`

## Verification Status

Latest verification after checker UI/adapter, root-doc consolidation, and Doc 42 scoping:

- `npx.cmd tsc --noEmit --pretty false` passed.
- `npm.cmd test -- --run stage10-architecture-guards` passed: 81/81 tests.
- Focused checker/runtime/review tests passed: 31/31 tests across 5 files.
- Full `npm.cmd test -- --run` passed: 1031/1031 tests across 112 files.
- `git diff --check -- src ONTOLOGY_PROFILE_REFACTOR ARCHITECTURE.md PERSISTENCE.md MAIN.md current_state.md` passed with normal CRLF warnings only.

Latest verification after Doc 42 pure helper slice:

- `npx.cmd tsc --noEmit --pretty false` passed.
- `npm.cmd test -- --run profileSelectionDraft stage10-architecture-guards` passed: 95/95 tests across 2 files.

Latest verification after Doc 42 data-hook slice:

- `npx.cmd tsc --noEmit --pretty false` passed.
- `npm.cmd test -- --run useProfileSelection profileSelectionDraft stage10-architecture-guards` passed: 102/102 tests across 3 files.

Latest verification after Doc 42 compact selection panel slice:

- `npx.cmd tsc --noEmit --pretty false` passed.
- `npm.cmd test -- --run profileSelectionDraft useProfileSelection stage10-architecture-guards` passed: 107/107 tests across 3 files.

Latest verification after Doc 42 project-context wiring slice:

- `npx.cmd tsc --noEmit --pretty false` passed.
- `npm.cmd test -- --run profileSelectionDraft useProfileSelection stage10-architecture-guards stage4-hub-guards` passed: 115/115 tests across 4 files.

Latest verification after checker quality hardening:

- `npx.cmd tsc --noEmit --pretty false` passed.
- `npm.cmd test -- --run checkerPromptBuilder checkerProposalMapper checkerRunService stage10-architecture-guards` passed: 103/103 tests across 4 files.

Latest verification after Doc 39 target-switch data/hook/UI slices:

- `npx.cmd tsc --noEmit --pretty false` passed.
- `npm.cmd test -- --run useSwitchProfileChangeProposalTarget profileProposalReviewPresentation profileChangeProposalTargetSwitchService profileProposalTargetSwitch useRefreshProfileChangeProposal useEditProfileChangeProposal stage10-architecture-guards` passed: 114/114 tests across 7 files.

Latest verification after proposal/checker hardening:

- `npx.cmd tsc --noEmit --pretty false` passed.
- `npm.cmd test -- --run conceptualizeCorrections checkerProposalMapper checkerRunService profileProposalTargetSwitch profileChangeProposalTargetSwitchService stage10-architecture-guards` passed: 128/128 tests across 6 files.

Useful verification commands:

```powershell
npx.cmd tsc --noEmit --pretty false
npm.cmd test -- --run stage10-architecture-guards
git diff --check -- src ONTOLOGY_PROFILE_REFACTOR ARCHITECTURE.md PERSISTENCE.md MAIN.md current_state.md
```

## Guardrails

- The model may suggest taxonomy/profile changes; it must not silently apply them.
- User/profile-owner approval is required before ontology suggestions become durable profile changes.
- Prefer improving boundary rules before adding new categories, but V0 checker cannot emit boundary-rule operations until a typed operation vocabulary exists.
- Every checker suggestion must include evidence IDs and a reason.
- Do not rewrite user captures during ontology review.
- Do not invent source evidence.
- Do not make the app generic in a way that weakens the coding product.
- Do not let Kortex Core depend on CodeLens UI or coding-only relationship assumptions.
- Do not persist composed runtime profiles as canonical truth.
- Do not expose hidden near-miss diagnostics as visible extra tags.
- Do not use labels as durable node identity across scopes.

Important relationship-semantics caution before implementation:

```text
Current compatibility shape: prerequisite / related / contrast.
Newer product direction: is / is not boundary anchors plus dynamic profile/user/LLM-created relationship labels.
Do not hardcode a global final relationship taxonomy until this is reconciled deliberately.
```

Important language/runtime caution before implementation:

```text
Keep TypeScript for the current app and profile composition work.
Do not introduce Racket into this repo now.
Design pure helpers and future operation shapes so a Racket/Kortex DSL can compile to them later.
Self-updating means validated ontology/graph operations, not hidden source-code rewrites.
```

Important overlay caution before implementation:

```text
Kortex may later sit over existing systems through read/write/sync adapters.
It should be non-destructive by default: understand first, write back only by explicit approval/policy.
Do not build source sync, file watchers, static analysis, MCP, or write-back in the current branch unless explicitly asked.
```

Important agent/subagent caution before implementation:

```text
Kortex may later wrap agents/subagents with ontology-backed execution policy.
Tags/subtags can describe behavior, allowed operations, forbidden operations, and approval gates.
This is architecture direction only. Do not add orchestration, agent runtime, MCP policy tools, or permission enforcement in the current branch unless explicitly asked.
```

Important self-building-app caution before implementation:

```text
Kortex may later be the framework behind self-building apps: intent -> project ontology -> constrained subagents -> generated/modified app -> corrections feed ontology.
This is architecture direction only. Do not add app-builder runtime, code-generation orchestration, generated-app persistence, or source write-back in the current branch unless explicitly asked.
```
