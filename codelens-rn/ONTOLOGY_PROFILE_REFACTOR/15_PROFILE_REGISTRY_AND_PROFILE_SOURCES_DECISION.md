# Profile Registry And Profile Sources Decision

**Status:** Decision brief on 2026-05-08. Duplicate-id behavior locked on 2026-05-09. V1 static source helper implemented on 2026-05-09.
**Branch:** `refactor/ontology-profile`

## Decision Direction

Base profiles should resolve through a source-based `ProfileRegistry`.

In plain terms:

```text
ProfileSelection
  says: use baseProfileId = photography

ProfileRegistry
  resolves: photography -> DomainProfile

ProfileBranchStore
  resolves: branch ids -> ProfileBranch values

ProfileSelectionResolver
  combines resolved base profile + resolved branch values

Runtime Profile Coordinator
  composes the runtime DomainProfile
```

`ProfileRegistry` is separate from `ProfileBranchStore`.

That separation is not controversial:

```text
Profiles are the bases.
Branches build on profiles.
They are not the same thing.
```

## Core Idea

Build the plug shape now, but only plug in one simple source first.

```text
ProfileRegistry = the front desk
ProfileSource = where profiles actually come from
```

Future profile sources may include:

```text
BuiltInProfileSource
  profiles shipped with Kortex:
  coding, photography, music, game-design

FileProfileSource
  profiles loaded from local .json / .kortex files

DbProfileSource
  user-created profiles stored in the app database

AdapterProfileSource
  profiles provided by plugins, MCP, remote repos, or other adapters
```

The rest of Kortex should not care where the profile came from.

It should only ask:

```text
registry.getProfile(id)
registry.listProfiles()
```

## Recommended Interface Shape

The exact TypeScript names may change during implementation, but the boundary should look like this:

```ts
export interface DomainProfileSummary {
  id: string;
  version: number;
  label: string;
  description: string;
}

export interface ProfileSource {
  id: string;
  getProfile(id: string): DomainProfile | null;
  listProfiles(): readonly DomainProfileSummary[];
}

export interface ProfileRegistry {
  getProfile(id: string): DomainProfile;
  listProfiles(): readonly DomainProfileSummary[];
}
```

Implementation helper shape:

```ts
createStaticProfileSource(profiles)
createProfileRegistry({ sources })
```

Example v1 use:

```ts
const registry = createProfileRegistry({
  sources: [
    createStaticProfileSource([codingProfile, photographyProfile]),
  ],
});

const profile = registry.getProfile('photography');
```

Later, the same registry API can support more sources:

```ts
const registry = createProfileRegistry({
  sources: [
    builtInProfiles,
    userDbProfiles,
    localFileProfiles,
    communityAdapterProfiles,
  ],
});
```

The rest of Kortex still says:

```text
registry.getProfile('photography')
```

It does not care whether `photography` came from built-in code, a file, DB, or an adapter.

## Independent Base Profile Clarification

`ProfileRegistry` resolves base profiles. A base profile can be a built-in profile, an imported
profile, or a user-created profile.

A user-created base profile is not automatically a branch of `coding`.

Example:

```text
photography base profile
  uses Kortex schema/mechanics
  owns photography tags/subtags/families
  owns photography fields and relationship types
  does not inherit coding tags unless the user explicitly chooses a fork/cross-domain relation
```

Then branches can specialize that base:

```text
photography base profile
  -> night-photography branch
  -> studio-lighting branch
  -> personal-fuji-workflow branch
```

This preserves both ideas:

- **Independent bases:** `coding`, `photography`, `work-notes`, or `lisp` can be sibling base
  profiles built from the shared Kortex schema/engine.
- **Branches/overlays:** `react`, `typescript`, `night-photography`, or `company-onboarding` can
  specialize one selected parent/base profile and later propose selected changes upward.

