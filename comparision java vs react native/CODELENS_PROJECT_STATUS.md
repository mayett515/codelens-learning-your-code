# CodeLens Project Status

> Context handoff for future LLM sessions.
> Read this first, then read the guards, then read the relevant stage file before doing any work.

---

## 0. Workspace locations (must-read)

<workspace_locations>
- Implementation repo root (React Native): `C:\CodeLens-v2\codelens-rn`
- Locked design/specs (this folder): `C:\CodeLens-v2\comparision java vs react native`

Rules:
- Make code changes only under the RN repo root.
- Treat the stage files in this folder as the single source of truth for product semantics.
- If you are not sure which folder you are in, stop and confirm the current working directory before editing anything.
</workspace_locations>

---

## 0.5 Required reading order

<required_reading_order>
Before implementing anything in `C:\CodeLens-v2\codelens-rn`, read in this order:

1. `C:\CodeLens-v2\codelens-rn\MAIN.md`
2. `C:\CodeLens-v2\codelens-rn\whatwe_agreedonthearchitecture.md`
3. `C:\CodeLens-v2\codelens-rn\whatwe_agreedonthearchitecture_humans.md`
4. `C:\CodeLens-v2\comparision java vs react native\CODELENS_PROJECT_STATUS.md`
5. `C:\CodeLens-v2\comparision java vs react native\CODELENS_REGRESSION_GUARD.md`
6. `C:\CodeLens-v2\comparision java vs react native\CODELENS_COMPLETENESS_GUARD.md`
7. the relevant stage file

Use the RN repo docs for structure/architecture rules.
Use the comparison-folder docs for product behavior and execution order.
</required_reading_order>

---

## 1. Project identity

CodeLens is a capture-first code understanding app.

<core_truth>
- captures are primary truth
- concepts emerge from captures
- graph is concept-only
- save never requires a concept
- no Anki/quiz/streak system
</core_truth>

Capture means one moment of understanding grounded in real code or chat context.
Concept means a pattern across captures, organized later and only through explicit user action.

---

## 2. Locked stage status table

| Stage | File | Status | Purpose | Locked decisions | Build dependency |
|---|---|---|---|---|---|
| Stage 1 | `STAGE_1_DATA_FOUNDATION.md` | LOCKED DESIGN | Schema, branded IDs, codecs, migrations, repos | Capture-first schema, `nanoid(21)`, concepts own familiarity/importance, Zod JSON boundaries | Blocks all later stages |
| Stage 2 | `STAGE_2_EXTRACTOR_AND_SAVE_FLOW.md` | LOCKED DESIGN | Extractor, concept pre-check, save contract, async embedding enqueue | 1-3 candidates, save stays independent per candidate, unresolved is valid, no auto-concept creation | Depends on Stage 1 |
| Stage 3 | `STAGE_3_CARD_COMPONENTS.md` | LOCKED DESIGN | Purpose-built cards and shared primitives | Candidate/compact/full separation, no base card, no variant props, five primary card surfaces plus `CaptureChip` | Depends on Stage 1/2 contracts |
| Stage 4 | `STAGE_4_LEARNING_HUB_SURFACES.md` | LOCKED DESIGN | Learning Hub navigation and awareness surfaces | Recent Captures, weakest-first Concept List, compact-only Hub lists, no deep reading in Hub | Depends on Stage 1/3 |
| Stage 5 | `STAGE_5_PROMOTION_SYSTEM.md` | LOCKED DESIGN | Explicit promotion from captures to concepts | No auto-create, no auto-merge, cluster thresholds locked, concept creation only in review screen | Depends on Stage 1/4 |
| Stage 6 | `STAGE_6_RETRIEVAL.md` | LOCKED DESIGN | FTS5 + sqlite-vec retrieval, diagnostics, injection contract | Hybrid RRF retrieval, hot/cold tier, deterministic injection formatting, read-only content behavior | Depends on Stage 1/5 |
| Stage 7 | `STAGE_7_DOT_CONNECTOR_AND_REVIEW.md` | LOCKED DESIGN | Dot Connector chat injection and Review Mode | Dot Connector is additive only, Review Mode is explicit, `applyReviewRating` is sole familiarity-update path | Depends on Stage 6 |
| Stage 8 | `STAGE_8_PERSONAS_AND_CHAT_UX.md` | LOCKED DESIGN | Personas, prompt composition, cancel, mini chat, bookmarks | Personas never affect extractor, mini chat cap = 5 exchanges, bookmarks are pre-capture annotations only | Depends on Stage 7 contracts |
| Stage 9 | `STAGE_9_NATIVE_GRAPH_REWRITE.md` | LOCKED DESIGN | Read-only native concept graph | Skia-only graph rendering, concept-only nodes, graph never writes `last_accessed_at` | Depends on Stage 1/3/6, not Stage 8 |
| Stage 10 | `STAGE_10_CODEX_IMPLEMENTATION_PLAYBOOK.md` | BUILD PLAYBOOK | Execution order, PR chunking, migration/test gates, integration discipline | No redesign, no feature drift, no phase completion without tests/acceptance gates | Execution-only layer over Stages 1-9 |

