# Ontology Profile Refactor Implementation Handoff

This file tracks what has actually changed on the `refactor/ontology-profile` branch. It is for other LLMs or reviewers who need current implementation context, not just the strategic plan.

## Current Branch State

Branch:

```text
refactor/ontology-profile
```

Implemented so far:

- Added `src/features/ontology/`.
- Added profile/domain types in `src/features/ontology/types.ts`.
- Added the default `codingProfile` in `src/features/ontology/profiles/codingProfile.ts`.
- Moved the current coding concept type list into `codingProfile.ontology.itemTypeNodeIds`.
- Kept `src/features/learning/types/learning.ts` exporting `CONCEPT_TYPES` as a compatibility alias.
- Moved graph structure colors into `codingProfile.graph.nodeColors`.
- Made extractor prompt construction render profile ontology node descriptions instead of a hardcoded concept type list.
- Made retrieval memory formatting read labels/header from the active profile.
- Made concept type chips, graph legend rows, and graph node tooltips render ontology node labels from the active profile.
- Made promotion review use the active profile's item type list and default promoted item type.
- Made promotion clustering and concept construction use `profile.promotion.contextOnlyKeywords` instead of local coding token sets.
- Made `ConceptCardFull` metadata row labels (`Core`, `Pattern`, `Paradigm`) read from `profile.metadataFields` via shared metadata utilities.
- Made `ConceptCardFull` "Where You Learned This" section title read from `profile.labels.originSectionTitle`.
- Added `originSectionTitle` to `DomainLabels` interface and `codingProfile.labels`.
- Made `GraphLegend` relationship line labels (`Solid: ...`, `Dashed: ...`, `Dotted: ...`) read from `profile.graph.relationshipLabels` instead of hardcoded strings.
- Renamed graph-level ontology type field from `conceptType` to `typeNodeId` in `GraphNode` interface (graph internals now use profile-owned ontology node IDs).
- Added `placeholder?: string` to `MetadataFieldDefinition`; filled in for `coreConcept`, `architecturalPattern`, `programmingParadigm` in `codingProfile`.
- Made `PromotionReviewScreen` name field placeholder and confirm button use `profile.labels.itemSingular`; advanced metadata input placeholders read from profile metadata definitions.
- Renamed promotion-owned ontology type fields: `PromotionConfirmInput.conceptType` -> `typeNodeId`, `PromotionReviewModel.proposedConceptType` -> `proposedTypeNodeId`, `PromotionSuggestion.proposedConceptType` -> `proposedTypeNodeId`, `PromotionSuggestionCard.proposedConceptType` -> `proposedTypeNodeId`. Promotion UI state now uses `typeNodeId`. `buildConceptFromCluster()` maps `input.typeNodeId` to `LearningConcept.conceptType`. DB column `proposed_concept_type` is mapped to `proposedTypeNodeId` in domain objects. Clustering logic renamed `mostCommonConceptType` to `mostCommonTypeNodeId`. Capture hint fields like `proposedConceptType` are kept legacy because capture codecs still expose compatibility shapes.
- Renamed retrieval-owned ontology type field `RetrievedConceptPayload.conceptType` -> `typeNodeId`. Added `RetrieveFilters.typeNodeIds` as preferred filter, keeping `conceptTypes` as legacy alias (treated as union when both present). `RetrieveOptionsCodec` accepts both. `matchesFilters()` supports both. `formatMemoriesForInjection()` renders the active profile's ontology node label via `getOntologyNodeLabel(payload.typeNodeId)`.
- Added `relationshipSectionTitle` to `DomainLabels` and `codingProfile.labels` (`'Learning Structure'`).
- Added `relationshipSectionLabels` to `GraphProfile` and `codingProfile.graph`; `ConceptCardFull` relationship block headers (`Prerequisites`, `Related`, `Contrast`) now read from `profile.graph.relationshipSectionLabels`.
- Added `src/features/ontology/metadata.ts` with `getMetadataField`, `getMetadataFieldLabel`, `getMetadataFieldPlaceholder`; removed the duplicated local helpers from `ConceptCardFull` and `PromotionReviewScreen`.
- Renamed UI primitive `ConceptTypeChip.tsx` to `TypeNodeChip.tsx`; component `ConceptTypeChip` -> `TypeNodeChip`; prop `type` -> `typeNodeId`. The old `ConceptTypeChip.tsx` is now a deprecated compatibility wrapper (not a re-export shim) that accepts `type` and maps it to `typeNodeId` internally. All card/promotion/review call sites use `TypeNodeChip` with `typeNodeId`. Source-level regression guards added in `stage3-card-guards.test.ts` and `stage4-hub-guards.test.ts` to ensure the shim stays a real wrapper and callers use the new API. Card boundary props (`conceptType` on `ConceptCardCompact`, `ConceptCardFull`, `CaptureCardFull`, `CandidateCaptureCard`) are kept as compatibility mirrors of `LearningConcept.conceptType`.
- Added architecture/anti-regression guards in `stage10-architecture-guards.test.ts` for ontology-profile naming boundaries (graph `typeNodeId`, promotion `typeNodeId`/`proposedTypeNodeId`, retrieval `typeNodeId`/`typeNodeIds`, UI chip `TypeNodeChip`/deprecated `ConceptTypeChip` wrapper, hook `ConceptListFilters.typeNodeIds`). Updated `05_ANTI_REGRESSION_RULES.md` with naming boundary table documenting allowed legacy names.
- Renamed `ConceptListFilters` hook-owned filter API: added preferred `typeNodeIds?: ConceptType[]`, kept `conceptType?: ConceptType` as legacy alias. Filtering treats both as a union (same behavior as retrieval `matchesFilters`). Source guards added in `stage4-hub-guards.test.ts` and `stage10-architecture-guards.test.ts`.
- Moved all hardcoded review UI labels into `ReviewProfile` and wired them through `getActiveDomainProfile().review` (or `profile.labels.reviewModeTitle` where already appropriate). Review screens (`ReviewThresholdScreen`, `ReviewSessionScreen`, `ReviewResultScreen`, `SelfRatingPrompt`, `ShowSavedReveal`, `ReflectionInput`) now read labels from the active profile. Preserved exact current coding wording in `codingProfile`.
- Moved all hardcoded graph UI labels into `GraphProfile` and wired them through `getActiveDomainProfile().graph` (or `profile.labels` where already appropriate). Graph screen (`GraphScreen`) title/subtitle/empty-state and mode bar (`GraphModeBar`) labels now read from the active profile. Preserved exact current coding wording in `codingProfile`.
- Moved remaining hardcoded learning UI labels into `DomainLabels` and wired them through `getActiveDomainProfile().labels`. `LearningHubScreen` review entry text, `ConceptListSection` title/sort label/empty-state, and `SessionFlashbackScreen` banner/title/metadata/saved-section/empty-state labels now read from the active profile. Grouped flashback labels into a nested `flashback` object under `DomainLabels` to avoid flat-label sprawl. Preserved exact current coding wording in `codingProfile`.
- Moved remaining graph helper labels into `GraphProfile` and wired them through `getActiveDomainProfile().graph`. `GraphScreen` loading/error/retry/empty-body/cap-banner, `NodePreviewTooltip` never-accessed/last-accessed/score/strength/view-detail/day-pluralization, and `GraphLegend` title/recency/strength helper descriptions now read from the active profile. Grouped into nested `statusLabels`, `tooltipLabels`, and `legendHelperLabels` under `GraphProfile`. Preserved exact current coding wording in `codingProfile`.
- Moved remaining dynamic/fallback user-facing strings into the active profile. `SessionFlashbackScreen` `Unknown` fallback, concept/capture count templates, lowercase count labels (`concept`/`concepts`/`capture`/`captures`), and `NodePreviewTooltip` day count singular/plural templates now read from the profile. Preserved exact current coding wording and count behavior.
- Added ontology correction evidence types (`OntologyCorrectionEvidence`, `OntologyCorrectionSubjectKind`, `OntologyCorrectionField`, `OntologyCorrectionSource`) and a pure validation helper (`validateOntologyCorrection`) in `src/features/ontology/corrections.ts`. Validation checks profile id match, valid ontology item type ids for both previous and corrected values, rejects no-op corrections and empty ids, and does not mutate inputs. Domain-only - no persistence, UI, or automatic profile mutation.
- Added source-level architecture guards in `src/__tests__/stage10-architecture-guards.test.ts` to keep correction evidence domain-only: correction shape/export coverage, `typeNodeId`/`user` unions staying narrow for this stage, no forbidden cross-feature imports, no `ontology_corrections` / `ontology_patch_suggestions` source implementation yet, and no automatic profile mutation helper in `corrections.ts`.
- Added `06_PROFILE_BRANCHING_AND_MERGE.md` to capture Kortex profile inheritance, branching, overlays, and merge semantics before correction/checker persistence or UI work. The intended model is a stable base profile per lineage with branch/project/learning/personal overlays that can stay independent or merge selected changes back with user approval. The current coding profile is this app lineage's base, not a globally fixed base for every future fork/user.
- Added `07_KORTEX_CORE_AND_CHILD_CORES.md` to capture the newer product framing: Kortex Core is the reusable ontology/graph/versioned reasoning system, and CodeLens/coding is the first serious child core/wrapper around it. The doc also records child/subcore endpoints, agent execution ontology, self-building app framework direction, graph projections, relationship maturity, event-driven relationship discovery, and the caution that current `prerequisite`/`related`/`contrast` compatibility should not become the final global relationship taxonomy.
- Added `08_KORTEX_LANGUAGE_LAYER_AND_ADAPTERS.md` to capture the future language-layer direction: keep TypeScript for current app/core seams, design protocol-first operations, and leave room for a later Racket/Kortex DSL plus adapters. The doc explicitly defines self-updating as validated ontology/graph operations, not hidden source-code rewrites, and preserves future agent/app policy operations such as execution constraints, allowed/forbidden operations, approval gates, app cores, app entities, app workflows, and subagent assignments.
- Added `09_KORTEX_OVER_EXISTING_SYSTEMS.md` to capture Kortex as a non-destructive overlay over existing systems. The doc records read/write/sync adapters, source identity, codebase overlays, MCP/agent use, ontology-backed subagent execution policy, Kortex-over-self-building-apps, branch-safe experiments, and the rule that Kortex understands first and writes back only by explicit approval or policy.
- Added profile composition helpers: `ProfileOverlayKind` (`project` | `learning` | `personal`) and `ProfileOverlay<TItemTypeNodeId>` in `types.ts`; `composeDomainProfile(base, overlays)` in `src/features/ontology/profileComposition.ts` as a pure, non-mutating composition function. Overlays support adding/overriding ontology nodes, appending itemTypeNodeIds, merging/deduping relationshipTypeNodeIds, partial label overrides (including nested `flashback`), metadataFields merge by id, and partial graph overrides (nodeColors, relationshipLabels, statusLabels, tooltipLabels, legendHelperLabels, modeLabels). Re-exported from `index.ts`.
- Added `src/features/ontology/__tests__/profileComposition.test.ts` with 11 tests: empty overlays returns equivalent profile, overlay adds ontology node + itemTypeNodeId, overlay overrides existing node meaning/useWhen, label override preserves unspecified base labels, personal overlay wins over project/learning, later overlays of same kind win deterministically, relationshipTypeNodeIds merge/dedup without base mutation, metadataFields merge by id with overlay precedence, full input immutability, overrideOntologyNodes for non-existent id adds the node, partial graph override merges without losing base keys.
- Added the first explicit runtime overlay activation seam: `getActiveDomainProfile(overlays?)` still returns `codingProfile` by reference when called with no overlays or an empty overlay list, but composes supplied overlays through `composeDomainProfile()` for callers/tests that opt in. No global selector, persistence, UI, or automatic profile mutation was added.
- Added `src/features/ontology/__tests__/activeProfile.test.ts` with 4 tests for the active-profile overlay seam: default no-arg call returns `codingProfile` by reference, empty overlay list returns `codingProfile` by reference, explicit overlays compose without changing the default active profile, and ontology helpers can consume a composed active profile.

