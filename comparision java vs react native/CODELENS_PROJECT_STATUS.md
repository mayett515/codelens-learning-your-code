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
- Next work is implementation.
- Codex should start with Stage 10 playbook, Phase A.
- Do not write new feature specs unless user explicitly asks.

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