---

## 3. Most important locked decisions

- Capture-first save: saving a capture is the primary promise. Save must succeed if the DB write succeeds, even when concept linking is uncertain or embeddings fail later.
- 12 `concept_type` values: `mechanism`, `mental_model`, `pattern`, `architecture_principle`, `language_feature`, `api_idiom`, `data_structure`, `algorithmic_idea`, `performance_principle`, `debugging_heuristic`, `failure_mode`, `testing_principle`.
- 24h capture edit window: `title`, `whatClicked`, `whyItMattered`, and `conceptType` are editable only within the locked window.
- `rawSnippet` immutable: text content is evidence and cannot be freely rewritten after save; only pre-save boundary adjustment is allowed.
- Familiarity/importance live on concepts only, and `strength` is computed rather than stored.
- Five primary card components plus `CaptureChip`, no variants: `CandidateCaptureCard`, `CaptureCardCompact`, `CaptureCardFull`, `ConceptCardCompact`, `ConceptCardFull`, and `CaptureChip`; no base card, no `variant`/`density` props.
- Recent Captures surface is a first-class Stage 4 Hub section and must show both unresolved and linked captures.
- Promotion thresholds are locked: cluster suggestions require at least 3 eligible captures, at least 2 distinct sessions, at least 1 shared keyword, and mean similarity at least `0.75`; single-capture promotion is explicit only.
- Retrieval diagnostics are first-class output: Stage 6 always returns `{ memories, diagnostics }`, and partial degradation must stay visible.
- Dot Connector and Review Mode are separate systems: Dot Connector injects context into chat; Review Mode is explicit revisit and the only post-promotion familiarity update path.
- Personas do not affect extractor behavior: Stage 8 chat prompt composition is separate from the Stage 2 extractor prompt.
- Bookmarks are pre-capture annotations: they do not create knowledge objects, do not appear in Hub, and do not affect scores.
- Graph uses Skia and concept nodes only: no captures as nodes, no `react-native-svg`, no WebView, no Cytoscape, no graph writes.

---

## 4. Architecture invariants

<architecture_invariants>
- strict TypeScript
- exactOptionalPropertyTypes
- Drizzle + op-sqlite
- Zod at JSON boundaries
- branded IDs
- TanStack Query key factories
- feature co-location
- no silent failures
- embeddings async, never blocking save
</architecture_invariants>

More explicitly:
- New learning-system files live under feature-owned directories such as `src/features/learning/**`, `src/features/personas/**`, `src/features/bookmarks/**`, and `src/features/graph/**`.
- No raw DB rows go straight to UI components; row mappers and codecs own boundary parsing.
- No hardcoded TanStack query key arrays are allowed in these feature areas.
- Loud failure is preferred over fake success when JSON, migrations, or retrieval backends break.

---

## 5. Current status

- Product/design specs are complete.
- Stage 10 implementation has started in `C:\CodeLens-v2\codelens-rn`.
- Phase A - Architecture prep and baseline checks is complete as of 2026-04-26.
- Next work is optional functional Stage 5 promotion smoke testing, then Phase G / Stage 6 Retrieval.
- Do not write new feature specs unless user explicitly asks.