Future creation UI may use an LLM to ask questions for either path. For a new base profile, it
should ask broad domain-setup questions and suggest tags, subtags, families, fields, relationships,
examples, and "is not" boundaries. For a branch, it should ask what differs from the parent and
suggest local overlay changes. The user can accept, edit, reject, or manually create the ontology
parts.

## V1 Meaning

`v1` means the first version implemented now.

It does not mean final forever.

For this boundary:

```text
Final direction:
  built-in profiles
  user-created profiles
  imported profiles
  shared/open-source profiles
  file-backed profiles
  DB-backed profiles
  adapter/plugin-provided profiles

v1 implementation:
  source-based registry interface
  static/in-memory profile source only
```

So v1 should allow:

```text
createStaticProfileSource([codingProfile])
createProfileRegistry({ sources: [staticSource] })
registry.getProfile('coding')
registry.listProfiles()
```

And v1 should not implement:

```text
DB profile table
file watching
file import/export
plugin adapters
remote profile marketplace
profile editor UI
MCP profile source
agent-created profile source
```

## Constraints

The key constraint:

```text
ProfileRegistry must depend on a ProfileSource interface,
not on one concrete storage system.
```

Do not hardcode registry lookup to built-in code only:

```ts
// Rejected
getProfile(id) {
  return codingProfile;
}
```

Do not hardcode registry lookup to DB only:

```ts
// Rejected
getProfile(id) {
  return db.profiles.find(id);
}
```

Instead:

```ts
// Preferred
createProfileRegistry({
  sources: [
    createStaticProfileSource([codingProfile]),
  ],
});
```

Then the registry can later accept:

```text
createFileProfileSource(...)
createDbProfileSource(...)
createAdapterProfileSource(...)
```

without changing callers.

## Allowed In The First Implementation

The first implementation may add:

- `DomainProfileSummary`
- `ProfileSource`
- `ProfileRegistry`
- `createStaticProfileSource`
- `createProfileRegistry`
- tests for lookup/list behavior
- tests for unknown id errors
- tests for duplicate id behavior
- tests for source precedence/order
- tests proving no mutation
- tests proving no DB/UI/global state/source adapter implementation

## Not Allowed In The First Implementation

Do not add:

- DB reads
- DB schema or migration
- file reads
- file watcher
- plugin adapter
- remote adapter
- profile marketplace
- profile editor UI
- MCP profile source
- agent-created profile source
- profile import/export
- profile persistence
- branch persistence
- branch composition changes
- active selection changes
- runtime coordinator changes
- service changes
- multi-base composition
- automatic merge or promotion

## Duplicate Profile Id Behavior

If multiple sources contain the same profile id, the implementation must define deterministic behavior.

Locked v1 behavior:

```text
Any duplicate profile id across all sources throws a structured duplicate-id error.
```

This includes:

```text
duplicate ids inside one source
duplicate ids across multiple sources
```

The error should preserve enough context for future UI/import flows:

```ts
DuplicateProfileIdError {
  code: 'DUPLICATE_PROFILE_ID';
  profileId: string;
  sourceIds: readonly string[];
}
```

Reason:

- simpler
- safer
- avoids surprising shadowing
- avoids "why is my imported profile not loading?"
- source precedence can be added later when there is a real need

Important product boundary:

```text
Registry detects the conflict.
Registry does not ask the user.
Future UI/import/profile-manager flow catches the error and asks:
  create new version / rename / replace / merge later / cancel
```

Rejected v1 behavior:

```text
Earlier source wins silently.
Later source wins silently.
Registry creates a new version automatically.
Registry renames automatically.
Registry asks the user directly.
```

## Relationship To Existing Decisions

- **Doc 10:** Services receive composed `DomainProfile`, not activation input.
- **Doc 11:** Runtime Profile Coordinator composes above services.
- **Doc 13:** Branch layers are durable sources; composed runtime profiles are derived.
- **Doc 14:** `ProfileSelection` stores `baseProfileId` and branch ids. Resolver turns ids into values.

