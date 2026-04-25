# Stage 10 - Codex Implementation Playbook

> Final execution playbook for building Stages 1-9 inside the React Native project without reopening product design.
> This file is not a feature spec. It is the orchestration contract for safe implementation.

---

## Workspace locations (must-read)

<workspace_locations>
- Implementation repo root (React Native): `C:\CodeLens-v2\codelens-rn`
- Locked design/specs (this folder): `C:\CodeLens-v2\comparision java vs react native`

Rules:
- All code changes happen in the RN repo root.
- This folder is specs/handoff only; do not implement from memory.
- When starting implementation, explicitly set CWD to the RN repo root, then re-read guards + the relevant stage file(s).
</workspace_locations>

---

## Required repo architecture reading

<required_repo_reading>
Before implementing anything in `C:\CodeLens-v2\codelens-rn`, read these repo docs in this order:

1. `C:\CodeLens-v2\codelens-rn\MAIN.md`
2. `C:\CodeLens-v2\codelens-rn\whatwe_agreedonthearchitecture.md`
3. `C:\CodeLens-v2\codelens-rn\whatwe_agreedonthearchitecture_humans.md`

Then read:

4. `C:\CodeLens-v2\comparision java vs react native\CODELENS_PROJECT_STATUS.md`
5. `C:\CodeLens-v2\comparision java vs react native\CODELENS_REGRESSION_GUARD.md`
6. `C:\CodeLens-v2\comparision java vs react native\CODELENS_COMPLETENESS_GUARD.md`
7. the relevant Stage file(s)

Interpretation:
- `MAIN.md` tells the agent which repo docs are canonical.
- `whatwe_agreedonthearchitecture.md` is the strict repo execution contract.
- `whatwe_agreedonthearchitecture_humans.md` is the plain-English architecture explanation.
- The comparison-folder stage specs lock product behavior and build sequencing.
</required_repo_reading>

---

## 1. Purpose

<stage_10_purpose>
Stage 10 is NOT a new product stage.

Stage 10 exists to control implementation order, file ownership, migration safety, test discipline, rollout gates, and final verification for Stages 1-9.

Its job is to help Codex build the locked system safely:
- without changing capture-first product behavior
- without inventing new product features
- without bypassing data contracts, codecs, or transaction rules
- without letting late-stage UI work mutate earlier-stage architecture

If a proposed change belongs to product design rather than execution safety, it does not belong in Stage 10.
</stage_10_purpose>

---

## 2. Non-regression contract

<non_regression_contract>
- MUST NOT change Stage 1-9 product behavior.
- MUST NOT introduce new product features.
- MUST NOT make save concept-first.
- MUST NOT auto-create, auto-link, or auto-merge concepts.
- MUST NOT render captures as graph nodes.
- MUST NOT introduce quizzes, streaks, due queues, spaced repetition, or Anki-like mechanics.
- MUST NOT update familiarity_score except through Stage 7 applyReviewRating.
- MUST NOT update last_accessed_at from graph interaction.
- MUST NOT replace React Native layout with custom canvas layout.
- MUST NOT add canvas-based UI outside Stage 9 graph.
- MUST NOT use WebView, Cytoscape, or react-native-svg for Stage 9 graph.
- MUST NOT bypass Zod codecs or branded IDs.
- MUST NOT use hardcoded TanStack query key arrays.
</non_regression_contract>

<stage_10_interpretation>
- When a spec allows rollout gating, gate exposure only. Do not invent alternate business logic.
- When a stage says "read-only", treat writes as a regression.
- When a stage says "only path", every other write path is forbidden.
- If implementation convenience conflicts with a locked decision, implementation convenience loses.
</stage_10_interpretation>

---

## 3. Implementation phases

The build proceeds in the exact order below. A later phase does not begin until the current phase passes its completion gate.

### Phase A - Architecture prep and baseline checks

**Purpose**
- Confirm that the React Native codebase is ready to receive the locked architecture.
- Establish test harnesses, migration fixtures, file ownership, and guardrail checks before feature work begins.

**Prerequisites**
- Read `C:\CodeLens-v2\codelens-rn\MAIN.md`.
- Read `C:\CodeLens-v2\codelens-rn\whatwe_agreedonthearchitecture.md`.
- Read `C:\CodeLens-v2\codelens-rn\whatwe_agreedonthearchitecture_humans.md`.
- Read `CODELENS_REGRESSION_GUARD.md`.
- Read `CODELENS_COMPLETENESS_GUARD.md`.
- Read `CODELENS_MASTER_PLAN.md`.
- Read Stages 1-9 and this playbook.

**Allowed files/modules**
- Locked spec docs in `C:\CodeLens-v2\comparision java vs react native`
- Test setup files
- Migration fixture assets
- Query key factory audit helpers
- Barrel export files needed for future feature co-location
- Existing settings/config files only if required to enforce strict TypeScript, exactOptionalPropertyTypes, or test execution

**Forbidden files/modules**
- `src/features/learning/extractor/**`
- `src/features/learning/promotion/**`
- `src/features/learning/retrieval/**`
- `src/features/learning/dot-connector/**`
- `src/features/learning/review/**`
- `src/features/personas/**`
- `src/features/bookmarks/**`
- `src/features/graph/**`
- Any route/screen file for product behavior changes

**Implementation steps**
1. Inventory current modules in `codelens-rn` that overlap with learning, chat, storage, graph, and settings.
2. Confirm `strict` TypeScript and `exactOptionalPropertyTypes` are enabled and not bypassed locally.
3. Confirm Drizzle + `@op-engineering/op-sqlite` are the persistence path for new Stage 1 work.
4. Confirm there is one feature-owned location for query key factories per module.
5. Prepare fixture databases or SQL snapshots for Stage 1 migration tests.
6. Record baseline routes/surfaces that later stages will touch: save entry point, chat composer, Learning Hub entry, concept detail entry, file viewer line actions, graph entry.
7. Add static checks or grep-backed tests for forbidden patterns that are already known: hardcoded query key arrays, extractor/persona cross-imports, card variant props, graph backend violations.

**Tests required**
- Existing typecheck passes
- Existing unit test suite passes
- Static search confirms no planned hardcoded TanStack query key arrays in new feature modules
- Static search confirms no Stage 8 prompt-composition imports inside extractor files

**Manual verification**
- App still opens and current RN project baseline behavior is unchanged
- Existing chat send path is not broken by prep work
- Current storage opens without migration side effects

**Failure modes**
- Baseline tests already failing
- Existing codebase diverges from Stage 1 architecture assumptions
- Query key discipline is already inconsistent
- Storage stack is not wired where Stage 1 expects it

**Completion gate**
- Baseline tests are green or the blockers are documented and resolved first
- Migration fixtures exist
- File ownership boundaries are clear
- No user-facing product behavior changed in Phase A

---

### Phase B - Stage 1: Data foundation

**Purpose**
- Implement the capture-first schema, branded IDs, codecs, repositories, indexes, and migration path that all later stages depend on.