## Important Compatibility Choices

- Do not rename `learning`, `concept`, or DB tables yet.
- Migration 011 adds profile compatibility columns; do not remove legacy columns yet.
- Do not remove old coding-specific concept columns yet.
- Keep current coding behavior and current JSON output schemas working.
- `getActiveDomainProfile()` currently returns `codingProfile` directly. It is a seam, not a full profile selector yet.

## Files Added

```text
src/features/ontology/types.ts
src/features/ontology/index.ts
src/features/ontology/metadata.ts
src/features/ontology/corrections.ts
src/features/ontology/profiles/codingProfile.ts
src/features/ontology/__tests__/codingProfile.test.ts
src/features/ontology/__tests__/corrections.test.ts
src/features/ontology/profileComposition.ts
src/features/ontology/__tests__/profileComposition.test.ts
src/features/ontology/__tests__/activeProfile.test.ts
ONTOLOGY_PROFILE_REFACTOR/06_PROFILE_BRANCHING_AND_MERGE.md
ONTOLOGY_PROFILE_REFACTOR/07_KORTEX_CORE_AND_CHILD_CORES.md
ONTOLOGY_PROFILE_REFACTOR/08_KORTEX_LANGUAGE_LAYER_AND_ADAPTERS.md
ONTOLOGY_PROFILE_REFACTOR/09_KORTEX_OVER_EXISTING_SYSTEMS.md
src/features/learning/extractor/__tests__/extractorPrompt.test.ts
ONTOLOGY_PROFILE_REFACTOR/implementation_handoff.md
src/features/backup/__tests__/profile-columns.test.ts
src/features/backup/columnMaps.ts
```

