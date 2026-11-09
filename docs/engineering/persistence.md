# Persistence and translation

- Repositories own queries and record mapping; the domain owns eligibility and
  meaning. Keep query cost and ordering visible instead of hiding arbitrary SQL.
- Map DB nullability and generated rows to actual domain contracts. Use explicit
  encode/decode pairs for transforms that must round-trip; avoid mirrored types.
- Define not-found in the established contract, separately from unavailable
  storage and malformed records.
- One use-case boundary owns multi-record atomicity. Preserve transaction handles,
  conditional updates, conflict detection, statement order and audit atomicity.
- Scope reads, joins, writes and cache keys. A UI filter does not establish
  isolation. Recheck mutable permission/revision facts at the commit boundary.
- Applied migrations are history. Change schema forward with a registered
  migration, old-row compatibility and a stated recovery/rollback strategy.
  Backfill before enforcing a new required value.
- Update backup/import/export and consumers when their durable contract changes.
  A composed view or cache must not become a competing authority.
- Keep ORM/native details at adapters; no particular storage engine is mandated.
  Actual transaction guarantees need actual database verification.