**Prerequisites**
- Phase A complete
- Stage 1 spec treated as source of truth for schema, IDs, codecs, and migration rules

**Allowed files/modules**
- `src/features/learning/data/schema.ts`
- `src/features/learning/data/migrations/**`
- `src/features/learning/types/**`
- `src/features/learning/codecs/**`
- `src/features/learning/data/captureRepo.ts`
- `src/features/learning/data/conceptRepo.ts`
- `src/features/learning/data/queryKeys.ts`
- `src/features/learning/strength/computeStrength.ts`
- Stage 1 tests and migration fixtures

**Forbidden files/modules**
- Save modal UI internals
- Card components
- Learning Hub screens
- Promotion, retrieval, review, personas, bookmarks, graph
- Any route file doing direct DB reads

**Implementation steps**
1. Add branded `LearningCaptureId` and `ConceptId` backed by `nanoid(21)`.
2. Define `learning_captures` and upgraded `concepts` schema exactly as Stage 1 locks it.
3. Add JSON codecs for every JSON column and loud row mappers.
4. Implement feature-owned repositories with `DbOrTx` threading.
5. Implement query key factories only.
6. Add `computeStrength` as a shared read helper, not duplicated math.
7. Write migration for fresh install and existing-data upgrade path, including `language_syntax_legacy` preservation and deterministic backfill.
8. Add integrity verification queries and migration tests before any Stage 2 wiring begins.

**Tests required**
- Zod codec round trips
- Capture insert + recent query
- Concept insert + dedup by `normalized_key`
- Migration backfill fixture test
- Strength monotonicity test
- ID prefix tests for `lc_` and `c_`
- JSON-boundary loud-failure tests

**Manual verification**
- Fresh install creates schema cleanly
- Existing fixture DB upgrades without silent data loss
- Backfilled `language_or_runtime_json` and `surface_features_json` are populated deterministically
- Concept delete leaves capture surviving with `state = 'unresolved'`

**Failure modes**
- Silent JSON fallback
- Duplicate or malformed branded IDs
- Early drop of `language_syntax`
- FK behavior deleting or corrupting captures
- Embedding columns claiming ready/hot before real vector writes

**Completion gate**
- Stage 1 migration tests pass
- Verification queries return clean results
- No Stage 2 or UI wiring lands before schema/contracts are stable

---

### Phase C - Stage 2: Extractor and save flow

**Purpose**
- Build candidate extraction, concept pre-check, save transaction logic, multi-save behavior, and async embedding enqueue while protecting capture-first semantics.

**Prerequisites**
- Phase B complete
- Stage 1 schema, repos, codecs, and IDs merged and green

**Allowed files/modules**
- `src/features/learning/extractor/**`
- `src/features/learning/services/**`
- `src/features/learning/types/saveModal.ts`
- Save modal controller/hooks and host wiring files
- Embedding queue integration points required by Stage 2

**Forbidden files/modules**
- `src/features/learning/promotion/**`
- `src/features/learning/retrieval/**`
- `src/features/learning/review/**`
- `src/features/personas/**`
- Graph files
- Any code path that auto-creates concepts

**Implementation steps**
1. Implement extractor prompt composition exactly as Stage 2 defines it.
2. Add extractor output Zod schemas and one-retry-on-invalid-JSON logic.
3. Implement concept similarity pre-check limited to top 3 relevant concepts.
4. Map extractor output into `SaveModalCandidateData`.
5. Implement per-candidate save transaction and independent candidate save state.
6. Enforce the linking guard: strong similarity or strong extraction confidence, otherwise unresolved.
7. Enqueue embedding outside the transaction only.
8. Keep `rawSnippet` capped and immutable except for pre-save boundary adjustment.

**Tests required**
- Prompt/extractor schema acceptance/rejection tests
- Retry-on-invalid-JSON exactly once
- Capture save transaction test
- Async embedding status behavior
- Multi-save modal behavior
- Link guard threshold tests
- Unresolved save path tests
- `derivedFromCaptureId` persistence tests

**Manual verification**
- Save entry produces 1-3 candidates only
- Saving candidate A does not save or mutate B/C
- Save works when concept matching is weak
- Save works even when embedding later fails
- No "Save All" primary action appears

**Failure modes**
- Concept-first save regression
- Auto-created concepts
- Save blocked by embedding or linking
- Empty fallback capture on extractor failure
- Snippet text rewritten instead of boundary-trimmed

**Completion gate**
- Save succeeds whenever DB write succeeds
- Embedding is async and non-blocking
- Concept uncertainty resolves to unresolved capture, not concept pollution

---

### Phase D - Stage 3: Card components

**Purpose**
- Build the locked card system without collapsing candidate, compact, and full roles into shared variants.

**Prerequisites**
- Phase B complete
- Phase C contracts stable
- UI may use mocked data, but props must match Stage 1/2 types

**Allowed files/modules**
- `src/features/learning/ui/cards/**`
- `src/features/learning/ui/primitives/**`
- Card-specific tests
- Feature barrel exports needed for cards/primitives

**Forbidden files/modules**
- Learning Hub layout files
- Promotion UI
- Retrieval UI
- Graph UI
- Base-card abstractions
- Repo calls inside cards

**Implementation steps**
1. Build shared primitives: `ConceptTypeChip`, `StrengthIndicator`, `StateChip`, `SourceBreadcrumb`, `LanguageChip`.
2. Build `CandidateCaptureCard`, `CaptureCardCompact`, `CaptureCardFull`, `ConceptCardCompact`, `ConceptCardFull`, and `CaptureChip`.
3. Keep cards callback-driven only.
4. Enforce no `variant`, `density`, `mode`, `isCompact`, or `isFull` props.
5. Enforce truncation and role-specific field visibility.
6. Ensure save modal inspection opens full detail without becoming the save primary surface.

**Tests required**
- Rendering tests for all card components
- Interaction tests for `onSave`, `onInspect`, and navigation callbacks
- Regression tests for forbidden variant props
- Structural tests proving compact cards do not render full snippets
- Callback ownership tests proving cards do not call repos directly

**Manual verification**
- Candidate card truncates long content
- Compact cards scan quickly and do not expand inline
- Full views scroll correctly on mobile
- Touch targets are reachable in save modal and detail views

**Failure modes**
- Shared base card abstraction sneaks in
- Full capture UI reused as save card
- Concept compact card shows evidence snippets
- Candidate card grows into a full reading surface

**Completion gate**
- All six locked components exist
- Card roles remain distinct
- No direct data-layer calls inside UI cards

---

### Phase E - Stage 4: Learning Hub surfaces

**Purpose**
- Build the Learning Hub as navigation and awareness only, using compact components and locked ordering rules.

**Prerequisites**
- Phase D complete
- Phase B data queries stable

**Allowed files/modules**
- `src/features/learning/ui/LearningHubScreen.tsx`
- `src/features/learning/ui/RecentCapturesSection.tsx`
- `src/features/learning/ui/ConceptListSection.tsx`
- `src/features/learning/ui/SessionCardsSection.tsx`
- `src/features/learning/ui/KnowledgeHealthEntry.tsx`
- `src/features/learning/ui/KnowledgeHealthScreen.tsx`
- `src/features/learning/hooks/**` for hub queries
- Session compact component owned by Stage 4

