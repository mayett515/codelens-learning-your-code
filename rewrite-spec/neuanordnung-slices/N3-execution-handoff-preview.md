# Slice N3 - Execution Handoff + Patch Preview

## Goal

Hand validated SRJ to an executor, show dry-run results, and apply changes only after explicit confirmation.

This slice is where Neuanordnung becomes useful, but it is also the highest-risk slice.
Do not fake success.

## Must Read

- `rewrite-spec/neuanordnung-slices/README.md`
- `rewrite-spec/11-NEUANORDNUNG-MAIN.md`
- `rewrite-spec/12-NEUANORDNUNG-ARCHITECTURE.md`
- `rewrite-spec/13-NEUANORDNUNG-ANTI-REGRESSION.md`
- `rewrite-spec/14-NEUANORDNUNG-PHASES.md`
- `rewrite-spec/07-PRESERVE-THESE-BEHAVIORS.md`
- `codelens-rn/whatwe_agreedonthearchitecture.md`

## Depends On

N0, N1, and N2 must be complete:

- parse snapshots exist,
- SRJ drafts validate locally,
- mobile controls create typed planner actions.

## Allowed Write Scope

```txt
codelens-rn/src/ports/refactor-executor.ts
codelens-rn/src/adapters/refactor-executor-client.ts
codelens-rn/src/features/neuanordnung/domain/validation.ts
codelens-rn/src/features/neuanordnung/application/prepareExecution.ts
codelens-rn/src/features/neuanordnung/application/validateDraft.ts
codelens-rn/src/features/neuanordnung/application/useRefactorPlanner.ts
codelens-rn/src/features/neuanordnung/data/execution-repository.ts
codelens-rn/src/features/neuanordnung/data/codecs.ts
codelens-rn/src/features/neuanordnung/data/query-keys.ts
codelens-rn/src/features/neuanordnung/ui/ExecutionPreview.tsx
codelens-rn/src/features/neuanordnung/ui/SrjPreview.tsx
codelens-rn/src/features/neuanordnung/index.ts
```

Small edits to source-file repository code are allowed only for confirmed patch application and must preserve existing persistence contracts.
Test files for the same modules are allowed.

## Required Build

<required_build>
1. Define `RefactorExecutorPort`.
2. Implement executor client or desktop-handoff adapter.
3. Validate SRJ before dry-run.
4. Block stale source fingerprints.
5. Run dry-run before execute.
6. Render changed files, patch summary, warnings, skipped mutations, and failed mutations.
7. Require explicit user confirmation before applying.
8. Persist execution records with executor version and timestamp.
</required_build>

## Hard Constraints

<hard_constraints>
1. No direct execute without dry-run.
2. No source-file modification without confirmation.
3. No fake executor that returns success for every job.
4. Partial success must be represented explicitly.
5. Failed patch application leaves source records unchanged.
6. Executor warnings must be visible.
7. Standard pattern intents must be skipped or warned if unsupported.
</hard_constraints>

## Stop Conditions

<stop_conditions>
Stop and report if:
- there is no real executor or handoff path,
- source file persistence cannot apply changes atomically,
- stale fingerprint validation cannot compare current source to draft source,
- dry-run result shape cannot represent warnings/skips/failures.
</stop_conditions>

## Verification

Run or inspect:

- TypeScript compile.
- Unit tests for stale draft blocking.
- Unit tests for invalid SRJ blocking dry-run.
- Unit tests for dry-run warning surfacing.
- Unit tests for failed apply preserving source records where practical.
- Grep for source writes that bypass execution preview.
- Grep for fake success returns in executor adapter.

## Done When

The user can create a valid SRJ, run dry-run, inspect changed-file preview, confirm apply, and see updated authoritative source content.
Unsupported mutations are shown as skipped or warnings, not hidden.
