# Proposal Event Audit Storage Decision

**Status:** Locked and implemented on 2026-05-13.
**Branch:** `refactor/ontology-profile`

## Locked Decision

Proposal review/apply decisions are stored as append-only event facts.

```text
proposal row = current proposal state
proposal event = what decision happened, when, by whom, and against what target
```

This is the durable audit seam for future user-fit learning. User-fit confidence is not calculated in this slice; later code can project acceptance/rejection/postpone/ask-why patterns from these events.

`profile_proposal_events` intentionally does not use DB foreign keys to proposal or branch rows. These rows are durable audit facts and may outlive the proposal or branch they describe; future readers should treat orphaned event references as accepted history, not corruption.

## Implemented Storage

Implemented table:

```text
profile_proposal_events
```

Each event records:

- proposal id
- action: `applied`, `rejected`, `postponed`, or `asked_why`
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
- edit-then-apply
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

## Next Work

Good next bounded choices:

1. Query/read UI for proposal event history on the review surface.
2. User-fit projection over proposal events.
3. Context-pack assembly for checker/proposal review.
4. Base-profile versioning before any base/core apply target can mutate a parent profile.