**Forbidden files/modules**
- Promotion suggestion surface before Phase F
- Retrieval injection UI
- Review Mode UI
- Graph UI
- Full snippets or full explanations in Hub lists

**Implementation steps**
1. Build Recent Captures with locked ordering and visibility.
2. Build Concept List with weakest-first default ordering via `computeStrength`.
3. Build Session Cards as secondary metadata, not primary knowledge objects.
4. Build Knowledge Health entry and screen without quiz/streak/due language.
5. Ensure compact cards route to full views rather than inline expansion.
6. Keep route files thin and data access in hooks/services only.

**Tests required**
- Recent Captures ordering tests
- Concept List ordering tests
- Visibility and empty-state tests
- Hub navigation tests
- Route-layer no-direct-DB tests

**Manual verification**
- Recent Captures shows unresolved and linked captures
- Concept List defaults to weakest-first
- Session Cards remain secondary
- Hub never becomes a deep-reading surface

**Failure modes**
- Hub hides linked captures
- Compact lists show snippets or full prose
- Wrong timestamp field used for ordering
- Session metadata overwhelms concept/capture navigation

**Completion gate**
- Every Hub section has one job
- Ordering/grouping/visibility are explicit and working
- No Stage 5 suggestion UI lands before Stage 4 sections are correct

---

### Phase F - Stage 5: Promotion system

**Purpose**
- Implement explicit concept creation from evidence-grounded capture clusters or single-capture manual promotion, without auto-creation or auto-merge.

**Prerequisites**
- Phase E complete
- Phase B/C data correctness verified

**Allowed files/modules**
- `src/features/learning/promotion/**`
- Minimal Stage 4 Hub insertion point for Promotion Suggestions
- Concept/capture repos needed for atomic promotion transactions

**Forbidden files/modules**
- Retrieval engine files
- Review scoring code
- Graph files
- Any auto-promotion path
- Notification/banner/modal suggestion delivery outside Hub

**Implementation steps**
1. Add `promotion_suggestions_cache` and `promotion_dismissals`.
2. Implement eligible-capture loading and clustering with locked thresholds.
3. Add fingerprinting, cache write, and dismissal/reject lifecycle.
4. Build Hub suggestions surface and review screen.
5. Implement normalized-key conflict detection with explicit user choice.
6. Implement create-new and link-existing transactions.
7. Preserve capture evidence and `concept_hint_json`.
8. Enqueue concept embedding outside the transaction.

**Tests required**
- Promotion clustering thresholds
- Eligibility filters
- Fingerprint determinism
- Dismiss/reject/resurface logic
- Representative capture ordering
- Concept creation baseline score tests
- Conflict flow tests
- Preservation tests for `rawSnippet` and `concept_hint_json`
- Single-capture promotion path tests

**Manual verification**
- Suggestions appear only in Hub
- Review screen is required before concept creation
- Dismiss removes suggestion without data loss
- Conflict dialog offers rename or link-to-existing, never silent merge
- Promoted concept appears in Concept List and Hub after confirmation

**Failure modes**
- Auto-concept creation
- Cluster job includes linked or embedding-failed captures
- Promotion mutates capture content
- Promotion inflates familiarity or importance beyond locked baselines

**Completion gate**
- Concepts are created only through Promotion Review
- Cluster thresholds and dismissal rules are proven by tests
- No pressure UI or notifications exist

---

### Phase G - Stage 6: Retrieval engine

**Purpose**
- Build the read-only memory engine: FTS5 + sqlite-vec, hot/cold tiering, RRF ranking, diagnostics, token-budgeted injection formatting.

**Prerequisites**
- Phase F complete
- Stage 1 embedding status/tier semantics stable

**Allowed files/modules**
- `src/features/learning/retrieval/**`
- Retrieval migrations/triggers
- Embedder integration wrappers
- Query invalidation helpers

**Forbidden files/modules**
- Dot Connector UI
- Review Mode UI
- Persona/prompt composition files
- Graph UI
- Any code that updates familiarity or importance

**Implementation steps**
1. Add FTS5 tables and sync triggers.
2. Add `embedding_tier` and `last_accessed_at` columns with strict semantics.
3. Implement vec and FTS search over captures and concepts.
4. Implement filter handling and RRF ranking.
5. Implement diagnostics, partial-backend handling, and `RetrievalUnavailableError`.
6. Implement JIT rehydration and boot-time GC rules.
7. Implement deterministic injection formatter with token budgets and drop-not-truncate behavior.
8. Ensure retrieval never mutates content or concept structure.

**Tests required**
- FTS trigger sync tests
- FTS sanitizer tests
- Vec search hot-tier tests
- RRF and rank comparator tests
- Retrieval diagnostics tests
- Partial/unavailable backend tests
- Hot/cold GC tests
- JIT rehydration tests
- Injection determinism and budget enforcement tests
- Retrieval content immutability tests

**Manual verification**
- Query returns mixed concept/capture memories when appropriate
- Partial backend degradation is visible in diagnostics, not hidden
- Cold items still surface via FTS
- GC never deletes source rows
- `last_accessed_at` updates only through retrieval send path, not graph

**Failure modes**
- Silent zero-result on backend failure
- Retrieval blocked by embedding unavailability
- Tier drift between column and vec row presence
- Truncating snippets mid-item during injection

**Completion gate**
- Retrieval diagnostics pass
- Injection formatter is deterministic and budget-safe
- Stage 7 is blocked until Stage 6 diagnostics and ranking tests are green

---

### Phase H - Stage 7: Dot Connector and Review

**Purpose**
- Build additive chat injection UI and explicit review flows, while keeping `applyReviewRating` as the only familiarity update path after Stage 5 baselines.

**Prerequisites**
- Phase G complete
- Retrieval diagnostics green

**Allowed files/modules**
- `src/features/learning/dot-connector/**`
- `src/features/learning/review/**`
- Existing chat composer/send wiring files required for injection
- Existing settings store integration

**Forbidden files/modules**
- `src/features/learning/extractor/**`
- Personas/prompt composition files beyond the Stage 7 send integration contract
- Mini chat and bookmarks
- Graph files
- Any direct familiarity write outside `applyReviewRating`

**Implementation steps**
1. Build `DotConnectorIndicator`, preview sheet, and per-turn toggle.
2. Wire typing-time retrieval and send-time reuse/timeout rules.
3. Surface retrieval degradation visually.
4. Build weak-concept list and review session flow.
5. Implement `review_events` schema, codecs, repo, and `applyReviewRating`.
6. Wire settings for Dot Connector, review threshold, and recall-text persistence.
7. Invalidate Hub/retrieval queries after review writes.

**Tests required**
- Dot Connector injection-state tests
- Typing debounce and send-time reuse tests
- Send-time timeout fallback tests
- Partial/unavailable diagnostics UI tests
- Review delta tests
- `review_events` audit log transaction tests
- `recordRecallText` opt-in tests
- Weak concept ordering tests
- No `importance_score` mutation tests