## Files Changed

```text
src/features/learning/types/learning.ts
src/features/graph/types.ts
src/features/graph/engine/visualEncoding.ts
src/features/graph/data/graphQueries.ts
src/features/graph/ui/GraphLegend.tsx
src/features/graph/ui/NodePreviewTooltip.tsx
src/features/graph/ui/GraphScreen.tsx
src/features/graph/__tests__/visualEncoding.test.ts
src/features/graph/__tests__/layout.test.ts
src/features/graph/__tests__/graphQueries.test.ts
src/features/learning/extractor/extractorPrompt.ts
src/features/learning/services/prepareSaveCandidates.ts
src/features/learning/retrieval/formatting/formatMemoriesForInjection.ts
src/features/learning/retrieval/__tests__/stage6-retrieval.test.ts
src/features/chat/promptComposition/types.ts
src/features/ontology/profiles/codingProfile.ts
src/features/ontology/types.ts
src/features/ontology/index.ts
src/features/learning/ui/primitives/ConceptTypeChip.tsx
src/features/graph/ui/GraphLegend.tsx
src/features/graph/ui/NodePreviewTooltip.tsx
src/features/learning/promotion/ui/PromotionReviewScreen.tsx
src/features/learning/promotion/clustering/computeClusters.ts
src/features/learning/promotion/hooks/useSingleCapturePromotion.ts
src/features/learning/promotion/services/buildConceptFromCluster.ts
src/features/learning/ui/cards/CaptureCardFull.tsx
src/features/learning/ui/cards/ConceptCardFull.tsx
src/features/learning/ui/SaveAsLearningModal.tsx
src/features/learning/ui/LearningHubScreen.tsx
src/features/learning/hooks/useConceptList.ts
src/features/learning/ui/__tests__/stage4-hub-guards.test.ts
src/__tests__/stage10-architecture-guards.test.ts
src/features/ontology/__tests__/codingProfile.test.ts
src/features/learning/review/ui/ReviewThresholdScreen.tsx
src/features/learning/review/ui/ReviewSessionScreen.tsx
src/features/learning/review/ui/ReviewResultScreen.tsx
src/features/learning/review/ui/SelfRatingPrompt.tsx
src/features/learning/review/ui/ShowSavedReveal.tsx
src/features/learning/review/ui/ReflectionInput.tsx
src/features/graph/ui/GraphScreen.tsx
src/features/graph/ui/GraphModeBar.tsx
src/features/graph/ui/GraphLegend.tsx
src/features/graph/ui/NodePreviewTooltip.tsx
src/features/learning/ui/LearningHubScreen.tsx
src/features/learning/ui/ConceptListSection.tsx
src/features/learning/ui/SessionFlashbackScreen.tsx
src/features/backup/export.ts
src/features/backup/import.ts
src/features/backup/clear.ts
src/features/backup/format.ts
src/features/backup/columnMaps.ts
ARCHITECTURE.md
PERSISTENCE.md
ONTOLOGY_PROFILE_REFACTOR/02_DYNAMIC_PROFILE_SCHEMA.md
ONTOLOGY_PROFILE_REFACTOR/04_REFACTOR_WITHOUT_BREAKING_APP.md
ONTOLOGY_PROFILE_REFACTOR/README.md
ONTOLOGY_PROFILE_REFACTOR/NEXT_LLM_CONTEXT.md
ONTOLOGY_PROFILE_REFACTOR/TOMORROW_START.md
ONTOLOGY_PROFILE_REFACTOR/00_DOC_SYNC.md
ONTOLOGY_PROFILE_REFACTOR/07_KORTEX_CORE_AND_CHILD_CORES.md
ONTOLOGY_PROFILE_REFACTOR/08_KORTEX_LANGUAGE_LAYER_AND_ADAPTERS.md
ONTOLOGY_PROFILE_REFACTOR/09_KORTEX_OVER_EXISTING_SYSTEMS.md
```

