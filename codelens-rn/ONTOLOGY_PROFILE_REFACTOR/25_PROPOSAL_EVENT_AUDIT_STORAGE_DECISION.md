# Proposal Event Audit Storage Decision

**Status:** Locked and implemented on 2026-05-13.
**Branch:** `refactor/ontology-profile`

## Locked Decision

Proposal review/apply decisions are stored as append-only event facts.

```text
proposal row = current proposal state
proposal event = what decision happened, when, by whom, and against what target
```

This is the durable audit seam for future user-fit learning and proposal lifecycle history. User-fit confidence is not calculated in this slice; later code can project acceptance/rejection/postpone/ask-why patterns from these events while keeping superseding as audit history.

`profile_proposal_events` intentionally does not use DB foreign keys to proposal or branch rows. These rows are durable audit facts and may outlive the proposal or branch they describe; future readers should treat orphaned event references as accepted history, not corruption.

## Implemented Storage

Implemented table:

```text
profile_proposal_events
```

Each event records:

- proposal id
- action: `applied`, `rejected`, `postponed`, `asked_why`, or `superseded`
- actor kind/id
- base profile id
- proposal kind
- target profile or target branch
- status before/after
- proposal timestamp before/after
- optional branch timestamp before/after
- optional reason
- optional details JSON
- event creation time

The table is intentionally not a projection table. It does not store a learned user-fit score, trust-mode decision, runtime profile, composed profile, undo job, or auto-apply queue entry.

## Service Wiring

The existing branch-local apply service now writes an `applied` event inside the same transaction that:

```text
updates the branch overlay
marks the proposal accepted/applied
```

Reject and Postpone now write `rejected` / `postponed` events inside the same transaction that marks the proposal reviewed.

Ask why now writes an `asked_why` event when the review surface opens the proposal reason. It does not change proposal status, branch state, base/core state, or evidence; status before/after both remain `pending`.

Superseding now writes a `superseded` event inside the same transaction that marks the old pending proposal superseded and links it to the replacement proposal.

If the guarded write fails because the proposal or branch changed, no event is appended.

## Why Events Instead Of More Columns

Proposal status tells the current state:

```text
pending / accepted / rejected / postponed / superseded
```

Events tell the history:

```text
the user rejected this kind of suggestion three times
the user accepted low-risk branch-local relationship patches
the user keeps asking why for a certain family of suggestions
```

That history is what future adaptive behavior needs. Packing it into proposal rows would lose sequence, actor, reasons, and repeated interactions.

## Boundaries

This slice does not implement:

- user-fit projection/scoring
- checker runtime
- auto-apply engine
- full edit-then-apply UI
- historical undo execution
- base/core profile mutation
- upward merge
- old-card backfill
- notification timeline UI
- graph/context-pack assembly
- agent/app-builder/DSL runtime

## Relationship To Existing Decisions

- **Doc 21:** audit events are part of the shared checker/proposal/context/apply architecture.
- **Doc 23:** trust settings remain user policy; user-fit learning is derived later from events, not stored in the trust setting row.
- **Doc 24:** branch-local apply/reject/postpone now has durable event facts while preserving explicit user review and atomic writes.

## Implemented Files

```text
src/db/migrations/019-profile-proposal-events.ts
src/db/schema.ts
src/features/ontology/types.ts
src/features/ontology/codecs/profileProposalEvent.ts
src/features/ontology/data/profileProposalEventRepo.ts
src/features/ontology/data/branchLocalProposalApplyService.ts
src/features/ontology/data/profileChangeProposalReviewService.ts
src/features/ontology/data/profileChangeProposalLifecycleService.ts
src/features/backup/format.ts
src/features/backup/export.ts
src/features/backup/import.ts
src/features/backup/clear.ts
src/features/backup/columnMaps.ts
```

## Verification

Focused verification:

```powershell
node node_modules\typescript\bin\tsc -p tsconfig.json --noEmit
npm.cmd test -- --run src/db/migrations/__tests__/profile-proposal-events-migration.test.ts src/features/ontology/__tests__/profileProposalEventCodec.test.ts src/features/ontology/__tests__/branchLocalProposalApplyService.test.ts src/features/ontology/__tests__/profileChangeProposalReviewService.test.ts src/features/backup/__tests__/profile-columns.test.ts src/__tests__/stage10-architecture-guards.test.ts
```

Result: TypeScript clean; focused proposal-event/apply/review/backup/guard tests 145/145 passed across 6 files; full suite 764/764 passed across 82 files; `git diff --check` clean with CRLF warnings only.

## Implementation Update - Superseding Events

Superseding support is now implemented as an audit-preserving lifecycle transition:

- migration 023 rebuilds `profile_proposal_events` so `action = 'superseded'` is valid
- backup `SCHEMA_VERSION` is now 23
- `ProfileProposalEventAction` and its codec accept `superseded`
- `supersedePendingProfileChangeProposal(input)` marks an old pending proposal as `superseded`, sets `supersededByProposalId`, and appends a `superseded` event in one transaction
- the replacement proposal must already exist, still be pending, and belong to the same base profile
- superseded events remain audit history and are not treated as positive/negative user-fit preference

## Implementation Update - Ask Why Events

Ask why support is now wired to the same event table without changing proposal state:

- `recordPendingProfileChangeProposalAskedWhy(input)` appends an `asked_why` event for a pending proposal
- the event preserves `pending -> pending` status and keeps proposal timestamps unchanged
- `useAskWhyProfileChangeProposal()` calls the service from the review surface when the reason is opened
- `ProfileProposalReviewScreen` de-duplicates repeated opens for the same proposal during one screen session
- `asked_why` events can inform future user-fit/review analytics, but they are neutral and do not become positive/negative preference by themselves

Latest verification after superseding and Ask why event wiring:

```powershell
node node_modules\typescript\bin\tsc -p tsconfig.json --noEmit
npm.cmd test -- --run src/db/migrations/__tests__/profile-proposal-events-migration.test.ts src/db/migrations/__tests__/profile-proposal-event-superseded-action-migration.test.ts src/features/ontology/__tests__/profileProposalEventCodec.test.ts src/features/ontology/__tests__/profileChangeProposalLifecycleService.test.ts src/features/ontology/__tests__/profileChangeProposalReviewService.test.ts src/features/ontology/__tests__/profileChangeProposalCodec.test.ts src/features/ontology/__tests__/userFitProjection.test.ts src/features/backup/__tests__/profile-columns.test.ts src/__tests__/stage10-architecture-guards.test.ts
npm.cmd test -- --run src/features/ontology/__tests__/profileChangeProposalReviewService.test.ts src/features/ontology/__tests__/profileProposalEventCodec.test.ts src/features/ontology/__tests__/userFitProjection.test.ts src/features/ontology/__tests__/profileProposalReviewPresentation.test.ts src/__tests__/stage10-architecture-guards.test.ts
npm.cmd test -- --run
```

Result: TypeScript clean; focused proposal lifecycle/event/backup/guard tests 185/185 passed across 9 files; focused Ask-why/review/projection/guard tests 107/107 passed across 5 files; full suite 948/948 passed across 100 files.

## Next Work

Good next bounded choices:

1. Wire edit flows to create the replacement proposal and call the superseding service.
2. Add stale refresh/rebase behavior before checker proposal volume grows.
3. Query/read UI for proposal event history on the review surface.