**Manual verification**
- Typing in chat updates memory count
- Turning injection off for one turn sends verbatim
- Preview sheet removes memories for the current turn only
- Review entry from concept works
- Skip writes nothing
- Rating updates familiarity and later strength views

**Failure modes**
- Send blocked on retrieval
- Familiarity updated without audit row
- Partial diagnostics hidden
- Review UI slips into quiz or due-queue language

**Completion gate**
- Dot Connector is best-effort only
- Review Mode is the sole familiarity update path
- No flashcards, streaks, or due queues exist

---

### Phase I - Stage 8: Personas and Chat UX

**Purpose**
- Add personas, locked four-layer chat prompt composition, cancel-in-flight, selected-code preview, mini chat, and bookmarks without touching the extractor or knowledge rules.

**Prerequisites**
- Phase H complete
- Stage 7 send pipeline stable

**Allowed files/modules**
- `src/features/personas/**`
- `src/features/chat/promptComposition/**`
- `src/features/chat/mini/**`
- Chat composer/send/cancel wiring files
- `src/features/bookmarks/**`
- File viewer gutter action files

**Forbidden files/modules**
- `src/features/learning/extractor/**`
- `src/features/learning/review/**` scoring logic
- Graph files
- Any code path that changes capture or concept scores

**Implementation steps**
1. Add persona schema, seed built-ins, CRUD, and per-chat selection.
2. Implement the locked chat prompt layer order: base, persona, memories, code context.
3. Add stop-generation abort flow with the locked partial-response threshold.
4. Add selected-code preview and removable code context.
5. Build mini chat with no Dot Connector and no persona picker, capped at 5 exchanges.
6. Add bookmark schema, palette seed/update flow, and bookmark UI.
7. Keep all Stage 2 save paths unchanged when Stage 8 surfaces invoke save.

**Tests required**
- Persona built-in protection tests
- Prompt composition order tests
- Static extractor isolation tests
- Cancel/abort threshold tests
- Selected-code preview tests
- Mini chat cap tests
- Mini chat save path tests
- Bookmark palette behavior tests
- Bookmark non-Hub visibility tests

**Manual verification**
- Persona changes affect only future messages in that chat
- Stop generating preserves or discards partial text correctly
- Selected-code preview appears and clears cleanly
- Mini chat expands to full chat with history and code context
- Bookmark gutter dots render and edit cleanly
- Bookmarks do not appear in Hub sections

**Failure modes**
- Persona layer leaks into extractor
- Stop deletes prior user message
- Mini chat uses Dot Connector or persona unexpectedly
- Bookmarks become knowledge objects or affect scores

**Completion gate**
- Stage 8 changes are chat/bookmark-only enhancements
- Stage 2 extractor and Stage 7 scoring behavior remain untouched

---

### Phase J - Stage 9: Native graph rewrite

**Purpose**
- Build the read-only concept graph with Skia rendering, D3-force layout, and locked interaction/performance constraints.

**Prerequisites**
- Phase G complete for `last_accessed_at` semantics
- Stage 9 graph query/data tests pass before renderer wiring begins

**Allowed files/modules**
- `src/features/graph/**`
- Stage 3 caller-side `onViewGraph` wiring only
- Dependency additions for `@shopify/react-native-skia`, Reanimated/Gesture Handler integration already required by the app, and `d3-force`

**Forbidden files/modules**
- `learning_captures` graph-node logic
- `react-native-svg`, WebView, Cytoscape graph rendering
- Any write to `last_accessed_at`, `familiarity_score`, or `importance_score`
- Custom layout engines outside the Stage 9 graph

**Implementation steps**
1. Build graph query layer for full and ego graph data.
2. Build edge deduplication and renderable edge indexing.
3. Build visual encoding for Structure, Recency, and Strength modes.
4. Implement synchronous D3-force layout and position buffer generation.
5. Implement Skia canvas drawing, manual hit testing, pan/zoom, tooltip, and mode switch.
6. Wire full graph and ego graph entry points without changing concept detail contract.
7. Profile performance against the locked caps.

**Tests required**
- Graph query tests
- Edge builder tests
- Layout buffer/index tests
- Visual encoding tests
- Read-only graph invariants tests
- Performance tests for 300 nodes / 600 edges pan-zoom
- `last_accessed_at` non-mutation tests

**Manual verification**
- Concept detail opens ego graph correctly
- Full graph respects 300-node cap
- Mode switch is instant and does not rerun layout
- Long-press tooltip and double-tap navigation work
- Pan/zoom is smooth on target devices
- Graph never renders captures as nodes

**Failure modes**
- Graph writes to retrieval metadata
- Mode change refetches data or reruns layout
- Node positions stored in React state
- Renderer jank or frame drops

**Completion gate**
- Graph query/data tests are green before GraphCanvas/UI rollout
- Performance and read-only invariants are verified
- Graph respects concept-only, Skia-only, and no-write rules

---

### Phase K - Final integration pass

**Purpose**
- Validate end-to-end behavior across all implemented stages, tighten rollout defaults, and ensure the system behaves as one coherent capture-first product.

**Prerequisites**
- Phases A-J complete
- No unresolved red tests in any stage

**Allowed files/modules**
- Cross-stage wiring files
- Settings exposure files
- Query invalidation glue
- Final docs/handoff files
- Release/test harness files

**Forbidden files/modules**
- New product feature specs
- New schema changes not already required by Stages 1-9
- Alternate business logic behind feature flags
- Temporary bypasses of codecs, branded IDs, transactions, or performance constraints

**Implementation steps**
1. Run fresh-install and upgrade-path verification again.
2. Validate cross-stage query invalidation and screen entry points.
3. Validate feature flag defaults and fail-closed behavior.
4. Execute the end-to-end manual flow in Section 12.
5. Update project handoff docs and ensure future LLM context is aligned.
6. Remove any temporary implementation shims that violate the final contracts.

**Tests required**
- Full targeted suite from Stages 1-9
- Typecheck and lint
- Migration verification queries
- End-to-end manual acceptance checklist
- Graph performance verification

**Manual verification**
- Full save -> hub -> promotion -> retrieval -> review -> graph -> health loop works
- Disabled feature flags do not corrupt or fork data
- No hidden regressions in chat, save, or graph entry points

**Failure modes**
- Stage interactions expose stale caches or invalid states
- Flags hide UI but leave broken data writes active
- One late-stage feature regresses save or retrieval contracts

**Completion gate**
- All tests required by this playbook pass
- Final acceptance checklist is complete
- No open regression blocker remains

---

## 4. PR strategy

<pr_rules>
- No giant PR.
- No UI wiring before data contracts pass.
- No Stage 7 before Stage 6 retrieval diagnostics pass.
- No Stage 9 before graph query tests pass.
- No feature flag may create alternate behavior that violates specs.
</pr_rules>

Implementation must be split into the following Codex-safe PR chunks.