## Verification Run

Passing:

```text
node node_modules\typescript\bin\tsc -p tsconfig.json --noEmit

npm test -- --run src\features\ontology\__tests__\codingProfile.test.ts src\features\learning\retrieval\__tests__\stage6-retrieval.test.ts src\features\chat\__tests__\stage8-prompt-composition.test.ts src\features\learning\extractor\__tests__\extractorPrompt.test.ts src\__tests__\stage10-architecture-guards.test.ts
```

Additional targeted tests were run for graph and promotion seams:

```text
src\features\graph\__tests__\visualEncoding.test.ts
src\features\learning\promotion\__tests__\stage5-clustering.test.ts
src\features\learning\promotion\__tests__\stage5-services.test.ts
src\features\learning\promotion\__tests__\stage5-guards.test.ts
```

UI card/hub label seam + metadata/relationship label seam (26 tests, 5 suites):

```text
src\features\ontology\__tests__\codingProfile.test.ts
src\features\graph\__tests__\visualEncoding.test.ts
src\features\learning\ui\__tests__\stage4-hub-guards.test.ts
src\features\learning\ui\cards\__tests__\stage3-card-guards.test.ts
src\__tests__\stage10-architecture-guards.test.ts
```

Latest verification after the correction evidence architecture guard slice:

