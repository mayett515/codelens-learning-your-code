# Built-in base materialization

Decision accepted by the user on 2026-11-09: **materialize on first use**.
Astra and Fable now recommend the same option. The user also selected explicit
adoption of today's template for legacy installations with unrecoverable origin.
This contract is not an implementation claim. Both M1c leaves stay `partial`.
The later owner direction stops all app implementation, including repair of the
[real rollback finding](../reviews/2026-11-09-base-apply-rollback-finding.md).
Keep these semantics as input to the independent core; do not implement the
mobile entrypoints, migration or backup work below. The
[core roadmap](../progress/2026-11-09-core-roadmap.md) supersedes that order.

## First use is a command, not a query

First use means starting the first user-requested operation that relies on the
profile as a durable basis: saving a profile selection, creating a branch,
preparing a capture/classification for saving, or preparing a profile proposal.
The owning application action must explicitly establish the base before deriving
that work. This does not require a separate confirmation dialog on a fresh
installation; it requires an identifiable, audited initialization command.

Listing profiles, resolving them, displaying details, opening existing records
and query-cache refetches remain write-free. Neither `loadDefaultProfileRegistry`
nor a pure resolver may initialize storage. Templates may be inspected without
becoming accepted local state. Consumers must distinguish that preview from the
stored basis required for dependent work. Missing initialization must not trigger
a fallback to bundled content at save/apply time.

The materialization service owns one transaction: insert the exact base snapshot,
its immutable template content basis and a materialization audit event. It is
insert-only, idempotent and protected by unique base identity. Repeating the
command returns the existing authority without changing content, origin, date or
audit history. Competing callers must converge on that same record. A failure
leaves none of the three writes committed. The following operation can fail or
be cancelled without erasing a successfully established base.

Use a dedicated materialization audit contract; initialization is not a fictitious
accepted proposal. Current proposal events require a proposal ID and cannot
truthfully represent this action. The exact schema/codec/migration is a separate
slice before runtime wiring; no general event framework is needed.

## One source owns the base ID

A valid materialized definition owns its ID. Default bootstrap excludes only the
matching bundled template before constructing the registry. Imported, adapter,
user-defined or otherwise unproven same-ID collisions still fail. Materialization
provenance must be validated; `sourceKind` or ID equality alone is insufficient.
A restored materialized definition with valid provenance has the same authority.
The generic registry continues rejecting every duplicate supplied to it.

Existing definitions without the new provenance are not overwritten, silently
blessed as materialized, or replaced with today's template. Report the collision
for explicit recovery. This narrowly amends [Doc 15](15_PROFILE_REGISTRY_AND_PROFILE_SOURCES_DECISION.md)
and preserves [Doc 06](06_PROFILE_BRANCHING_AND_MERGE.md): bases evolve through
approved patches; upgrading software is not permission to change accepted meaning.

## Origin, adopted content and legacy data

Keep three facts distinct:

- Current accepted definition: changes only through guarded base apply.
- Template content recorded at materialization: immutable complete validated
  snapshot with encoding version and deterministic content identity. Numeric
  profile version or a release label alone is insufficient. Retain content, not
  only a hash, so later comparisons can explain what changed.
- Earlier origin: known for fresh initialization; permanently **unknown** when
  historical usage cannot be reconstructed. This fact belongs to the definition,
  survives ordinary edits and restore, and is never upgraded by a later approval.

Before treating an installation as fresh, inspect profile-scoped captures,
concepts, branches, selections, correction evidence and proposals/history. Any
existing dependency without a recoverable template basis requires the legacy
path; do not infer freshness from a missing definition alone.

Legacy adoption is a user-visible action showing the selected current template
and the unknown historical origin. It commits the new authority, content basis
and its own adoption audit atomically. It is never a startup migration or a read
side effect. This is now authorized product behavior, not another undecided option.
Old captures, concepts, branches and their classifications are not rewritten.
Inspection remains possible; new dependent work uses the adopted state after
this explicit step. Displaying old records must not assert that the adopted
meaning was their original meaning.

Existing branch overrides keep an unknown parent basis. M1c and A1 must share
one interpretation of an absent legacy basis: unknown, never today's version.
Do not introduce a second legacy-validity flag or backfill node snapshots.
Future known node bases and rebase operations remain the separate A1 design;
base adoption is not a branch rebase.

## Pending proposals across adoption

Every pre-adoption pending proposal against this base, including its branches,
is not fresh even if its numeric base version or branch timestamp matches. Use
the existing freshness decision to combine target revision with a recorded
materialization-basis identity; missing/mismatched basis blocks Apply. Do not
use timestamp ordering to guess whether a proposal saw the adopted state.

Explicit refresh or replacement records the current materialization basis,
dry-runs the supported patch, creates a new pending proposal and supersedes the
old through the existing lifecycle. Apply remains separate. No in-place rewriting
of old proposal snapshots/statuses is needed during adoption. Refreshing a
proposal does not certify unknown parent bases of old branch overrides; dependent
operations requiring that knowledge remain blocked until their own review.
This freshness extension needs its own failing tests and durable compatibility
slice; the existing numeric guard alone does not meet the accepted contract.

## Release changes are proposals

A changed bundled template never replaces the stored base. An explicit update
check compares bundled content to the recorded template content, including when
both declare version 1. It prepares a reviewable proposal against the **current
stored base version**, with old template, new template and current local state
available for comparison. User modifications must not be silently overwritten.
The normal deterministic validation, review, version guard, conditional lifecycle
transition and audit apply. Stale candidates require refresh/replacement.

Only changes representable in the existing supported patch language may become
an executable proposal. Unsupported differences and conflicting local edits must
remain visible as unresolved review work, never be dropped while claiming a full
release update. Do not add a generic template-replacement bypass or silently
expand checker scope. Keep the initial content basis immutable and retain update
proposal provenance; duplicate update offers must be identifiable. Source-sync
scheduling, a daemon and automatic acceptance are outside M1c.

## Backup and proof

Backup/import must round-trip the definition, permanent origin fact, template
basis, materialization/adoption audit and proposal basis identities. Validate their
relationship before treating an imported definition as authority. Older backups
without these facts remain unknown; unsupported newer formats fail explicitly.
Round-tripping metadata alone is insufficient: default bootstrap after restore
must select the stored base despite a same-version changed bundled template.

Required proof after the storage boundary is repaired:

1. No-write queries; explicit fresh initialization; repeated and concurrent
   initialization; failures between each write; reopen and inspect actual SQLite.
2. Default bootstrap -> stored definition -> approved base apply -> reopen/reload,
   for coding and photography. Unrelated duplicate sources still fail.
3. A pre-adoption database containing captures, a branch/override and a pending
   proposal. Adoption preserves their content, records unknown origin, blocks old
   Apply, and permits only explicit validated replacement. Later edits and backup
   restore cannot erase the unknown historical origin.
4. Release content changes with version unchanged: stored authority stays stable,
   candidate uses the current local version, stale acceptance fails, no partial
   target/status/audit writes. Unsupported differences stay visible.
5. Real backup/persistence round-trip and injected failure after target/proposal
   writes. Do not claim native UI or op-sqlite device behavior from Node SQLite.

Schema/backup changes and behavior wiring are separate reviewable commits. Keep
the registry/bootstrap and base-apply leaves partial until the required default
path runs against real persistence; add native proof separately where required.