### PR-0 - Baseline guardrails

**Objective**
- Add or verify test harnesses, static guard checks, migration fixtures, and file ownership boundaries.

**Files allowed**
- Test setup
- Fixture DBs
- Static check scripts
- Docs in this comparison folder

**Files forbidden**
- Product feature modules

**Tests required**
- Existing typecheck/unit suite
- Static guard checks

**Acceptance gate**
- No behavior change
- Baseline clean enough to start Stage 1 safely

---

### PR-1 - Stage 1 schema, IDs, codecs

**Objective**
- Land schema definitions, branded IDs, codecs, row mappers, and query keys without UI wiring.

**Files allowed**
- `src/features/learning/data/**`
- `src/features/learning/types/**`
- `src/features/learning/codecs/**`
- `src/features/learning/strength/**`

**Files forbidden**
- Save modal UI
- Hub UI
- Promotion/retrieval/review/dot-connector/personas/bookmarks/graph

**Tests required**
- Codec round trips
- Repo insert/dedup tests

**Acceptance gate**
- Data contracts are stable and green before any Stage 2 UI wiring

---

### PR-2 - Stage 1 migration and backfill hardening

**Objective**
- Land migration SQL/files, deterministic `language_syntax` backfill, and verification query coverage.

**Files allowed**
- `src/features/learning/data/migrations/**`
- Migration test fixtures
- Migration diagnostics helpers

**Files forbidden**
- UI files
- Extractor files

**Tests required**
- Migration fixture upgrade tests
- Verification query assertions

**Acceptance gate**
- No silent data loss
- Existing-data upgrade path is proven before save flow changes land

---

### PR-3 - Stage 2 extractor contracts and headless save services

**Objective**
- Land extractor prompt/schema/pre-check and save services before full UI wiring.

**Files allowed**
- `src/features/learning/extractor/**`
- `src/features/learning/services/**`
- `src/features/learning/types/saveModal.ts`

**Files forbidden**
- Card components
- Promotion/retrieval/review

**Tests required**
- Extractor schema tests
- Retry tests
- Save transaction tests

**Acceptance gate**
- Save service works headlessly and respects unresolved fallback

---

### PR-4 - Stage 2 save modal wiring

**Objective**
- Wire candidate generation and individual save behavior into the RN save flow without changing Stage 3 card boundaries.

**Files allowed**
- Save modal host/controller files
- Candidate state hooks
- Stage 2 integration wiring only

**Files forbidden**
- Concept auto-create paths
- Promotion UI

**Tests required**
- Multi-save independence tests
- Embedding enqueue tests
- Manual flow verification

**Acceptance gate**
- User can save one candidate at a time
- Save remains capture-first and non-blocking

---

### PR-5 - Stage 3 cards and primitives

**Objective**
- Land the locked card/primitives layer with no route logic and no base-card abstraction.

**Files allowed**
- `src/features/learning/ui/cards/**`
- `src/features/learning/ui/primitives/**`

**Files forbidden**
- Hub screens
- Promotion UI
- Graph UI

**Tests required**
- Card render/interaction tests
- Forbidden-prop regression tests

**Acceptance gate**
- Card API surface is locked before Hub/Promotion/Review wire-up

---

### PR-6 - Stage 4 Learning Hub

**Objective**
- Build Recent Captures, Concept List, Session Cards, and Knowledge Health entry/screen using Stage 3 components and Stage 1 queries.

**Files allowed**
- Stage 4 screen/section files
- Stage 4 hooks

**Files forbidden**
- Promotion suggestions
- Review Mode
- Graph renderer

**Tests required**
- Ordering/visibility/empty-state tests

**Acceptance gate**
- Hub obeys compact-only, weakest-first, and navigation-only rules

---

### PR-7 - Stage 5 promotion backend

**Objective**
- Land clustering, cache, dismissal, conflict handling, and promotion transactions before full UI exposure.

**Files allowed**
- `src/features/learning/promotion/data/**`
- `src/features/learning/promotion/clustering/**`
- `src/features/learning/promotion/services/**`
- `src/features/learning/promotion/types/**`

**Files forbidden**
- Hub section wiring
- Review screen UI

**Tests required**
- Cluster filters
- Fingerprint/dismissal tests
- Transaction tests

**Acceptance gate**
- Promotion backend is correct before suggestion UI is visible

---

### PR-8 - Stage 5 promotion UI and Hub integration

**Objective**
- Expose Promotion Suggestions and Promotion Review only after backend thresholds are green.

**Files allowed**
- `src/features/learning/promotion/ui/**`
- Learning Hub insertion point

**Files forbidden**
- Retrieval engine
- Review scoring

**Tests required**
- Suggestion ordering and visibility tests
- Conflict dialog tests
- Single-capture promotion UI tests

**Acceptance gate**
- Concept creation still requires explicit review confirmation

---

### PR-9 - Stage 6 retrieval backend

**Objective**
- Land retrieval engine, FTS/vec integration, diagnostics, JIT rehydration, GC, and injection formatter as pure data/services.

**Files allowed**
- `src/features/learning/retrieval/**`

**Files forbidden**
- Dot Connector UI
- Review UI
- Persona UI
- Graph UI

**Tests required**
- Retrieval engine suite
- Diagnostics suite
- Injection format/budget tests

**Acceptance gate**
- Stage 6 diagnostics are green before any Stage 7 UI or chat injection wiring

---

### PR-10 - Stage 7 Dot Connector

**Objective**
- Add Dot Connector indicator, preview, per-turn toggle, and send-time injection behavior using the existing Stage 6 retrieval contract.

**Files allowed**
- `src/features/learning/dot-connector/**`
- Chat send/composer integration files required by Stage 7

**Files forbidden**
- Review Mode write logic
- Persona/prompt layer files

**Tests required**
- Indicator state tests
- Send-time reuse/timeout tests
- Partial/unavailable surfacing tests

**Acceptance gate**
- Chat still sends when retrieval degrades or times out

---

### PR-11 - Stage 7 Review Mode

**Objective**
- Add weak-concept browsing, review session, and `applyReviewRating` transaction.

**Files allowed**
- `src/features/learning/review/**`

**Files forbidden**
- Persona files
- Stage 8 chat UX files

**Tests required**
- Familiarity delta tests
- `review_events` transaction tests
- Weak concept ordering tests

**Acceptance gate**
- `applyReviewRating` is the only Stage 7 writer to familiarity

---

### PR-12 - Stage 8 personas and chat prompt composition

**Objective**
- Add personas, prompt composition, selected-code preview, and cancel flow without touching extractor logic.

**Files allowed**
- `src/features/personas/**`
- `src/features/chat/promptComposition/**`
- Chat cancel/composer files

**Files forbidden**
- `src/features/learning/extractor/**`
- Review scoring files

**Tests required**
- Static import isolation tests
- Prompt-order tests
- Cancel threshold tests

**Acceptance gate**
- Extractor isolation is proven by tests and code ownership

---

### PR-13 - Stage 8 mini chat and bookmarks