```text
node node_modules\typescript\bin\tsc -p tsconfig.json --noEmit
npm test -- --run src/__tests__/stage10-architecture-guards.test.ts src/features/ontology/__tests__/corrections.test.ts
npm test -- --run

Result: TypeScript clean; targeted guard/correction tests 30/30 passed; full suite 356/356 passed across 50 test files.
```

Latest verification after profile composition helpers:

```text
node node_modules\typescript\bin\tsc -p tsconfig.json --noEmit
npm test -- --run src/features/ontology/__tests__/codingProfile.test.ts src/features/ontology/__tests__/profileComposition.test.ts
npm test -- --run

Result: TypeScript clean; 24/24 targeted ontology tests passed across 2 test files; full suite 367/367 passed across 51 test files.
```

Latest verification after active-profile overlay seam:

```text
node node_modules\typescript\bin\tsc -p tsconfig.json --noEmit
npm test -- --run src/features/ontology/__tests__/codingProfile.test.ts src/features/ontology/__tests__/profileComposition.test.ts src/features/ontology/__tests__/activeProfile.test.ts
npm test -- --run

Result: TypeScript clean; 28/28 targeted ontology tests passed across 3 test files; full suite 371/371 passed across 52 test files.
```

## Persistence Compatibility (migration 011)