Phase A results:
- Required repo architecture docs and guards were read.
- Baseline typecheck passed: `node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit`.
- Baseline tests passed: `npm.cmd test` = 6 files, 27 tests.
- Added static guard tests at `C:\CodeLens-v2\codelens-rn\src\__tests__\stage10-architecture-guards.test.ts`.
- Added Stage 1 migration fixture SQL snapshots at `C:\CodeLens-v2\codelens-rn\src\features\learning\data\migrations\fixtures\`.
- Current RN app has legacy learning/session/concept code and a WebView/Cytoscape graph. Treat these as known drift to replace in the relevant locked stages, not as source-of-truth behavior.

Phase B results:
- Stage 1 Data Foundation code is implemented in `C:\CodeLens-v2\codelens-rn`.
- Added branded capture/concept IDs, Stage 1 types, codecs, repos, query keys, strength helper, Drizzle schema additions, migration 004, SQL migration artifact, and fixture snapshots.
- Automated verification passed: `node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit`; `npm.cmd test` = 10 files, 37 tests.
- Static guard searches passed for hardcoded learning query arrays, Stage 1 data-layer `as any`, and persona/extractor leakage.
- Device migration verification passed on a Samsung SM_A165F via USB debugging after `npm.cmd run android` reported `BUILD SUCCESSFUL in 12m 48s`.
- Device DB verification passed: `schema_version: 4`, `learning_captures exists: True`, `concepts_capture_unlink_bd` trigger exists, Stage 1 concept columns missing: `[]`, and deleting a linked concept produced `('unresolved', None)` for the linked capture.
- Windows DB pull note: PowerShell `>` corrupted binary DB pulls by doubling bytes; use `cmd /c "adb exec-out run-as ... > file"` for future DB pulls.
- `npm.cmd run lint` currently fails on pre-existing `react/display-name` errors in `src/ui/components/ChatBubble.tsx` and `src/ui/components/CodeViewer.tsx`; this is separate from the Stage 1 work.

Phase C results:
- Stage 2 Extractor and Save Flow service layer is implemented in `C:\CodeLens-v2\codelens-rn`.
- Added extractor prompt composition, extractor Zod schemas, retry-on-invalid-JSON runner, capture embedding text builder, save modal candidate data types, vector concept pre-check, candidate preparation, and capture-first `saveCapture`.
- Save flow behavior is capture-first: no auto-concept creation, confidence-gated concept linking, DB transaction before embedding enqueue, and embedding failure does not roll back capture persistence.
- Added cross-language existing-concept language append support and capture embedding retry increment helper.
- Automated verification passed: `node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit`; `npm.cmd test` = 13 files, 52 tests.
- Integration note: legacy `SaveAsLearningModal` still renders old concept-first review UI. Stage 2 service contracts are ready; Stage 3 should replace modal internals with candidate cards and wire individual card saves through `prepareSaveCandidates` + `saveCapture`.

Phase D results:
- Stage 3 Card Components are implemented in `C:\CodeLens-v2\codelens-rn`.
- Added six distinct card components: `CandidateCaptureCard`, `CaptureCardCompact`, `CaptureCardFull`, `ConceptCardCompact`, `ConceptCardFull`, and `CaptureChip`.
- Added shared primitives: `ConceptTypeChip`, `StrengthIndicator`, `StateChip`, `SourceBreadcrumb`, and `LanguageChip`.
- Reworked `SaveAsLearningModal` to use the capture-first Stage 2 services and `CandidateCaptureCard`; saves are independent per candidate, inspect does not save, and the old concept-first selection/merge/save-all flow is gone.
- Reworked `useSaveLearningStore` for candidate-first modal state and per-candidate save status.
- Automated verification passed: `node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit`; `npm.cmd test` = 14 files, 56 tests.
- Static guard tests now cover card existence, forbidden card props/base-card patterns, compact-card snippet exclusion, and save modal use of Stage 2 services.

Phase E results:
- Stage 4 Learning Hub Surfaces are implemented in `C:\CodeLens-v2\codelens-rn`.
- Replaced the old tabbed sessions/concepts route with a feature-owned `LearningHubScreen`.
- Added Hub sections/surfaces: `RecentCapturesSection`, `ConceptListSection`, `SessionCardsSection`, `SessionFlashbackScreen`, `KnowledgeHealthEntry`, and `KnowledgeHealthScreen`.
- Added required Stage 4 hooks: `useRecentCaptures`, `useConceptList`, `useRecentSessions`, `useSessionFlashback`, and `useKnowledgeHealthConcepts`.
- Added deterministic Hub ordering helpers: recent captures by `createdAt DESC` then `id ASC`; concepts weakest-first via `computeStrength`, then `updatedAt DESC`, then `name ASC`.
- Hub list surfaces use compact cards only; full capture/concept cards open from detail modals. Flashback is read-only and has no live-chat input.
- Automated verification passed: `node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit`; `npm.cmd test` = 16 files, 62 tests.
- Stage 4 guard tests cover required file/hook presence, thin route/no DB access from route, compact-card-only Hub lists, read-only flashback, and no quiz/streak/due health language.
- Post-review fixes before Stage 5:
  - `conceptMatchPreCheck` skips legacy vector hits before loading Stage 1 concepts.
  - `LearningHubScreen` loads linked captures through a per-concept query for `ConceptCardFull` evidence/provenance.
  - `saveCapture` creates/updates a `learning_sessions` row for the capture's session/chat grouping key.
  - migration 005 safely rebuilds legacy `normalized_key` values: Stage-1 `c_...` rows keep canonical normalized keys, legacy/duplicate rows get deterministic suffixed keys so the unique index cannot abort or block future promotions.
  - `getLearningConceptByNormalizedKey` ignores non-Stage-1 legacy rows.
  - candidate retry state can clear prior errors.
  - Added regression tests for these fixes.
- Device migration 005 smoke test passed on Samsung SM_A165F after rebuilding/opening the app:
  - copied DB reported `schema_version: 5`
  - `unique_concepts_normalized_key` index exists
  - duplicate normalized keys: `0`
  - that device DB currently has `0` concepts/captures/sessions, so this verifies migration execution/no startup wedge but does not exercise the legacy-duplicate suffix branch with live legacy rows.
- Integration note: concept detail in the Stage 4 modal now uses per-concept capture evidence/provenance. Stage 5 may expand this while implementing promotion flows. The Stage 4 concept list filters out pre-Stage-1 legacy concept IDs so old local rows do not crash the new branded-ID Hub.

Phase F results:
- Stage 5 Promotion System is implemented in `C:\CodeLens-v2\codelens-rn` and lives under `src/features/learning/promotion/`.
- Added migration 006 with `promotion_suggestions_cache` and `promotion_dismissals`.
- Added promotion codecs, cache/dismissal repos, `promotionKeys`, clustering, fingerprinting, cooldown-backed recompute, promotion confirmation, link-existing, dismissal/rejection/restore, hooks, and UI surfaces.
- Learning Hub now renders `PromotionSuggestionsSection` between Recent Captures and Concept List.
- Save modal now exposes `Make concept` for eligible unlinked/high-confidence candidates; it saves as `proposed_new`, creates a single-capture suggestion, and opens the same `PromotionReviewScreen`.
- Promotion confirmation inserts a concept only through the review screen, links captures in the same transaction, removes the cache row in the same transaction, and enqueues concept embedding after commit.
- Link-existing appends languages/surface features and does not mutate familiarity or importance.
- Automated verification passed: `node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit`; `npm.cmd test` = 21 files, 78 tests.
- Static sweeps passed for hardcoded promotion query arrays and forbidden promotion UI patterns.
- Device migration 006 smoke test passed on Samsung SM_A165F after rebuilding/opening the app:
  - copied DB reported `schema_version: 6`
  - `promotion_suggestions_cache` exists with `max_capture_created_at`
  - `promotion_dismissals` exists with `proposed_normalized_key`
  - `idx_promotion_cache_score` and `idx_promotion_dismissals_at` exist
  - copied DB currently has `0` suggestions/dismissals, so this verifies migration execution/no startup wedge; functional suggestion creation still needs real capture/embedding data to smoke-test.
- Deferred Stage 5 QA item:
  - Later, create at least 3 captures with shared keywords across at least 2 sessions, wait for capture embeddings to become `ready`, open the Learning Hub, and verify a Promotion Suggestions card appears.
  - This is intentionally deferred; migration 006 device verification is complete.
- Post-review fixes from Opus Stage 5 review:
  - Capture keywords now flow from extractor schema through save modal data into `learning_captures.keywords_json`.
  - Soft-dismissal resurface logic matches by `proposedNormalizedKey`.
  - Single-capture promotion opens review directly without writing a fake one-capture Hub suggestion.
  - Promotion review warning is source-aware and uses included capture count.
  - Suggestion cache stores `max_capture_created_at` and ordering now includes all locked tie-breakers.
  - Oversized clusters preserve surplus captures by chunking; deduped clusters are revalidated.
  - Review screen surfaces non-conflict errors.
  - Cooldown survives empty-cache recomputes in app memory.
  - Promotion suggestion query keys are limit-aware and factory-owned.
  - Link-existing dedupes languages before appending.
  - Automated verification after fixes passed: `node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit`; `npm.cmd test` = 21 files, 83 tests.

This means future work should be implementation, testing, migration safety, and integration discipline, not reopening product semantics that are already locked.

---

## 6. Regression warnings

- making save concept-first
- auto-creating concepts
- language-suffixed concept names
- turning review into flashcards
- making bookmarks knowledge objects
- using captures as graph nodes
- changing graph backend away from Skia
- adding custom layout engine outside graph
- letting personas affect extractor
- updating familiarity outside Review Mode

If a requested change starts drifting toward one of the items above, stop and check the relevant stage file before proceeding.

---

## 7. Handoff instruction

<future_llm_instruction>
Before doing any work, read `C:\CodeLens-v2\codelens-rn\MAIN.md`, `C:\CodeLens-v2\codelens-rn\whatwe_agreedonthearchitecture.md`, `C:\CodeLens-v2\codelens-rn\whatwe_agreedonthearchitecture_humans.md`, `CODELENS_PROJECT_STATUS.md`, `CODELENS_REGRESSION_GUARD.md`, `CODELENS_COMPLETENESS_GUARD.md`, then the relevant stage file.

Do not rely on memory.
Do not infer missing rules.
If a requested change conflicts with locked decisions, stop and flag it.
</future_llm_instruction>
