# One accepted-state basis for rule history and parent references

2026-11-09. The owner accepted R1–R4 and required R3 and A1 to share one
representation. This is the conceptual contract before K2, not a SQL schema or
implemented storage API. The owning semantics remain in
[product and invariants](../agents/product-and-invariants.md).

## Identity, content and provenance

A scoped accepted-state reference identifies an immutable revision of one base
or branch. It answers **which accepted state held when**, independently of wall
clock timestamps. Each new acceptance refers to its previous accepted state in
that scope. Acceptance order belongs to this history; source inspection dates
and scheduled reconsideration dates are separate facts.

A node version is addressed by that accepted-state reference plus node ID.
R3 rule lineage is derived from the scope's accepted history; do not create a
second authoritative rule-version store. Truly different meanings retain
separate scoped identities rather than being disguised as wording revisions.

A stored base definition or branch overlay remains the canonical content. A
historical branch state also records the parent accepted-state basis needed to
reconstruct its meaning. Composition is derived from those pinned inputs, not
from today's parent. A view involving several selected branches additionally
needs their ordered accepted-state references; a branch revision alone cannot
identify an arbitrary multi-branch view.

The parent basis has two honest cases: a known accepted-state reference, or
unknown legacy basis. Unknown never means the current version and cannot be
upgraded by a later unrelated edit. The earlier-origin fact persists even when
an explicit review establishes a new known basis. This covers both first-use
legacy adoption and old whole-node overrides without a second unknown-origin
representation.

Evidence and accepting proposal/audit references explain why a state was
accepted. They do not replace retained content with a mutable URL or an audit
log that cannot reconstruct that state. The history representation must retain
or reconstruct the inspected parent content, not just detect a changed number.

## Future write boundary and proof

The future transaction owner must append accepted content/history, conditionally
advance the current reference, transition the proposal and write the audit
atomically. It checks the proposal's expected target and all parent/read bases
used by that decision. A missing or stale basis cannot authorize acceptance.

K7 comparison reads two retained accepted states. Rollback creates a new reviewed
acceptance pointing back to the desired content; it does not erase intervening
history, rewind revision numbers or revive stale proposals. Such an operation
is planned, not enabled by this note.

K2 must choose the smallest storage representation capable of proving reopen,
failure after every write, and concurrent-write isolation. Full immutable
snapshots and reconstructable deltas are storage options; no schema or new
dependency is approved by this design note. The first implementation should
prefer simplicity, with performance changes requiring demonstrated need.

## Explicit limits

Existing app versions/timestamps and proposal events are not silently migrated
into verified accepted-state history. R1–R4 data fields and source validation
are still to implement. This principle does not settle the parent-following UI,
collision policy, scoped relationships, inheritance chains or automated rebase.
No mobile driver repair, app migration or backup change belongs to this work.