The following persistence compatibility work is complete on this branch.

### DB migration

`src/db/migrations/011-ontology-profile-columns.ts` (version 11, transactional):
- Adds `profile_id TEXT NOT NULL DEFAULT 'coding'`, `type_node_id TEXT NOT NULL DEFAULT ''`, `metadata_json TEXT NOT NULL DEFAULT '{}'` to `concepts`.
- Adds `profile_id TEXT NOT NULL DEFAULT 'coding'`, `classification_json TEXT` to `learning_captures`.
- Backfills `type_node_id` from `concept_type` for all existing rows.
- Backfills `metadata_json` from legacy columns (`core_concept`, `architectural_pattern`, `programming_paradigm`) using JSON-safe escaping (backslash -> `\\`, `"` -> `\"`, `char(10)` -> `\n`, `char(13)` -> `\r`, `char(9)` -> `\t`).

### Drizzle schema additions (`src/db/schema.ts`)

`concepts`: `profileId`, `typeNodeId`, `metadataJson: text(..., { mode: 'json' }).$type<Record<string, string>>()`
`learningCaptures`: `profileId`, `classificationJson: text(..., { mode: 'json' }).$type<unknown | null>()`

### Concept codec (`src/features/learning/codecs/concept.ts`)

- `parseMetadataJson(raw)` exported - handles string/object input, validates known keys only.
- `ConceptMetadata` interface exported - `coreConcept?`, `architecturalPattern?`, `programmingParadigm?` each `string | null | undefined`.
- `conceptRowToDomain` does dual-read: `typeNodeId` wins over `conceptType` when non-empty; `metadata_json` fields win over legacy columns when key is present.
- `conceptRepo.insertLearningConcept` does dual-write: also writes `profileId: 'coding'`, `typeNodeId`, `metadataJson`.

### Retrieval path (`src/features/learning/retrieval/data/rowMappers.ts`)

`conceptRowToRetrievedPayload` does the same dual-read via the shared `parseMetadataJson` helper:
- `type_node_id` wins over `concept_type` when non-empty.
- `metadata_json.coreConcept` wins over `core_concept` column when key present.

### Capture codec (`src/features/learning/codecs/capture.ts`)

- `CaptureClassificationJson` interface exported - packs `profileId: 'coding'`, `proposedTypeNodeId`, and all `ConceptHint` fields for independent storage.
- `buildCaptureClassificationJson(hint)` exported - derives `CaptureClassificationJson` from a `ConceptHint`.
- `parseClassificationJsonToConceptHint(raw)` exported - reconstructs `ConceptHint` from a stored `CaptureClassificationJson`; returns null on missing/invalid input.
- `captureRowToDomain` fallback: if `conceptHint` column is null, tries to reconstruct from `classificationJson`.
- `captureRepo.insertCapture` dual-write: also writes `profileId: 'coding'` and `classificationJson` derived from `conceptHint` when present.

