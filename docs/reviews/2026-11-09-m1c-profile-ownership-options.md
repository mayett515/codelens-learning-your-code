# M1c: ownership of editable built-in profiles

Later owner direction: these decisions remain core-semantic input, but mobile
implementation and driver repair are stopped. Follow the
[core roadmap](../progress/2026-11-09-core-roadmap.md); the historical stop/repair
sequence below is superseded.

Options inspected 2026-11-09 at `d020028`. Subsequently the user selected
**materialize on first use** (option 2 in this sheet). Fable changed position
and now recommends the same as Astra. The accepted contract, including the
subsequently approved explicit legacy adoption, is owned by
[Doc 44](../ONTOLOGY_PROFILE_REFACTOR/44_BUILT_IN_BASE_MATERIALIZATION_DECISION.md).
The comparisons below retain their decision-preparation context. A-C remain
separate from M1c in the
[design note](2026-11-09-parent-child-semantics-design.md).

## Responsibility and observed state

M1c must give each base ID one authoritative definition across bootstrap,
approved apply and reload. The `profile-registry-bootstrap` and
`base-proposal-apply` leaves remain `partial`. This document changes no owner,
runtime behavior, durable format, leaf state or inspection date.

- [Default bootstrap](../../codelens-rn/src/features/ontology/data/profileRegistryBootstrap.ts)
  combines bundled coding/photography and stored definitions. The
  [registry](../../codelens-rn/src/features/ontology/profileRegistry.ts) rejects
  duplicate IDs; source ordering is not a precedence mechanism today.
- [Base apply](../../codelens-rn/src/features/ontology/data/baseProfileProposalApplyService.ts)
  requires an existing stored definition. It owns the transaction joining target,
  conditional proposal transition and event. The
  [repository](../../codelens-rn/src/features/ontology/data/profileDefinitionRepo.ts)
  has insert and conditional-update operations, but bootstrap does not materialize
  the built-ins. An unconditional upsert would not be a safe ownership solution.
- The [apply hook](../../codelens-rn/src/features/ontology/hooks/useApplyProfileChangeProposal.ts),
  selection hooks, proposal edit/refresh services and learning profile-context
  resolver consume these boundaries. Fixing only an injected registry leaves the
  default application path unresolved.
- [Coding](../../codelens-rn/src/features/ontology/profiles/codingProfile.ts) and
  [photography](../../codelens-rn/src/features/ontology/profiles/photographyProfile.ts)
  both declare `version: 1`. The inspected
  [version guard](../../codelens-rn/src/features/ontology/baseProfileVersioning.ts)
  compares numbers, not bundled content. An app release **can** change the code
  data without incrementing that number; the inspected boundary would miss it.
  This is not evidence that every release, or a particular past release, did so.

[Doc 06](../ONTOLOGY_PROFILE_REFACTOR/06_PROFILE_BRANCHING_AND_MERGE.md)
defines a base as immutable by default, evolved through approved patches. A
software update is not automatically approval to change an existing lineage.
All options must distinguish a shipped template from a user's accepted state.

## Three ownership options

### 1. Materialize on first approved base apply (not selected; Fable's former preference)

Until that point the registry reads the bundled template. At first apply, one
transaction validates the exact proposal basis, creates the stored definition,
applies the patch, changes proposal status and writes the event. Afterwards the
stored definition owns the same base ID; bundled updates cannot overwrite it.

Base apply remains usable for coding/photography. This closely fits Doc 06 after
materialization and avoids storing untouched bases. Bootstrap must explicitly
exclude the corresponding template, preserving duplicate errors for unrelated
sources. An existing definition must never be overwritten by initialization.

Release gap: before materialization, a changed bundle can change the effective
parent. Numeric version equality is insufficient. A durable content basis for
pending proposals and existing lineage use, or a pinned/recoverable template
revision, is needed to detect/block this transition. A1's copied parent node
detects node-local drift, but not changes elsewhere in the base read by apply.
Saving the original template only at first apply cannot reconstruct an earlier
release. These costs must be included; this is not merely an insert-if-missing fix.

### 2. Materialize on first use (selected; now recommended by Astra and Fable)

Initialize the selected built-in as an exact stored snapshot once, before
creating proposals, branches or other dependent accepted work. Initialization
does not edit its meaning. Thereafter this stored definition is the only runtime
authority for that base ID, including after restart and application upgrades.
Later changes, including useful changes shipped in a newer template, require an
approved patch. An update-offer UI is not required to keep the old state stable.