**Objective**
- Add line-level mini chat and bookmarks after core full-chat persona flow is stable.

**Files allowed**
- `src/features/chat/mini/**`
- `src/features/bookmarks/**`
- File viewer gutter action files

**Files forbidden**
- Extractor files
- Hub files except where necessary to prove bookmarks stay out

**Tests required**
- Mini chat cap tests
- Bookmark palette tests
- Bookmark non-Hub tests

**Acceptance gate**
- Mini chat remains lightweight and bookmarks remain pre-capture annotations only

---

### PR-14 - Stage 9 graph data, queries, and layout

**Objective**
- Land graph query layer, edge builder, visual encoding, and D3 layout before renderer UI.

**Files allowed**
- `src/features/graph/types.ts`
- `src/features/graph/data/**`
- `src/features/graph/engine/layout.ts`
- `src/features/graph/engine/edgeBuilder.ts`
- `src/features/graph/engine/visualEncoding.ts`
- Graph tests

**Files forbidden**
- GraphCanvas and gesture-heavy renderer wiring
- Any write path to concept metadata

**Tests required**
- `graphQueries.test.ts`
- `edgeBuilder.test.ts`
- `layout.test.ts`
- `visualEncoding.test.ts`

**Acceptance gate**
- Graph query tests pass before any GraphCanvas rollout

---

### PR-15 - Stage 9 graph renderer and final integration hardening

**Objective**
- Land Skia renderer, overlays, gestures, performance instrumentation, and final cross-stage verification.

**Files allowed**
- Remaining `src/features/graph/ui/**`
- Final cross-stage wiring files
- Final docs/handoff updates

**Files forbidden**
- New schema changes
- Alternate graph backend experiments

**Tests required**
- Graph performance verification
- Read-only invariant tests
- Final end-to-end manual checklist

**Acceptance gate**
- Graph hits performance targets
- Final acceptance checklist is complete

---

## 5. Dependency graph

<dependency_graph>
- Stage 1 blocks almost everything.
- Stage 2 depends on Stage 1.
- Stage 3 depends on Stage 1/2 type contracts but can be UI-mocked.
- Stage 4 depends on Stage 1/3.
- Stage 5 depends on Stage 1/4.
- Stage 6 depends on Stage 1/5.
- Stage 7 depends on Stage 6.
- Stage 8 depends on Stage 7 contracts for chat composition but must not modify extractor.
- Stage 9 depends on Stage 1/3/6 and not Stage 8.
- Stage 10 is execution only.
</dependency_graph>

<dependency_enforcement>
- Do not wire UI to unstable data contracts.
- Do not begin Stage 7 implementation before Retrieval diagnostics are proven.
- Do not begin Stage 9 renderer work before GraphData queries and layout tests pass.
- Do not let Stage 8 personas or prompt composition become a hidden dependency for Stage 9.
</dependency_enforcement>

---

## 6. Migration strategy

<migration_strategy>
- Always back up the pre-migration database before modifying schema.
- Never silently drop data.
- Never drop `language_syntax_legacy` until verification queries pass.
- Never infer backfill values with AI or heuristic guessing beyond the deterministic Stage 1 token-routing rules.
- Never claim migration success without Zod verification on read.
</migration_strategy>

### Backup before migration

1. Duplicate the current DB file before any Stage 1 upgrade begins.
2. Run migration against the copy in CI/fixture tests first.
3. For real devices, keep the original DB untouched until post-migration verification succeeds.

### Stage 1 table creation order

**Fresh install**
1. Create or define the upgraded `concepts` table shape first.
2. Create `learning_captures`.
3. Create indexes and constraints.
4. Add repo/codec verification tests.

**Existing data path**
1. Back up DB.
2. Create `learning_captures`.
3. Add new `concepts` columns required by Stage 1.
4. Preserve legacy `language_syntax` as `language_syntax_legacy`.
5. Run deterministic backfill into `language_or_runtime_json` and `surface_features_json`.
6. Recompute concept embeddings only after schema verification.
7. Drop deprecated fields only after verification queries pass.

### Existing data path

- Existing concept rows remain the source records.
- No capture import is silently discarded because it lacks a concept.
- If legacy rows cannot be cleanly split, keep `language_syntax_legacy` populated and mark the row for manual review.
- Existing concepts keep canonical identity through `normalized_key`; do not rename to add language suffixes.

### `language_syntax` backfill

- Use Stage 1's deterministic token routing only.
- Route language/runtime/framework/platform tokens to `language_or_runtime_json`.
- Route syntax/features/unknown tokens to `surface_features_json`.
- Versioned tokens are normalized before routing.
- If both arrays stay empty, keep `language_syntax_legacy` and flag the row.

### `nanoid(21)` ID standardization

- New `LearningCaptureId` values are `lc_` + `nanoid(21)`.
- New `ConceptId` values are `c_` + `nanoid(21)`.
- Never mix raw strings and branded IDs at domain boundaries.
- If legacy IDs exist and cannot be rewritten safely, preserve them only if they still satisfy the branded guard and do not break FK identity. Otherwise stop and plan an explicit migration.

### Zod verification

- Every JSON column must round-trip through its codec on read.
- Migration verification is not complete until upgraded rows are read through real row mappers.
- Malformed JSON must throw loudly; do not repair silently in app code.

### Rollback constraints

- Rollback means restoring the DB backup, not partially undoing post-migration writes.
- Once post-migration app writes occur on the new schema, downgrading in place is not safe.
- If verification fails, stop the rollout, restore backup, fix migration, rerun.

### Verification queries

Run and record the following after migration:

```sql
SELECT COUNT(*) AS bad_concept_ids
FROM concepts
WHERE id NOT LIKE 'c_%';

SELECT COUNT(*) AS bad_capture_ids
FROM learning_captures
WHERE id NOT LIKE 'lc_%';

SELECT COUNT(*) AS invalid_concept_json
FROM concepts
WHERE json_valid(language_or_runtime_json) = 0
   OR json_valid(surface_features_json) = 0
   OR json_valid(prerequisites_json) = 0
   OR json_valid(related_concepts_json) = 0
   OR json_valid(contrast_concepts_json) = 0
   OR json_valid(representative_capture_ids_json) = 0;

SELECT COUNT(*) AS invalid_capture_json
FROM learning_captures
WHERE (concept_hint_json IS NOT NULL AND json_valid(concept_hint_json) = 0)
   OR json_valid(keywords_json) = 0;

SELECT normalized_key, COUNT(*) AS duplicate_count
FROM concepts
GROUP BY normalized_key
HAVING COUNT(*) > 1;

SELECT COUNT(*) AS linked_state_without_fk
FROM learning_captures
WHERE state = 'linked' AND linked_concept_id IS NULL;

SELECT COUNT(*) AS unresolved_with_invalid_fk
FROM learning_captures
WHERE state IN ('unresolved', 'proposed_new') AND linked_concept_id IS NOT NULL;

SELECT COUNT(*) AS manual_review_rows
FROM concepts
WHERE language_syntax_legacy IS NOT NULL
  AND json_array_length(language_or_runtime_json) = 0
  AND json_array_length(surface_features_json) = 0;
```

