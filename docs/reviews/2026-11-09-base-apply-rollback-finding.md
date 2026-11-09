# Base apply commits before asynchronous work finishes

**Later owner direction, 2026-11-09:** keep this finding open; do not repair the
mobile driver. No fix was begun. The new [core roadmap](../progress/2026-11-09-core-roadmap.md)
proves atomicity in an independent desktop adapter instead. The proposed repair
below records the earlier response to the defect, not an active work order.

Reproduced 2026-11-09 on application revision `97a5c76`, before any M1c runtime
change. This is an existing persistence defect, not a materialization regression.

The installed `drizzle-orm/op-sqlite` session calls the transaction callback and
issues COMMIT without awaiting its result. Its savepoint path has the same
structure. The application passes async callbacks, including the
[base apply owner](../../codelens-rn/src/features/ontology/data/baseProfileProposalApplyService.ts).
No patch for Drizzle is present in the existing patch-package directory.

Run from `codelens-rn`: `node scripts/diagnose-profile-rollback.cjs`.
The [diagnostic](../../codelens-rn/scripts/diagnose-profile-rollback.cjs) uses the
installed Drizzle op-sqlite driver, actual service/repositories/codecs and actual
profile-table migration SQL over a temporary file-backed `node:sqlite` database.
Only the native client transport is substituted; transaction handling is not
mocked. The diagnostic cleans up its temporary database and returns **exit 1**
when the rollback assertion fails. It is not part of the default Vitest gate.

Observed:

| Case | Result |
| --- | --- |
| Successful apply control | Version 1 -> 2, proposal accepted, one audit event |
| Injected error at audit insertion | Error returned, but after reopening: version 2, proposal accepted, zero events |
| SQL order during failed attempt | BEGIN, COMMIT, SELECT, SELECT, UPDATE, UPDATE; no ROLLBACK |
| Required rollback state | Version 1, proposal pending, zero events |

The decisive failing assertion compares the reopened state to that required
state. This is real SQLite execution and durability evidence through the actual
base service, not a callback test double. It does not run the native application,
all migrations/FTS/vector initialization, or prove native scheduling behavior.
The adapter delegates queries to Node SQLite while preserving the installed
driver's async interface and transaction implementation.

This contradicts invariant 5's all-or-nothing apply requirement. The earlier
1139 passing app tests and tooling gate did not establish rollback; their mocks
could not detect this. The base-apply leaf was already partial, but its gap must
now name this observed failure explicitly. Other async transaction users may
share the defect; they have not all been exercised.

## Stop and proposed next slice

The milestone work order requires a stop for a contradiction with an invariant.
Do not build materialization/adoption on this transaction boundary. Request a
separate boundary-repair slice before continuing M1c. A fix must await BEGIN,
callback, COMMIT and rollback correctly; account for nested transactions and
shared-connection concurrency rather than merely adding `await` in the service.
Keep one transaction owner and do not route unrelated writes into an open
transaction accidentally. Whether the bounded repair belongs in the installed
driver patch or a controlled application adapter requires inspecting all callers.

Before calling the repair complete: convert this reproduction into a regression,
show the existing red result becomes green, inject failures after each write,
test queued/concurrent operations and rollback-error handling, then run the
existing suite/compiler and observed remote CI. No dependency upgrade or global
transaction rewrite is authorized implicitly by finding the defect.
