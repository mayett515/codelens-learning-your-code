# Second Base Profile Forkability Demo Decision

**Status:** Locked decision on 2026-06-12. Initial forkability proof, profile-scoped learning capture/save/precheck/list/retrieval boundaries, Learning Hub/chat retrieval consumers, graph consumers, and promotion consumers implemented on 2026-07-03. No forced Doc 43 follow-up remains.
**Branch:** `refactor/ontology-profile`

## Source Map

This decision does not reopen profile, branch, proposal, checker, or apply architecture. It turns the existing forkability direction into a small proof slice.

- **Doc 07:** Kordex cores can have independent child cores and domain-specific relationship/meaning layers.
- **Doc 14:** profile selection is single-base in v1 and must work for coding, photography, music, game design, or another domain through the same id-based selection seam.
- **Doc 15:** profile registry resolves base profiles by id and should not care whether a profile came from built-in code, DB, file, or adapter.
- **Doc 17:** user-created base profiles persist as separate profile definitions; a new domain such as photography is not a branch of coding.
- **Doc 26:** scoped meaning allows the same label shape to mean different things in a base profile versus a branch.
- **Doc 39 / 40 / 41 / 42:** proposal review, freshness, checker, selection, and the first target-switch path are already implemented against profile ids and should not assume `coding`.

## Locked Decision

Add a minimal second-base-profile forkability demo, using a photography profile.

The demo exists to prove that Kordex's implemented spine is profile-generic:

```text
profile registry
project selection
branch creation
checker targeting
proposal review/edit/freshness/apply
target switching
base/core versioning
```

It is not a new product vertical, a polished profile gallery, or a rewrite of the coding product.

## Why Photography

Use photography, not math, for the first forkability demo.

Reasons:

- Existing docs already use photography and night-photography examples, so the demo makes documented examples real.
- Photography vocabulary is genuinely unlike coding vocabulary, which makes it better at finding coding-shaped assumptions.
- Math overlaps coding too easily: concepts, prerequisites, proofs, and abstractions can accidentally fit the coding ontology shape.
- Photography forces different labels, metadata fields, review copy, boundaries, and branch names.

## Coupling-Audit Criterion

The demo succeeds when the only intended additions are:

- the minimal photography profile fixture/source;
- tests that exercise the existing spine against that second base profile;
- logged coupling findings and small fixes for any discovered coding-specific assumptions.

Every required production-code change outside the profile fixture should be treated as a discovered coupling. The implementation should either fix it inside the slice or record it in this doc as a deferred coupling finding.

Before implementation, grep non-test `src/` for hardcoded `coding` and classify each hit as:

- sanctioned default fallback, such as `DEFAULT_RUNTIME_PROFILE_BASE_PROFILE_ID`;
- test/dev fixture only;
- coupling to fix;
- coupling to log and defer.

## Delivery Mechanism

Use a split proof:

1. Define a deterministic minimal photography `DomainProfile` fixture/source in code.
2. In tests, round-trip the same profile through `profile_definitions` / `loadDefaultProfileRegistry` where practical.

This keeps test setup deterministic while proving that doc 17's persisted base-profile seam can carry a full second base profile.

Do not add seeding UI, import UI, profile gallery, onboarding, or a shipping decision for photography in this slice.

## Minimal Proof Set

The first proof should exercise only the implemented spine:

- registry lists both `coding` and `photography`;
- project selection can choose `photography`;
- an empty branch can be created under `photography`;
- runtime composition uses `photography + selected branch`, not coding;
- checker can run against the photography branch with seeded photography correction evidence;
- checker-created branch-local proposals review/edit/freshness/apply through the existing proposal surface;
- one eligible branch-local proposal can target-switch to the photography core;
- base/core Apply uses the photography profile version guard, not the coding profile version.

Optional deterministic prompt proof:

- checker or Conceptualize prompt payloads render photography ontology nodes without coding labels.

Do not require a live model run for the demo.

## Known Coupling Points To Check

Check these by name during implementation:

