# Base Profile Persistence And User-Created Cores Decision

**Status:** Locked decision on 2026-05-10.
**Branch:** `refactor/ontology-profile`

## Locked Decision

User-created base cores/profiles are their own persistence concept.

They are not stored as `profile_branches`.

They are not stored as composed runtime profiles.

They are not automatic children of `coding`.

In plain terms:

```text
Kortex Core mechanics
  -> coding base profile
  -> photography base profile
  -> work-notes base profile
  -> lisp base profile
```

Each base profile owns a full domain ontology. Branches then specialize one selected base:

```text
photography base profile
  -> night-photography branch
  -> studio-lighting branch
  -> personal-fuji-workflow branch

coding base profile
  -> react branch
  -> typescript branch
  -> project-codelens-rn branch
```

## Why This Exists

Docs 13-16 established these seams:

```text
ProfileRegistry
  resolves base profile ids into base profile values

ProfileBranchStore
  resolves branch ids into branch values

ProfileSelection
  chooses one base profile id and ordered branch ids

Runtime activation wiring
  loads selected values and composes the runtime DomainProfile
```

What is still missing is the durable source for user-created base profiles.

`codingProfile` currently exists in code. Later, a user should be able to create something like:

```text
photography
music-theory
work-notes
lisp
game-engine-design
```

Those profiles need storage that fits `ProfileRegistry`, not branch storage.

## Persistence Shape

The future durable table should be conceptually:

```text
profile_definitions
  id
  label
  description
  version
  profile_json
  source_kind
  created_at
  updated_at
```

Recommended source kinds:

```text
built_in
user
imported
adapter
```

Meaning:

- `id`: stable profile id, such as `photography`.
- `label`: user-facing name.
- `description`: short profile summary.
- `version`: profile version for future migrations/imports/version prompts.
- `profile_json`: the complete `DomainProfile` payload for that base profile.
- `source_kind`: where this profile came from.
- `created_at` / `updated_at`: durable timestamps.

Implementation may use camelCase TypeScript fields around snake_case DB columns, following the
existing persistence style.

## Relationship To ProfileRegistry

The persistent source should plug into the existing registry model:

```text
BuiltInProfileSource
  -> codingProfile from code

DbProfileSource
  -> user-created/imported profile definitions from DB

ProfileRegistry
  -> combines sources
  -> detects duplicate ids
  -> returns DomainProfile values
```

The rest of Kortex should still only ask:

```text
registry.getProfile(id)
registry.listProfiles()
```

No service, screen, branch store, or runtime coordinator should care whether the profile came from
built-in code, the DB, a file, or an adapter.

## Base Profile Versus Branch

Base profile:

```text
full domain ontology
full profile labels
full metadata fields
full graph defaults
source for future branches
```

Branch:

```text
overlay/diff against one parent/base profile
project, learning, or personal specialization
not a full independent domain by default
```

This means:

```text
photography
```

should be a base profile when the user wants a new domain.

But:

```text
night-photography
```

should usually be a branch of `photography`.

And:

```text
react
typescript
```

should usually be branches of `coding`, unless the user explicitly creates a new independent base
profile for one of them.

## LLM-Assisted Creation

Future creation UI may attach an LLM to help the user build a profile.

For a new base profile, it should ask broad domain setup questions:

```text
What is this domain?
What are the main families/tags?
What should captures store?
Which relationships matter?
What is often confused?
What should the system not classify as this?
What examples and counterexamples should seed the profile?
```

For a branch, it should ask parent-difference questions:

```text
What differs from the parent profile?
Which parent tags need local boundary rules?
Which new tags should stay local to this branch?
Which project/personal terms should not merge upward automatically?
```

The user can:

- accept model suggestions
- edit suggestions
- reject suggestions
- create tags, fields, and relationships manually
- mix manual work with model help

The LLM should not silently create or mutate a durable profile without user approval.

## Duplicate Ids And Versioning

Doc 15 already locks duplicate id behavior for `ProfileRegistry`: duplicate profile ids throw
structured errors.

Future profile creation/import UI can catch those errors and ask:

```text
Create new version?
Rename?
Replace?
Merge later?
Cancel?
```

This decision does not implement that UI.

## Explicit Forks Remain Possible

Independent bases are the default for new domains.

That does not remove explicit forks, cross-domain relationships, or selected upward promotion.

If a user explicitly wants:

```text
coding
  -> forked-coding-for-my-company
```

or:

```text
coding relationship -> lisp
```

that can be represented later through explicit provenance, relationships, branches, or merge
proposals.

The important rule is that such relationships must be deliberate. A new base profile should not
inherit coding ontology accidentally just because coding was implemented first.

## Rejected Alternatives

### Store User-Created Bases As Branches

Rejected.

Reason: a branch is an overlay against one parent/base profile. A new domain such as photography
should not need coding as its parent.

### Store Composed Runtime Profiles

Rejected.

Reason: runtime profiles are derived values. Persisting them as source would erase where each
change came from and would conflict with the branch/overlay decision in doc 13.

### Put Every Profile Into One Global Hardcoded Registry

Rejected.

Reason: the system needs built-in profiles, user-created profiles, imports, files, and adapter
sources without changing callers.

### Let The LLM Auto-Create Durable Profiles

Rejected.

Reason: model suggestions are useful, but durable ontology/profile changes require user approval.

## Implementation Boundary

The implementation slice for this decision must not add:

- profile creation UI
- import/export UI
- duplicate-id resolution UI
- automatic version creation
- merge proposal storage
- correction storage
- checker runtime
- MCP/adapters
- agent runtime
- app-builder runtime
- Racket/DSL runtime

## Current Implementation

The first persistence slice for this decision is now implemented.

Implemented scope:

```text
src/db/migrations/014-profile-definitions.ts
src/db/schema.ts
src/features/ontology/types.ts
src/features/ontology/codecs/profileDefinition.ts
src/features/ontology/data/profileDefinitionRepo.ts
src/features/ontology/profileRegistry.ts
src/features/backup/*
src/__tests__/stage10-architecture-guards.test.ts
```

Current behavior:

- Migration 014 creates `profile_definitions`.
- `ProfileDefinition` and `ProfileDefinitionSourceKind` live in ontology types.
- `profileDefinition.ts` validates stored `DomainProfile` payloads and definition/profile field
  matches.
- `profileDefinitionRepo.ts` provides DB insert/upsert/get/list/delete helpers behind the ontology
  data boundary.
- `createProfileDefinitionSource({ id, definitions })` creates a synchronous `ProfileSource` from
  already-loaded definitions.
- `ProfileRegistry` remains synchronous.
- Backup/export/import/clear supports `profile_definitions`.
- Stage10 guards allow `profile_definitions` only in the planned persistence boundary and tests.

Still not implemented:

- UI for creating a base profile
- LLM-assisted profile creation flow
- duplicate-id resolution UI
- automatic profile version creation
- merge proposal storage/review
- correction storage
- checker runtime
- MCP/adapters
- agent runtime
- app-builder runtime
- Racket/DSL runtime
