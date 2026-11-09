# Project Naming Kordex Decision

**Status:** Locked docs-only decision on 2026-05-15. Not implemented as a repo-wide rename.
**Branch:** `refactor/ontology-profile`

## Decision

The public/core working name should move from **Kortex** to **Kordex**.

Kortex remains acceptable as legacy wording in existing docs until a deliberate cleanup pass. New strategic docs should prefer Kordex unless they are quoting older material or describing migration history.

## Why

Plain `Kortex` and `Cortex` are already crowded names in AI, memory, note-taking, medical AI, robotics, and agent/knowledge tooling.

`Kordex` keeps the useful sound and shape:

```text
Kordex
  cord / graph connections
  codex / knowledge book
  index / retrievable structure
  cortex-like cognition signal
```

It is short, pronounceable, catchy, and close enough to the current working name that existing architecture language still maps cleanly.

## Naming Shape

Use:

```text
Kordex Core
Kordex Profiles
Kordex Branches
Kordex Graph
Kordex Context
Kordex Intent
Kordex Agent
Kordex App Builder
Kordex DSL
```

Do not turn every code identifier into a branded identifier.

Prefer implementation names that remain generic and stable:

```text
DomainProfile
ProfileBranch
ProfilePatch
ProfileChangeProposal
OntologyNode
ContextAssembly
RuntimeProfileActivation
```

Avoid new public/code names like:

```text
KortexProfile
KortexBranch
KortexPatch
KortexOperation
```

If a branded identifier is needed later, use `Kordex`, not `Kortex`.

## Scope Of This Decision

This decision locks the naming direction. It does not perform a repo-wide rename.

No source code is changed by this decision.

No DB tables, migrations, persisted action names, package names, app ids, or APIs are renamed by this decision.

## Rename Strategy

Short term:

- Keep current implementation names generic.
- Prefer Kordex in new docs.
- Do not introduce new Kortex-named code identifiers.
- Leave existing doc filenames with `KORTEX` until a dedicated cleanup pass.

Later cleanup pass:

- Rename public-facing docs and explainer copy.
- Decide whether doc filenames should be renamed or left as historical artifacts.
- Update README language and marketing copy.
- Update public repo/package/domain/app naming only when launch direction is clearer.

## Compatibility Rule

Do not create persistence migrations only to rename branding.

If any persisted strings ever contain the old name, treat them as compatibility data unless there is a concrete product reason to migrate them.

## Relationship To Existing Decisions

All previous Kortex architecture decisions remain valid. The rename changes the product/core name, not the architecture:

- profiles and branches still model scoped ontology meaning
- evidence remains factual
- proposals remain reviewable
- context assembly stays provenance-aware
- CodeLens remains the first serious coding child/wrapper around the core

In future docs, read old `Kortex Core` references as `Kordex Core` unless the old name itself is being discussed.