- `DEFAULT_RUNTIME_PROFILE_BASE_PROFILE_ID` and `getActiveDomainProfile()` are sanctioned coding fallbacks, but explicit photography selection must override them.
- Save/extraction paths must accept a caller-supplied composed `DomainProfile`; they must not silently call the coding default when project context is available.
- `DomainProfile` authoring weight is itself part of the audit. If a minimal photography profile requires copying coding-specific labels or configs, record that as a future profile-defaults finding.
- Cross-base `typeNodeId` collisions are part of the audit. Photography may legitimately use ids that coding also uses, such as `composition`; concept lists, graph queries, retrieval filters, and promotion clustering must not silently treat bare node ids as globally unique across unrelated base profiles.
- Legacy `learning`, `concept`, and AI queue names are compatibility names in this slice. Do not rename storage or queue lanes.
- User-fit, checker, freshness, edit, refresh, target-switch, and apply services should remain keyed by `baseProfileId`.

## Non-Goals

This slice must not add:

- profile gallery, profile onboarding, or polished second-profile UX;
- a product decision that photography ships to users;
- cross-base composition;
- cross-base evidence, cross-base proposals, or cross-base checker output;
- new DB schema or migrations;
- new operation vocabulary;
- relationship/boundary/split/merge/rename/deprecate/move proposals;
- temporary/provisional tag or relationship maturity lifecycle;
- branch merge, upward promotion, fork UX, import UX, or source-sync adapters;
- base/core checker targeting. Doc 41 remains unchanged; the demo's base-apply proof goes through user target-switch, not the checker;
- auto-apply, trust mutation, scheduler/background checker modes, checker-run tables, DSL/runtime agents, app-builder runtime, MCP write-back, or graph/vector retrieval.

## First Implementation Shape

1. Add the photography profile fixture/source.
   - Keep it small but real: labels, ontology nodes, item types, metadata fields, graph/review labels, and promotion config should be photography-specific.
   - Avoid copy-pasted coding labels except where the shared `DomainProfile` contract currently forces generic fields.

2. Add registry and persistence proof tests.
   - Built-in/static profile source lists `coding` and `photography`.
   - Persisted profile definition round-trip preserves photography identity, labels, ontology, item types, and version.
   - Backup export/import preserves the photography profile definition alongside coding.

3. Add selection/branch/runtime proof tests.
   - Save a project selection with `baseProfileId = photography`.
   - Create a branch under photography.
   - Compose/select photography with that branch without falling back to coding.

4. Add proposal-spine proof tests.
   - Seed photography correction evidence.
   - Run deterministic checker mapping/runtime with a photography branch target.
   - Review/edit/freshness/apply a branch-local photography proposal.
   - Target-switch an eligible branch-local photography proposal to the photography core.
   - Apply the base/core replacement against the photography profile definition version.

5. Fix or log discovered coding couplings.
   - Small generic fixes may land in this slice.
   - Larger scope expansions should be recorded as deferred findings, not hidden in the demo.

## Required Tests And Guards

Tests should prove:

- no production checker/proposal path requires `baseProfileId === 'coding'`;
- explicit photography project selection overrides the default coding fallback;
- photography branches cannot attach to coding accidentally;
- checker/proposal evidence ids and active selection snapshots use `photography`;
- a photography capture typed with a colliding id such as `composition` does not appear under coding's unrelated `composition` filter, or the collision is logged as a coupling finding;
- branch-target photography proposals snapshot `targetBranchUpdatedAt`;
- base-target photography proposals snapshot `targetProfileVersion`;
- target-switch produces `target.profileId = 'photography'`;
- applying the photography base proposal increments the photography definition version only.

Architecture guards:

- Doc 43 anchors remain present.
- The demo must not introduce cross-base, merge, maturity, auto-apply, scheduler, graph/vector retrieval, DSL, app-builder, MCP write-back, or source-sync implementation strings outside docs/tests.
- Any hardcoded `coding` additions in non-test source must be classified as sanctioned fallback or fixed.

## Implementation Update - Initial Forkability Proof

The first implementation slice added a real built-in `photography` `DomainProfile` and kept `coding` as the strong default.

Implemented proof points:

- built-in registry lists `coding` and `photography`;
- the photography profile is recognizably photography-shaped, including labels, ontology nodes, metadata fields, graph labels, review labels, extraction instructions, and a deliberate `composition` type id;
- profile-definition codec and backup row mapping preserve the photography profile payload;
- project selection can compose `photography` plus a photography branch without falling back to coding;
- seeded manual checker runtime creates branch-local photography proposals with `targetBranchUpdatedAt`;
- one photography proposal applies branch-locally;
- one eligible photography proposal target-switches to `target.profileId = 'photography'`;
- base/core Apply increments the photography profile definition version only.

Resolved coupling finding:

- Cross-base `typeNodeId` collision filtering is now explicit at the learning capture, concept-list, save-precheck, and retrieval filter boundaries. `LearningCapture`, `LearningConcept`, `RetrievedCapturePayload`, and `RetrievedConceptPayload` carry `profileId`; `SaveModalCandidateData` carries the active profile id through save; `prepareSaveCandidates` drops pre-check concept matches from other profiles before prompt/linking; `useConceptList` and `RetrieveFilters` expose preferred `profileIds` plus single-profile `profileId` aliases; matching now requires profile scope and type-node filters to agree. This keeps overlapping node ids such as `composition` valid in unrelated bases without requiring global node-id uniqueness.
- Target switching now rejects a branch whose `parentProfileId` does not match the proposal `baseProfileId` before creating a base replacement.

Resolved consumer follow-ups:

- Learning Hub and chat retrieval callers now thread project/profile selection into profile-shaped query and retrieval inputs.
- Graph queries and promotion clustering now use explicit profile-scoped filters where they read, render, or group profile-shaped data.
- Session flashbacks remain session-scoped rather than profile-scoped; they can show the contents of the selected session and do not create cross-profile mutations.

## Implementation Update - Profile-Scoped Learning Filters

The follow-up implementation slice resolved the Doc 43 collision finding without changing the profile architecture:

- legacy rows still default to `profileId = 'coding'`;
- new and read-back `LearningCapture` and `LearningConcept` values carry `profileId`;
- `SaveModalCandidateData` and Conceptualize save paths preserve the active context profile instead of falling back to `coding`;
- pre-check concept matches are filtered to the active profile before extractor prompt construction or linked-concept persistence;
- concept-list filters can scope by `profileIds` / `profileId` and type ids together;
- retrieval payloads carry `profileId` for both captures and concepts;
- retrieval filters can scope by `profileIds` / `profileId` before type-node filtering;
- `coding/composition` and `photography/composition` are allowed to coexist as separate meanings;
- Learning Hub, chat retrieval callers, graph queries, and promotion clustering were intentionally left for later profile-scoped consumer slices, and those slices are now implemented.

## Implementation Update - Profile-Scoped Consumer Completion

The next implementation slice closed the deferred Doc 43 consumers without opening a new architecture gate:

- Learning Hub resolves the active project selection, scopes capture/concept/health/promotion/review queries by the active base profile, and routes graph links with `profileId`;
- chat retrieval callers pass the concept profile into dot-connector retrieval/send injection so same-id type filters remain profile-scoped;
- graph full/ego queries accept profile scope, default ego scope to the focal concept's profile, reject explicit mismatches, and render graph labels/colors from the selected profile;
- promotion clustering groups eligible captures by profile before similarity clustering, and promotion review/promote/link paths reject or skip cross-profile capture/concept mixing;
- review threshold and review-session surfaces render labels/chips against the relevant profile instead of the default coding profile;
- shared type-chip/card components accept an explicit `DomainProfile` while keeping the coding default fallback for older call sites;
- focused guards now pin profile-scoped consumer behavior for Hub, cards, graph, promotion, retrieval, and checker/proposal architecture boundaries.

Future media-analysis note:

- A real photography core will eventually need image/EXIF/edit/caption analysis. That future adapter belongs behind the bounded worker harness in `ARCHITECTURE.md` and `05_ANTI_REGRESSION_RULES.md`: it can produce validated observations for evidence/context/proposals, but it must not classify captures, mint tags, or mutate ontology/profile state directly.

## Acceptance Criteria

- The repo has a minimal second base profile that is recognizably photography-shaped.
- The existing profile registry, selection, branch, checker, proposal, target-switch, and base apply seams work with photography.
- Any coding-specific coupling discovered by the demo is either fixed or recorded in this document.
- The coding profile remains the strong default and is not weakened into a generic demo.
- No new major architecture gate is opened by accident.
