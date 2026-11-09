# Capability leaf contract

The executable source of shape is [LeafSchema](../../tools/leaf-schema.ts).
A `.leaf.md` starts with strict YAML front matter and may continue with purpose,
responsibility boundaries and explanations. This is a capability inventory,
adapted from SEO's queue lanes; no queue or dispatch registry is assumed.

```yaml
schemaVersion: 1
id: example-capability
domain: meaning
summary: A short, scoped responsibility
inspectedOn: "2026-11-09"
state: implemented
owners:
  - path: path/to/owner.ts
    symbol: exportedOwner
    role: decision
evidence:
  - path: path/to/owner.test.ts
    kind: unit
    covers: The particular observable behavior addressed
gaps: []
reason: ""
revisit: ""
```

The example is illustrative, not a real source binding. The checker parses YAML
with duplicate keys/aliases rejected, then validates against the single Zod schema.
Unknown fields and traversal/absolute paths in source/evidence references fail.

## State and placement

| State | Author claim | Required shape |
| --- | --- | --- |
| implemented | Stated responsibility exists, with no declared functional gap | Owners, behavioral evidence reference, empty gaps/reason/revisit |
| partial | An existing implementation has a concrete functional gap | Owners, nonempty gaps/reason/revisit |
| planned | A future capability is intended but has no owner binding here | No owners, design-only evidence, nonempty gaps/reason/revisit |
| deferred | Deliberately postponed, with a reason to reconsider | Same structural requirements as planned |

Existing capability leaves sit beside their first owner as `owner.leaf.md`.
Additional exported owners may be listed when they participate in that capability;
the same `(path, symbol)` cannot be claimed by two leaves. Future leaves live in
`docs/capabilities/planned/`, not beside fictitious implementation files.

`owners.role` is decision, orchestration, translation, infrastructure or presentation.
The role describes responsibility, not a folder rename. Evidence kind is unit,
integration, scenario or design. `covers` states the intended scope of that evidence.

## What the checker establishes

- Schema consistency, unique IDs/owner bindings, parent existence and colocation.
- Owner files exist inside the repository under their exact on-disk spelling and
  explicitly export a locally defined runtime value, checked through the TypeScript
  syntax tree. Types, interfaces, ambient declarations and export-from declarations
  cannot satisfy an owner binding. Local value aliases are supported, including
  variables initialized from an import. The guard does not trace value provenance:
  a forwarding variable can pass, so review must still locate the business owner.
  Cite the responsible module rather than a barrel. This checks value declarations,
  not callability or meaning; decision import restrictions still apply.
- Evidence paths are files inside the repository with exact on-disk casing.
  Owner/evidence/parent references use canonical paths, not symlink aliases.
  The checker does not execute the cited
  tests, validate their adequacy or infer that a declared status is correct.
- For `decision` owners, follow relative runtime imports/re-exports transitively.
  Type-only imports are ignored. Imports into data/db/ai/adapters/ui/hooks/stores/
  state directories, external/alias runtime imports and dynamic import/require
  fail. This conservative dependency rule applies only to the opted-in decision
  modules. It does not detect direct global effects such as `Date.now`, arbitrary
  IO hidden under a different name, or all possible runtime module loaders.
- The generated map matches the capability table derived from discovered leaves.
  Adding/removing an unrelated source file does not make the map stale.

## Inspection date and Git freshness

Every leaf has `inspectedOn`, a real `YYYY-MM-DD` date in UTC, including planned
leaves. It dates inspection of the stated responsibility/gaps and owner bindings,
not a test run or independent verification. Set it after reading the relevant
source and claim; generation never updates this date for you. Future dates fail.

For every bound owner, the gate reads the most recent touching commit's committer
timestamp from Git history and converts it to a UTC day. If that day is later
than `inspectedOn`, `LEAF_INSPECTION_STALE` fails the gate. Reinspect the capability
and update its claim/date together. A same-day change is not ordered by a date:
this deliberately small check cannot detect changes after an inspection on the
same UTC day. Updating owner and leaf together on the same day is supported.
Git's default path-history simplification follows a parent whose owner content
matches the merge result. An unchanged merge therefore keeps the actual change
date; a merge result differing from every parent still requires inspection.

Staged, unstaged or untracked owners emit `OWNER_WORKTREE_UNVERIFIED` warnings;
their current content is not certified by committed history. This does not block
ordinary pre-commit work. Inspect those changes explicitly. Missing Git or shallow
history fails rather than pretending the dates were checked; CI fetches full
history. No owner bindings means no owner-history comparison for planned leaves.

Dates are author claims and Git timestamps are not attestations. Rebases,
cherry-picks or clock skew may cause extra review or misleading chronology. A
merge changing the owner relative to every parent also needs review. The
guard watches owner files, not changed callers, tests, imported helpers or domain
rules. None of those limits is solved by automatically advancing a date. Broader
behavioral impact remains a review/test responsibility.

No global dependency graph, runtime reachability, semantic rule coverage, complete
product inventory or successful host hook is inferred. A future leaf with no bound
owner is not a proof that no implementation exists anywhere. Missing test evidence
is a verification gap, not automatically a functional `partial` state.

Discovery roots are exported by [leaf-inventory.ts](../../tools/leaf-inventory.ts)
and printed in the generated map. `npm --prefix tools run check:leaves -- --unowned`
reports source files without bindings to the console only; many are helpers/types,
so that count is not missing-capability coverage. Tooling is not an application
capability discovery root.
Do not add a second hand-maintained runtime registry to make the documentation green.

Run `npm --prefix tools run generate` to update the map, then
`npm --prefix tools run check`. The checked-in workflow runs the same gate.
The negative fixtures in `tools/test/` demonstrate broken-state rejection.
