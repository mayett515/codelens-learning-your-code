---
name: leaf-maintenance
description: Add or update Kordex capability leaves, their business-rule parents and generated inventory after an ownership or implementation-state change. Use for capability documentation and leaf-check failures.
---

# Capability leaf maintenance

Paths below are repository-relative. Read `docs/capabilities/SCHEMA.md`, the relevant
domain parent and actual exported owner. A capability has one primary leaf beside
its primary source file; a future capability with no implementation belongs in
`docs/capabilities/planned`.

State its responsibility and actual gap. Cite exported owners and evidence that
addresses the claim. Do not convert a missing test into a functional gap or claim
test success merely because a test file exists. Classify a pure decision only if
its owning module can satisfy the declared dependency restrictions.

Record `inspectedOn` as the UTC day you actually inspected the claim and source.
The gate flags owner commits on later UTC days and warns about uncommitted owners.
Read changes before advancing a date; generation must never renew it automatically.
Same-day changes and changed callers/dependencies still need explicit review.
Owner bindings require locally defined runtime value exports and exact path casing.

Update the leaf using the authoritative `tools/leaf-schema.ts` contract. Domain
rules live in the parent, not copied into every child. Do not invent consumes/
produces/dependency edges as if they were measured runtime facts.

Run `npm --prefix tools run generate`, then `npm --prefix tools run check`.
Inspect the generated diff. A new source root requires an explicit discovery-root
update and tests. If a finding is correct, fix the owner/claim rather than weakening
the check. Report remaining behavioral evidence separately from structural checks.