### No silent data loss rule

<no_silent_data_loss_rule>
- If verification queries fail, migration is not complete.
- If a row cannot be cleanly transformed, preserve the legacy value and flag it.
- If a rollback is required, restore from backup rather than force-fitting broken rows.
- Do not ship a migration that "mostly works".
</no_silent_data_loss_rule>

---

## 7. Test strategy

Every stage must ship tests at the same time as the code it introduces. No phase is complete on implementation alone.

### Unit tests

- `computeStrength` monotonicity
- Concept-type visual mapping helpers
- Familiarity delta mapping in `applyReviewRating`
- Prompt composition ordering
- Mini chat exchange counting

### Codec tests

- Zod codec round trips for capture JSON columns
- Zod codec round trips for concept JSON columns
- `review_events` codec validation
- Promotion cache/dismissal codec validation
- Retrieved memory payload codec validation

### Migration tests

- Fresh-install Stage 1 schema creation
- Existing-data migration with `language_syntax_legacy`
- `language_syntax` backfill coverage
- ID prefix integrity
- FK/state integrity after concept deletion

### Repository/data tests

- Capture save transaction
- Concept dedup by `normalized_key`
- Async embedding status behavior
- Promotion transaction updates and link-existing path
- Retrieval diagnostics and tier sync
- `review_events` audit log transaction behavior

### Prompt/extractor tests

- Extractor accepts valid JSON only
- Extractor rejects prose output
- Extractor retries once, then fails loudly
- Concept pre-check top-3 bound
- Link guard threshold behavior
- Persona/extractor isolation static check

### UI component tests

- Multi-save modal behavior
- Card navigation behavior
- Learning Hub ordering rules
- Promotion clustering and dismissal behavior on visible surfaces
- Dot Connector injection states
- Mini chat caps
- Bookmark palette behavior

### Integration tests

- Save flow from extraction to DB write to async embedding enqueue
- Learning Hub reflects saved captures and promoted concepts
- Retrieval returns `{ memories, diagnostics }`
- Review Mode updates familiarity only through `applyReviewRating`
- Persona selection changes next-turn chat prompt only
- Bookmarks remain outside Learning Hub

### Graph performance tests

- Skia graph 300-node / 600-edge pan-zoom performance
- Mode switch under one frame with no relayout
- No `last_accessed_at` mutation from graph interaction
- Ego/full cap enforcement

### Must-explicitly-exist test cases

<required_test_cases>
- Zod codec round trips
- capture save transaction
- async embedding status behavior
- multi-save modal behavior
- card navigation behavior
- Learning Hub ordering rules
- promotion clustering and dismissal behavior
- retrieval diagnostics
- Dot Connector injection states
- review_events audit log
- persona/extractor isolation
- mini chat caps
- bookmark palette behavior
- Skia graph 300-node / 600-edge pan-zoom performance
</required_test_cases>

---

## 8. Feature flags

Flags exist only as temporary rollout gates. They are not permission to create alternate business logic.

| Flag | What it gates | Safe-off behavior |
|---|---|---|
| `FF_CAPTURE_FIRST_SAVE_FLOW` | Exposure of the Stage 2 save UI path | Hide new capture-save UI entry points; do not route to any concept-first alternative |
| `FF_PROMOTION_SUGGESTIONS` | Hub promotion suggestions and review entry | Hide suggestions surface; captures remain saved and unresolved/proposed_new data remains valid |
| `FF_DOT_CONNECTOR` | Stage 7 memory injection UI and send-time injection | Send chat without injection; retrieval data remains intact |
| `FF_REVIEW_MODE` | Weak Concepts surface and review session entry points | Hide review UI; do not write familiarity anywhere else |
| `FF_PERSONAS` | Persona picker, persona CRUD, persona layer injection | Omit persona layer and use base chat prompt only |
| `FF_MINI_CHAT` | Line-level mini chat | Hide mini chat entry; full chat/save paths unchanged |
| `FF_BOOKMARKS` | Bookmark gutter dots, sheets, and palette UI | Hide bookmark UI; no effect on captures/concepts |
| `FF_NATIVE_GRAPH` | Stage 9 graph routes and graph entry points | Hide graph UI; concept data remains unchanged |

<flag_rules>
- flags are temporary rollout gates
- flags must not create alternate logic
- disabled flags must fail closed without corrupting data
- no flag may bypass core architecture constraints
</flag_rules>

---

## 9. Layout strategy

<layout_strategy>
- Use React Native layout/Yoga for normal UI.
- Use FlashList for large lists.
- Avoid dynamic height reflows where possible.
- Pre-measure text only if trivial and safe.
- DO NOT introduce custom layout engines.
- DO NOT store layout measurements in the database.
- Skia is reserved for Stage 9 graph rendering only.
</layout_strategy>

---

## 10. Integration checkpoints

Each checkpoint must pass before the next phase continues.

### Phase A checkpoint

**What must work**
- Baseline test harness and static guards run cleanly

**What must not regress**
- Existing RN project behavior

**What screenshots/manual behavior to verify**
- Baseline save entry, chat composer, file viewer, concept entry surfaces documented

**What tests must pass before continuing**
- Typecheck
- Existing unit suite
- Static guard checks

---

### Phase B checkpoint

**What must work**
- Stage 1 schema, repos, codecs, and migrations succeed on fresh and existing fixtures

**What must not regress**
- Existing DB readability
- Capture-first FK semantics

**What screenshots/manual behavior to verify**
- Migration verification logs
- Fresh-install DB open
- Existing fixture upgrade result

**What tests must pass before continuing**
- Stage 1 codec/repo/migration suite

---

### Phase C checkpoint

**What must work**
- Candidate extraction, concept pre-check, independent save, and async embedding enqueue

**What must not regress**
- Save must not require concept resolution
- Save must not require embeddings

**What screenshots/manual behavior to verify**
- Save modal with 1 candidate
- Save modal with multiple candidates
- Saved/unresolved state after low-confidence link

**What tests must pass before continuing**
- Stage 2 extractor/save suite

---

### Phase D checkpoint

**What must work**
- Distinct cards/primitives render and navigate correctly

**What must not regress**
- Candidate/compact/full separation
- No base-card abstraction

**What screenshots/manual behavior to verify**
- Candidate capture card
- Compact capture/concept cards
- Full capture/concept views

**What tests must pass before continuing**
- Stage 3 card suite

---

### Phase E checkpoint

**What must work**
- Learning Hub sections, locked ordering, and full-view navigation

**What must not regress**
- Hub remains navigation-only
- Linked captures do not disappear

**What screenshots/manual behavior to verify**
- Recent Captures
- Concept List
- Session Cards
- Knowledge Health entry/screen

**What tests must pass before continuing**
- Stage 4 ordering/visibility/navigation suite

---

### Phase F checkpoint

**What must work**
- Promotion suggestions, review screen, atomic concept creation, conflict handling