### Tests added

```text
src/db/migrations/__tests__/ontology-profile-migration.test.ts   (17 tests)
src/features/learning/codecs/__tests__/ontology-dual-read.test.ts  (11 tests)
src/features/learning/codecs/__tests__/capture-classification.test.ts (13 tests)
src/features/learning/retrieval/__tests__/rowMappers.test.ts       (9 tests)
src/features/learning/promotion/__tests__/conceptEmbedding.test.ts (5 tests)
src/features/backup/__tests__/profile-columns.test.ts            (38 tests)
```

### Backup/export/import - migration 011 column compatibility (complete)

- `src/features/backup/format.ts`: SCHEMA_VERSION bumped to 11.
- `src/features/backup/export.ts`: Added `learning_captures` to the TABLES spec (`SELECT *` already includes `profile_id`, `classification_json`). Concepts export already used `SELECT *`, so `profile_id`, `type_node_id`, `metadata_json` were already included.
- `src/features/backup/import.ts`: Added `learning_captures` read + insert. Insert order: after `concepts`, before `concept_links`. Missing ndjson file means an empty array, with no error on old backups. **All imported rows now pass through explicit column-name mappers** (`mapBackupRow`) before `insertBatch`, because raw `SELECT *` produces snake_case DB column names while Drizzle's `insert().values()` expects camelCase JS property names.
- `src/features/backup/clear.ts`: Added `schema.learningCaptures` delete before concepts (FK-safe order).
- `src/features/backup/columnMaps.ts`: Explicit per-table column maps for all 8 exported tables (projects, files, chats, chat_messages, learning_sessions, learning_captures, concepts, concept_links). Compile-time type guards verify every Drizzle JS property is covered and no mapped JS property is unknown. The `mapBackupRow` helper drops unknown keys so imports stay controlled.
- Backup JSON columns are decoded before the wipe and before Drizzle insert. This covers `recent_file_ids`, `marks`, `ranges`, `model_override`, `concept_ids`, `concept_hint_json`, `classification_json`, `keywords_json`, concept list fields such as `language_or_runtime_json`, and `metadata_json`. Malformed JSON throws during mapping while current data is still intact.
- Raw-shape tests (`profile-columns.test.ts`): Raw `SELECT *` returns snake_case keys; the mapper converts those rows to Drizzle insert shape and decodes JSON values into JS arrays/objects/null.
- Old backups without migration 011 columns import safely: DB defaults fill `profile_id`, `type_node_id`, `metadata_json` on concepts and `profile_id`, `classification_json` on captures.
- New backups round-trip the profile columns correctly via the mapper. Codecs (`conceptRowToDomain`, `captureRowToDomain`) handle post-import rows regardless of whether new columns are present.

### Documentation sync

- `ARCHITECTURE.md`: backup archive version updated to SCHEMA_VERSION 11, `learning_captures.ndjson` added, restore order now documents map/decode before wipe.
- `PERSISTENCE.md`: canonical persistence notes now document migration 011, dual-read/write profile columns, JSON column decoding during backup import, and why legacy coding columns stay.
- `ONTOLOGY_PROFILE_REFACTOR/02_DYNAMIC_PROFILE_SCHEMA.md` and `04_REFACTOR_WITHOUT_BREAKING_APP.md`: persistence plan corrected to remove capture-level metadata JSON and to keep `language_or_runtime_json` / `surface_features_json` as first-class columns for this compatibility stage.

## Next Recommended Step

Persistence compatibility and backup round-trip are complete. The remaining major work before full profile flexibility:

