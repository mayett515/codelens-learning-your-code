# K2 storage choice — prepared, not implemented

2026-11-09. K1b establishes a semantic-only profile and preserves the learning
extension. R1–R4 are accepted, and R3/A1 share the
[accepted-state basis](2026-11-09-accepted-state-basis.md). The work order requires
an owner decision before a new storage schema. This note prepares that choice;
it does not reopen the rule/profile, first-use or unknown-origin decisions.

## Recommended: SQLite with immutable accepted-state snapshots

Use one desktop SQLite file through the installed Node `node:sqlite` API behind
core-owned storage/atomic-execution ports. No third-party runtime dependency or
mobile driver. Local availability was checked on Node v24.19.0 with an in-memory
query reporting SQLite 3.53.3; this is availability evidence, not rollback proof.

Each accepted base or branch revision retains a complete immutable snapshot of
its canonical definition or overlay. Its identity includes scope and revision;
previous accepted state and known/unknown parent basis use the same history
representation. A small current-head record selects the current accepted state.
There is no independent authoritative rule-version table and no persisted
composed view. History costs more disk space than deltas, but reconstruction and
failure diagnosis need no replay interpreter. This is the recommended first
implementation for a small local proof, not a storage-size claim.

The initial persisted responsibilities are:

| Record | Purpose |
| --- | --- |
| Accepted state | Immutable canonical payload, scoped revision, predecessor and parent basis |
| Current scope head | Conditional pointer to the accepted state currently in force |
| Proposal | Existing pending/review lifecycle and explicit expected target basis |
| Audit event | The lifecycle action and its proposal/accepted-state references |

The concrete codecs, key constraints and transaction contract are written before
the adapter. They must reuse the existing freshness/lifecycle decisions and
preserve unknown historical origin. A timestamp alone is not a revision identity.
R1–R4 data extensions and source evidence are separately reviewable steps;
these four storage responsibilities alone do not establish the K3 rule scenario.

One adapter owns the connection and serialization queue. A transaction receives
an explicit scoped handle; callers cannot access the raw connection or keep
using a closed handle. All operations on that connection queue behind an open
transaction, so unrelated writes cannot join it. The boundary awaits the full
operation and commit/rollback. Nested transactions are not introduced without a
concrete caller; unsupported nesting must fail explicitly rather than deadlock.

Required proof: inject failure after each accepted-state/head/proposal/audit
write, close and reopen the file, and assert that all records remain at the
previous state. Also demonstrate successful reopen, stale rejection, concurrent
unrelated writes and interruption-safe first-use materialization. No app adoption
UI or native installation. No transaction claim from mocks.

## Alternative: SQLite with immutable change records

Persist each accepted patch and reconstruct earlier state by replay from a
retained seed/checkpoint. This can reduce repeated payloads but requires durable
patch semantics, replay compatibility and checkpoint correctness before history
can be trusted. R3 and A1 still use one history and the same atomicity tests.
There is no demonstrated size constraint yet that justifies those extra duties.

The owner choice is therefore **full accepted-state snapshots first**, or
**change records plus reconstruction now**. The recommendation is snapshots.
After approval, K2 proceeds in bounded contract/adapter/proof slices, with no
new dependency, automatic acceptance or unreviewed deletion implied.