This decision fills the missing base-profile side:

```text
baseProfileId
  -> ProfileRegistry
  -> DomainProfile
```

The branch side remains separate:

```text
branchIds
  -> ProfileBranchStore
  -> ProfileBranch values
```

Then:

```text
DomainProfile + ProfileBranch values
  -> Runtime Profile Coordinator
  -> composed runtime DomainProfile
```

## Photography Example

Future target:

```text
ProfileRegistry:
  coding
  photography
  music-theory

ProfileSelection:
  baseProfileId: photography
  learningBranchIds: [night-photography]
  personalBranchIds: [my-fuji-workflow]

Branch store:
  night-photography -> ProfileBranch
  my-fuji-workflow -> ProfileBranch

Runtime:
  photography base
  + night photography branch
  + personal Fuji workflow branch
  -> composed runtime DomainProfile
```

This is why the registry must not be coding-specific.

## Next Implementation Slice

A small Pi slice can implement the static source/registry helper and tests.

The slice should include:

```text
DomainProfileSummary
ProfileSource
ProfileRegistry
DuplicateProfileIdError
createStaticProfileSource
createProfileRegistry
```

It should not include DB, files, adapters, UI, MCP, agents, app-builder runtime, DSL runtime, branch persistence, branch composition changes, active selection changes, service changes, or automatic profile versioning.

## Current Implementation

The first domain-only ProfileRegistry/ProfileSource v1 slice is now implemented and tested:

```text
src/features/ontology/types.ts
  - DomainProfileSummary
  - ProfileSource<TItemTypeNodeId>
  - ProfileRegistry<TItemTypeNodeId>

src/features/ontology/profileRegistry.ts
  - DuplicateProfileIdError
  - ProfileNotFoundError
  - toDomainProfileSummary(profile)
  - createStaticProfileSource({ id, profiles })
  - createProfileRegistry({ sources })

src/features/ontology/__tests__/profileRegistry.test.ts
  - 26 focused tests

src/features/ontology/index.ts
  - exports registry types and helpers
```

Current behavior:

- Static source lookup returns matching profiles by reference.
- Static source unknown id returns `null`.
- Registry lookup returns matching profiles by reference.
- Registry unknown id throws `ProfileNotFoundError`.
- Duplicate profile ids inside one static source throw `DuplicateProfileIdError`.
- Duplicate profile ids across sources throw `DuplicateProfileIdError`.
- `DuplicateProfileIdError` includes `code`, `profileId`, and copied `sourceIds`.
- `ProfileNotFoundError` includes `code` and `profileId`.
- `listProfiles()` returns profile summaries, not full profiles.
- Registry/source list results preserve source/profile order.
- Inputs are not mutated, and caller-side array mutation after construction does not change the created source/registry.

Verification after implementation:

```text
TypeScript clean.
targeted profileRegistry/profileSelection/profileBranches tests: 67/67 passed across 3 files.
full suite: 528/528 passed across 57 files.
forbidden state/persistence/runtime term checks: clean for profileRegistry source/test.
non-ASCII check: clean for profileRegistry source/test and doc 15.
git diff --check: clean with CRLF warnings only.
```

Still not implemented:

- No DB, migration, storage API, or profile persistence
- No file source, file watcher, import/export, or adapter source
- No profile editor UI or profile manager flow
- No global active registry
- No MCP, agent runtime, app-builder runtime, or DSL runtime
- No branch persistence, branch composition changes, active selection changes, service changes, multi-base composition, automatic merge, automatic promotion, automatic versioning, rename, or replace flow

## Model Recommendation

Decision/review:

```text
Codex / GPT-5
```

TypeScript helper worker after the duplicate-id decision:

```text
opencode-go/qwen3.6-plus with --thinking high
```

Guard/docs worker if needed:

```text
opencode-go/glm-5.1 with --thinking high
```