1. ~~Update backup/export/import flows to write `profile_id`, `type_node_id`, `metadata_json`, `classification_json` on restore.~~ (done)
2. ~~Update graph queries that filter or group by concept type to use `type_node_id` when present.~~ (done)
3. ~~Rename promotion-owned ontology type fields from `conceptType` / `proposedConceptType` to `typeNodeId` / `proposedTypeNodeId`, while keeping DB/cache/capture compatibility mappings.~~ (done)
4. ~~Update retrieval/filter naming around `conceptTypes` after deciding the public compatibility shape.~~ (done)
5. ~~Update `ConceptListFilters` hook naming to prefer `typeNodeIds` while keeping `conceptType` as a legacy alias.~~ (done)
6. ~~Move review UI labels into `ReviewProfile` while preserving current coding wording.~~ (done)
7. ~~Move graph UI screen/mode labels into `GraphProfile` while preserving current coding wording.~~ (done)
8. ~~Remaining label-profile cleanup candidates: Learning Hub review entry text, concept list section labels, session flashback empty state~~ (done).
9. ~~Remaining label-profile cleanup candidates: `ConceptListSection` empty-state text and `SessionFlashbackScreen` helper labels~~ (done). ~~Graph tooltip/cap/loading/error labels and graph legend helper descriptions~~ (done). ~~Dynamic count/pluralization and fallback labels (`Unknown`, concept/capture counts, day counts)~~ (done).
10. Correction evidence domain groundwork and source-level guards are in place; profile branch/overlay semantics are documented.
11. Kortex Core / child-core framing is documented.
12. Kortex future language-layer/adapters framing is documented. Do not introduce Racket or another runtime into this branch; keep TypeScript seams stable and operation-shaped.
13. Kortex-over-existing-systems overlay framing is documented. Do not add adapters, source sync, static analysis, file watchers, MCP, or write-back in the next composition/correction slice.
14. ~~Next code slice should be internal-only core/profile/child composition helpers and tests, before correction persistence, UI, MCP, language runtime, source adapters, or relationship-taxonomy changes.~~ (done - see profile composition helpers below)
15. Before changing relationship semantics, deliberately reconcile current `prerequisite` / `related` / `contrast` compatibility with the newer `is` / `is not` boundary-anchor plus dynamic-label direction.
16. Do not remove the old coding-specific columns (`coreConcept`, `architecturalPattern`, `programmingParadigm`, `conceptType`) until a later cleanup migration after compatibility is proven.
17. Profile composition helpers are implemented and tested.
18. Agent/subagent execution ontology is documented as a future direction: tags/subtags, `is`, `is not`, and `extends` can later define agent behavior, allowed/forbidden operations, tool/file scope, and approval gates. Do not implement orchestration, permission enforcement, MCP policy tools, or subagent runtime in this branch unless explicitly requested.
19. Kortex-as-self-building-app-framework is documented as a future direction: user intent can become a project app core, domain entities/workflows/screens/schema/API/UI/test responsibilities can become ontology and child/subagent cores, and user corrections can become evidence/patch suggestions before more code is generated. Do not implement app-builder runtime, code-generation orchestration, generated-app persistence, or source write-back in this branch unless explicitly requested.
20. The first explicit active-profile overlay seam is implemented and tested. The next decision gate is whether to persist branch/overlay state, add a real UI/runtime activation source, or move to correction persistence/checker first.

## Guardrails

- Keep the coding profile first-class.
- Keep current coding app behavior working.
- Do not silently accept unknown model-generated categories.
- Do not let persona/chat prompt layers enter extractor prompt internals.
- Do not apply ontology mutations automatically; suggestions require user/profile-owner approval.
- Do not let Kortex Core depend on CodeLens UI or coding-only relationship assumptions.
- Do not treat self-updating as hidden source-code mutation; it must mean validated, diffable, reversible core operations.
- Do not assume Kortex owns every source entity; future overlays may reference external systems and write back only through explicit adapters.
- Do not reduce future agents/subagents to prompt text only; preserve the path where Kortex supplies structured execution policy, permissions, and approval gates.
- Do not reduce future self-building apps to one-shot prompt-to-code generation; preserve the path where Kortex supplies the project ontology and coherence layer.