Base apply stays usable. This is the clearest fit for Doc 06: accepting use of a
base establishes the lineage; its first edit is not a second ownership boundary.
Initialization must be idempotent and safe under concurrent callers, and registry
loading now has a deliberate persistence prerequisite. The cost is one full
definition for each used built-in even when the user never edits it.

Release handling: changed bundled content no longer becomes current accepted
content, even with the same version number. Comparing the supplied template to
stored content can reveal a difference; after user edits that comparison alone
does not identify which changes came from the vendor. An exact original template
snapshot is needed if later three-way vendor updates/provenance are required.
That retained origin and its storage/backup representation must be specified in
a separate durable-shape slice; the live definition is not its own history.
A1 complements this: it detects which overridden nodes depend on an older
accepted parent after an approved base edit, not after an unrelated app release.

Existing installations are not fresh initialization: a missing definition with
existing branches/proposals does not prove the current bundle is their original
parent. Preserve unknown provenance and block unverified dependent apply until
explicit review/replacement; do not stamp old proposals fresh during bootstrap.
Inventory these cases before implementing a backfill. The old node content cannot
be recovered from a numeric version alone. A1 legacy policy remains an M4 choice.

### 3. Keep shipped bases immutable; use branches or a new base identity

Reject base apply for built-in IDs intentionally. Users customize a branch or
create a distinct stored base. New-base creation is a separate flow, not a rename
of existing scoped references. The registry keeps ordinary duplicate rejection.

This narrows Doc 06's approved-evolution behavior for shipped bases: base apply
continues only for user-owned stored bases. It avoids editable-template ownership,
but does not itself solve release drift. Existing lineages still need pinned
template content/revisions or an explicit release-change gate; a fixed ID plus
`version: 1` is not immutability. A1 detects copied-node changes only, and cannot
replace that base policy. Do not mark the current editing gap solved without
explicitly adopting this product restriction and updating callers/documentation.

## Recommendation and boundaries

The user selected **2** for durable accepted meaning across applications. Fable
withdrew the earlier preference for **1** because it leaves existing captures
exposed before the first edit unless another release guard is added. The decision
does not authorize A1/B1/C2, new inheritance levels or a generic rule interpreter.

Preserving the shipped origin forever is distinct from storing the current
accepted base and from A1's per-override basis. Decide/record its durable contract
before introducing a field or claiming three-way release updates work. Existing
[definition types](../../codelens-rn/src/features/ontology/types.ts) and
[codec](../../codelens-rn/src/features/ontology/codecs/profileDefinition.ts) store
the current profile, source kind and timestamps, not a separate origin history.

## Smallest implementation/proof plan after the choice

The editable-base path below applies to options 1/2. For option 3, replace its
built-in apply cases with explicit rejection and test approved apply on a
distinct user-owned base; default same-ID duplicates must remain errors.

1. Record the selected contract in the owning decision document. Separate any
   schema/backup migration from behavior work. Keep generic registry duplicate
   rejection; implement only the explicit built-in/local ownership rule at
   bootstrap. First red fixture: stored built-in plus default source currently
   throws; chosen behavior must return exactly the authoritative definition.
2. Add the chosen initialization/apply boundary with its own failing tests:
   missing definition, existing local edits, stale/missing proposal basis,
   simultaneous initialization and duplicate unrelated source. Test both bases.
   Include a changed bundled node with the **same numeric version** across reload;
   assert the chosen protection, not merely successful lookup.
3. Exercise default bootstrap -> approved base apply -> fresh registry/reload
   against real persistence. Inject failure after a target write and after proposal
   transition: target, proposal and audit must roll back together. Test creation
   races against actual uniqueness/transaction semantics. Node callback doubles
   cannot establish this. Confirm a suitable database harness before coding;
   report a missing harness and stop under the work order if unavailable.
4. Verify backup round-trip of the stored authority and any new basis/origin data.
   Existing [export](../../codelens-rn/src/features/backup/export.ts) includes
   profile definitions/branches; [import](../../codelens-rn/src/features/backup/import.ts)
   maps and restores those rows. This source inspection does not prove new fields
   survive, old clients reject unsupported formats, or restore is fully atomic.
5. Update both leaves only to the level demonstrated; regenerate the map, run
   tooling gate and affected/full app checks against the baseline. Native UI,
   A1 rebase and B1 collision enforcement remain separate proof scopes.

## Decision recorded; persistence blocker

First-use ownership and explicit legacy adoption with permanently unknown earlier
origin are decided in Doc 44. No further answer on those choices is needed.
The required real-database preflight then reproduced an
[existing rollback failure](2026-11-09-base-apply-rollback-finding.md).
Stop for its separate repair before materialization runtime work. The M4
parent/child recommendations remain separate from these accepted M1c decisions.
