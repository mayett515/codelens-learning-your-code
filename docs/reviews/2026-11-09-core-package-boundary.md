# Proposed Kordex Core package boundary

2026-11-09, inspected at `75f608d`. **Awaiting owner approval; no files moved.**
This implements steps 1/2 of decision preparation, not extraction. The latest
owner instruction supersedes app M1c and mobile-driver repair. See the
[module and test inventory](2026-11-09-core-module-inventory.md) and
[current roadmap](../progress/2026-11-09-core-roadmap.md).

## Recommended cut: one package, explicit delivery boundaries

Create `packages/kordex-core`, package name `@kordex/core`. Preserve the existing
profile/branch/proposal vocabulary during extraction; it is implementation
material, not an approved universal rule model. No React, Expo, learning-feature,
app database, ORM, model-provider, app alias, or app-relative type import.

Public entry `src/index.ts` explicitly exports domain types, deterministic
operations, validators and port types. It does not initialize storage, register
templates or choose coding. Avoid wildcard forwarding of the current app barrel.
Use optional `@kordex/core/profiles/coding` and `/profiles/photography` exports for
the existing seed data; neither is imported by the main entry or implicitly active.
Ports belong to the core; implementations and command-line/MCP delivery do not.

Pure apply helpers calculate candidate results; exporting them does not confer
acceptance authority. Only the later guarded, transactional use case may persist
an accepted change. Keep that distinction explicit in the public API documentation.

### Exact source disposition

Paths below are relative to `codelens-rn/src/features/ontology/`.

| Move or retain | Modules / responsibility |
| --- | --- |
| Move unchanged, imports adjusted | `types`, `baseProfileVersioning`, `contextAssembly`, `contextSelector`, `corrections`, `metadata`, `profileActivation`, `profileBranchStore`, `profileBranches`, `profileComposition`, `profileProposalFreshness`, `profileProposalTargetSwitch`, `profileRegistry`, `profileSelection`, `profileSelectionDraft`, `runtimeProfileCoordinator`, `scopedMeaning`, `userFitProjection` |
| Move after a separate structural validator split | `baseProfileProposalApply`, `branchLocalProposalApply`, `checkerPromptBuilder`, `checkerProposalMapper` |
| Move domain parsing/schema portions only | Seven `codecs/*` modules: branch, selection, definition, change proposal, proposal event, trust setting, correction evidence. Keep their Drizzle row conversion/types in the app; app codecs call core validation rather than copying schemas. |
| Move as optional seed data | `profiles/codingProfile`, `profiles/photographyProfile`; preserve data byte-for-byte apart from import paths. |
| Retain in app | Existing `index.ts` becomes compatibility facade; it keeps coding-default helpers. `runtimeProfileActivation.ts` retains project-specific store orchestration and its coding fallback, consuming core contracts. All `data/`, `hooks/`, `ui/` implementations remain. |

Thus 22 top-level modules, validation portions of seven codecs and two optional
profiles are sourced into the package. This is not a wholesale copy of the feature.
The 18 dependency-free modules can move first; validator separation precedes
moving the four validated algorithms. No behavior or domain type redesign in
either structural slice. The existing `ProfileBranchStore` remains a read port;
it is not promoted into a generic database API.

**Dependency decision included in this proposal:** retain the existing locked Zod
version as the core's sole runtime library. It is portable validation already
used by these algorithms, not a new validation framework. Give the package its
own lockfile and build/test dependencies; no app install is needed. Alternative:
move only the 18 dependency-free modules and defer validated apply. That is a
smaller first commit but postpones the mechanism needed for the product proof.
Rewriting Zod validation by hand would be a behavior-risking redesign, so it is
not the proposed extraction. No dependency is installed or upgraded now.

The strict decision-import checker remains unchanged. It reports external Zod
imports today and must not be described as passing those modules. Existing
dependency-free decision leaves retain that strict check. In the extraction
slice, enforce package isolation over **both runtime and type imports**, with an
explicit declared dependency boundary and negative fixtures for an app import.
Do not relabel validation-dependent code as pure just to bypass a check.

## Storage and atomic execution ports

The core owns explicit storage contracts for current domain records, not Drizzle
rows or `DbOrTx`. Conceptual shape (names/types to implement after approval):

```text
ReadStore: load base, branch, proposal, evidence and accepted history by scope/id
AtomicStore.runAtomically(work): work receives a transaction-scoped store
TransactionStore: same reads plus conditional revision writes and append audit
Execution inputs: explicit time, new IDs, actor and source context
```

`runAtomically` awaits the complete callback and commit. Any failure rolls back
all writes; shared-connection outsiders cannot join. Revision checks read current
state within that same transaction. No global repository fallback, leaked handle,
network/model work in the transaction or generic `any` CRUD port. An adapter
must reject unsupported nested execution explicitly unless it proves savepoints.
Storage errors must preserve the difference between missing, stale and unavailable.

Port-driven use cases come after structural extraction, as separately reviewed
work. Reuse the existing service's decisions, not its default app imports. In
particular, preserve branch proposal-snapshot validation through
`evaluateProfileProposalFreshness` at the transactional boundary. The pure branch
apply helper alone lacks that guard. The current app service remains as-is;
its mobile rollback defect is recorded, not repaired by extracting an algorithm.

Rule records are not silently mapped to learning captures or ontology nodes.
Before the lifecycle slice, settle the smallest rule contract for its concrete
scenario: evidence, scope, expected revision, accepted decision and replacement
lineage. Parent/child A1/B1/C1 remain interview input, not extraction work.

## How the app keeps its current behavior

- Old imports continue through thin compatibility re-exports and retained app
  row codecs/default helpers. There is one implementation of each moved decision.
- App code may import the core; core runtime, types, tests and build config may
  not import the app. Storage defaults, mobile UI and the driver are untouched.
- Keep existing assertions. Split portable validation tests from row-mapping,
  learning-type and presentation assertions. App assertions remain in the app.
  Move source-guard targets to actual owners; do not test a forwarding stub.
- Baseline is the existing 1139-test suite and compiler, with four known lint
  errors. No new app failures. Passing it still does not prove mobile rollback.
- Prove isolation by packing/copying the core into a clean temporary directory,
  installing only its lockfile dependencies there, then compiling and running its
  tests with no app checkout, aliases, node_modules or mocks of app/native modules.
  Do not delete the user's app installation to simulate this.
- Move core leaves with their real owners, update discovery roots and generated
  inventory, and test new root discovery. No owner binding before extraction.

## Local adapter and product proof after extraction

Recommend one desktop SQLite adapter outside core, initially using the available
Node SQLite engine. No mobile driver, ORM migration or dependency upgrade is
required by that choice. Final persisted rule shape still needs the rule-model
decision; do not design it during the move. Test failure after every write,
reopen and assert target/proposal/audit unchanged. Test concurrent unrelated
writes and stale acceptance. Pure tests cannot substitute for those checks.

The CLI then proves one complete experience-to-rule lifecycle, including source
and scope checks, restart, traceable replacement and stale rejection. Only after
that does a read-only MCP adapter expose accepted knowledge with its sources.
MCP cannot apply proposals or become a second canonical store.

## Approval requested

Approve this package cut, retaining Zod and optional profile exports, with app
compatibility facades and app row mapping outside core? The alternative is the
18-module dependency-free first cut with validated apply deferred. No source
move, dependency adoption, port implementation or schema change occurs before
the owner's decision and optional Fable review.