**What must not regress**
- No auto-create or auto-merge
- No score updates beyond Stage 5 baselines

**What screenshots/manual behavior to verify**
- Promotion suggestion card
- Promotion review screen
- Normalized-key conflict dialog

**What tests must pass before continuing**
- Stage 5 clustering/transaction/dismissal suite

---

### Phase G checkpoint

**What must work**
- Retrieval returns ranked memories with diagnostics and safe injection formatting

**What must not regress**
- No mutation of content or familiarity
- No zero-result fake success on backend failure

**What screenshots/manual behavior to verify**
- Retrieval diagnostics surface or diagnostic logs
- Example injection block preview

**What tests must pass before continuing**
- Stage 6 retrieval/diagnostics/GC suite

---

### Phase H checkpoint

**What must work**
- Dot Connector indicator, send-time injection fallback behavior, review session, audit log writes

**What must not regress**
- Chat send cannot block on retrieval
- Familiarity writes remain exclusive to `applyReviewRating`

**What screenshots/manual behavior to verify**
- Indicator states
- Memory preview sheet
- Weak Concepts screen
- Review session and result screens

**What tests must pass before continuing**
- Stage 7 dot-connector and review suites

---

### Phase I checkpoint

**What must work**
- Personas, cancel flow, selected-code preview, mini chat, bookmarks

**What must not regress**
- Extractor isolation
- No score mutation
- Bookmarks stay out of Hub

**What screenshots/manual behavior to verify**
- Persona picker
- Stop generating state
- Selected-code preview
- Mini chat
- Bookmark sheet and gutter dot

**What tests must pass before continuing**
- Stage 8 persona/chat/bookmark suites

---

### Phase J checkpoint

**What must work**
- Full graph and ego graph render, pan/zoom, tooltip, mode switch, cap handling

**What must not regress**
- Concept-only graph
- No `last_accessed_at` writes
- No alternate rendering backend

**What screenshots/manual behavior to verify**
- Structure mode
- Recency mode
- Strength mode
- Ego view
- Empty state
- Cap banner

**What tests must pass before continuing**
- Stage 9 graph query/layout/visual/performance suites

---

### Phase K checkpoint

**What must work**
- Entire end-to-end capture-first loop across save, hub, promotion, retrieval, review, and graph

**What must not regress**
- Any locked Stage 1-9 product decision

**What screenshots/manual behavior to verify**
- Full acceptance flow from Section 12

**What tests must pass before continuing**
- All targeted stage suites
- Final manual acceptance checklist

---

## 11. Failure modes

| Subsystem | Likely failure | Detection | Recovery |
|---|---|---|---|
| migration | Backfill loses meaning or drops legacy data | Migration tests, verification queries, Zod readback | Restore backup, preserve legacy field, fix deterministic mapping, rerun |
| save flow | Save depends on concept logic or embedding success | Stage 2 transaction tests, manual low-confidence save | Revert to unresolved save path, move embeddings back out of transaction |
| embeddings | Captures/concepts stuck `failed` or tier drift occurs | Diagnostics, retry counts, Stage 6 integrity sweep | Retry on foreground or rehydration path, correct `embedding_tier`, never delete source rows |
| promotion | Cluster false positives or duplicate concept collision | Cluster tests, conflict dialog manual verification | Require explicit review confirmation, offer link-existing/rename, preserve captures |
| retrieval | Backend partial/unavailable becomes silent empty result | Diagnostics tests, partial/unavailable UI/manual checks | Surface diagnostics, allow vec-only/FTS-only partial, throw on total backend loss |
| Dot Connector | Injection blocks chat send or shows stale count | Send-time timeout tests, indicator tests | Send without injection, reset indicator state, keep chat additive |
| Review Mode | Familiarity changes without audit row or wrong delta | Transaction tests, audit log inspection | Roll back transaction, centralize all writes through `applyReviewRating` |
| prompt composition | Persona/code context layers leak into extractor or prompt order changes | Static import tests, prompt builder tests | Re-isolate modules, restore locked layer order, block merge until tests pass |
| personas | Built-in personas deleted or active chat persona breaks | Built-in deletion tests, manual active-chat delete scenario | Reseed built-ins, use `ON DELETE SET NULL`, fall back to base chat prompt |
| mini chat | More than 5 exchanges, hidden retrieval/persona behavior, auto-save drift | Mini chat tests, manual limit verification | Enforce cap, keep no-persona/no-Dot-Connector rules, route saves through Stage 2 only |
| bookmarks | Palette edits mutate existing marks or bookmarks appear in Hub | Palette tests, Hub regression tests | Freeze existing bookmark colors by `color_key`, remove Hub exposure, keep bookmark-only queries |
| Learning Hub | Hub becomes deep-reading surface or ordering drifts | Ordering tests, screenshots/manual checks | Revert to compact-only lists and locked query order |
| graph rendering | Graph jank, wrong backend, capture nodes, or metadata writes | Performance tests, backend static checks, DB non-mutation tests | Keep Skia-only renderer, preserve concept-only query layer, cap nodes, keep read-only behavior |

---

## 12. Final acceptance checklist

The system is not complete until the full capture-first loop works end to end.

1. Read code in the RN project and ask chat about a selected snippet.
2. Save a capture from that interaction without needing a concept.
3. Verify the capture appears in Recent Captures.
4. Continue saving related captures until a promotion suggestion appears.
5. Open Promotion Review and explicitly create or link a concept.
6. Verify the concept appears in the Learning Hub Concept List.
7. Ask chat about a related topic later and verify Dot Connector retrieves the concept/capture context.
8. Open Review Mode for that concept and submit a self-rating.
9. Verify Review Mode updates familiarity only through `applyReviewRating` and writes `review_events`.
10. Open the graph and verify the concept appears as a concept node.
11. Verify Knowledge Health reflects the updated computed strength.

<end_to_end_flow>
read code -> ask chat -> save capture -> appears in Recent Captures -> promotion suggestion appears -> concept created -> concept appears in Hub -> Dot Connector retrieves it later -> Review Mode updates familiarity -> graph shows concept node -> Knowledge Health reflects strength
</end_to_end_flow>

Additional final checks:
- Save still works when embeddings fail later.
- Graph interaction does not update `last_accessed_at`.
- Bookmarks do not appear in Hub or graph.
- Personas do not affect extractor output.
- Disabled feature flags fail closed without corrupting data.

---

## 13. Anti-laziness block

<anti_laziness>
- Do not replace detailed stage specs with summaries.
- Do not skip tests because implementation seems obvious.
- Do not mark a phase complete unless acceptance criteria pass.
- Do not move to the next phase with failing tests.
- Do not silently ignore TypeScript, Zod, migration, query-key, or performance violations.
- Do not "temporarily" bypass branded IDs, codecs, transactions, or feature barrels.
</anti_laziness>

---

## Final mandate

<final_mandate>
- Execute sequentially.
- Protect the save.
- Keep captures primary.
- Treat unresolved as safer than polluted.
- Use the locked stage files for detail, and this playbook for order, gating, and discipline.
</final_mandate>
