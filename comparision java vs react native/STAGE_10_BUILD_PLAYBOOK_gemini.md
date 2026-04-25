# STAGE 10: CODEX BUILD PLAYBOOK (_gemini)

## 1. System Role & Boundaries

**What Stage 10 IS:**
- The **ultimate execution plan** for the entire CodeLens project.
- A strict sequence of integration, testing, and deployment.
- A playbook defining how to build safely without regressions.
- A strategic guide that enforces strict layout stability.

**What Stage 10 IS NOT (Anti-Regression Guarantees):**
- It DOES NOT change any product rules from Stages 1–9.
- It DOES NOT add new user-facing features.
- It DOES NOT modify schemas or logic established previously.
- It DOES NOT introduce product shortcuts.

<non_regression_contract>

- MUST NOT introduce new rendering or layout systems
- MUST NOT replace React Native layout engine
- MUST NOT add canvas-based UI components outside Stage 9 graph
- MUST NOT change Stage 9 graph constraints or caps
- MUST NOT introduce new data flows or storage patterns
- MUST NOT add background layout computation pipelines

</non_regression_contract>

## 2. STRICT Build Order

The build MUST proceed in these exact discrete phases. A phase MUST pass its Integration Checkpoint before the next phase begins.

### Phase A: The Bedrock (Stages 1 & 2)
1. DB schema definitions (SQLite/WatermelonDB/Drizzle).
2. Codec definitions and branded IDs.
3. Extractor logic (LLM extraction to raw JSON).
4. Save Flow UI (Candidate generation).
5. Async embedding pipeline (queue system).

### Phase B: The Visuals (Stages 3 & 4)
1. Build `CaptureCardCompact`, `ConceptCardCompact`, `CaptureChip`.
2. Build `CandidateCaptureCard` and `CaptureCardFull`, `ConceptCardFull`.
3. Learning Hub layout (Recent Captures, Concept List).
4. Session Cards & Knowledge Health 1D view.

### Phase C: The Intelligence (Stages 5 & 6)
1. Manual promotion logic (Capture -> Concept linking).
2. Clustering and LLM suggestion pipeline.
3. FTS5 full-text search integration.
4. `sqlite-vec` hybrid retrieval and ranking pipeline.
5. Injection contracts (passing context to LLM).

### Phase D: The Application (Stages 7 & 8)
1. Memory injection UI (Dot Connector).
2. Review Mode thresholds (Loading indicators).
3. Personas and Custom System Prompts.
4. Chat UX, cancellation, line-level chat, bookmarks.

### Phase E: The Visualization (Stage 9)
1. React Native Skia & Reanimated setup.
2. D3-force simulation via `useFrameCallback`.
3. Graph UI modes (Structure, Recency, Strength).
4. Knowledge Health 2D matrix.

## 3. Dependency Graph

<dependency_graph>
- Database & Codecs (Stage 1) -> BLOCKING FOR ALL.
- Extractor (Stage 2) -> BLOCKING FOR Save Flow UI.
- Card Primitives (Stage 3) -> BLOCKING FOR Learning Hub (Stage 4).
- Learning Hub (Stage 4) -> BLOCKING FOR Manual Promotion (Stage 5) (needs UI to trigger it).
- Promotion System (Stage 5) -> BLOCKING FOR Retrieval (Stage 6) (needs Concepts to retrieve).
- Retrieval (Stage 6) -> BLOCKING FOR Dot Connector (Stage 7).
- Dot Connector (Stage 7) -> BLOCKING FOR Chat UX (Stage 8).
- Graph & Knowledge Health (Stage 9) -> NON-BLOCKING for core capture loops, but requires Stage 5 Concepts.
</dependency_graph>

## 4. PR Strategy

To prevent mid-build app breakage, PRs MUST be scoped defensively:

1. **PR Type: Schema & Core (Silent)**
   - Add tables, sync queues, and models. Do not hook into UI.
   - Mergable immediately.
2. **PR Type: Headless Logic (Test-Driven)**
   - Add extraction parsers, retrieval ranking, embedding jobs.
   - MUST include unit tests. No UI dependencies.
3. **PR Type: UI Components (Storybook/Isolated)**
   - Build cards and lists using mocked data.
4. **PR Type: Wiring (The Danger Zone)**
   - Connect live data to UI.
   - MUST be feature-flagged if replacing an existing flow.

## 5. Integration Checkpoints & Failure Modes

### Checkpoint A (After Phase A)
- **MUST Work:** Saving a raw capture writes correctly to the DB. Embedding queue enqueues.
- **Failure Mode:** DB locking or transaction rollbacks.
- **Recovery:** Implement strictly synchronous save; defer all embeddings to background workers.

### Checkpoint B (After Phase B)
- **MUST Work:** List scrolls smoothly with 1,000+ mocked cards via FlashList virtualization.
- **Failure Mode:** Scroll jank or layout shifts.
- **Recovery:** Revert to fixed-height rows if dynamic virtualization fails, log ticket to fix.

### Checkpoint C (After Phase C)
- **MUST Work:** Search returns relevant results combining semantic and text match.
- **Failure Mode:** Hybrid search is too slow (>500ms).
- **Recovery:** Fallback to pure FTS5 while optimizing `sqlite-vec` index.

### Checkpoint D & E (After Phase D & E)
- **MUST Work:** Chat context window does not overflow. Graph renders at 60 FPS.
- **Failure Mode:** Graph freezes on interaction.
- **Recovery:** Fallback to Stage 9 caps: full graph 300 nodes, ego graph 40 nodes.

## 6. Test Strategy

Testing MUST enforce the Regression Guard.

- **Unit Tests (Mandatory):**
  - Codecs: Invalid data MUST throw.
  - LLM Extraction parsers: Missing fields MUST fallback safely.
  - Retrieval logic: Ranking algorithms MUST sort correctly.
- **Integration Tests:**
  - Save Flow: The path from `extract` -> `db.insert` MUST NOT be interrupted by promotion.
  - Embedding sync: Background job MUST pick up un-embedded rows.
- **UI Tests:**
  - Render constraints: `CandidateCaptureCard` MUST NOT import `CaptureCardFull`.
  - Graph performance: MUST handle 300 nodes / 600 edges without frame drops and maintain interactive pan/zoom responsiveness.

## 7. Migration Strategy (Data Porting)

If migrating from an existing V1 dataset:
1. **Immutable Capture Import:** Bring over raw captures exactly as they are.
2. **Schema Upgrade:** Run SQL migrations to add missing columns (e.g., `familiarity_score`).
3. **Background Backfill:** Enqueue jobs to generate embeddings for imported captures.
4. **Rollback Plan:** V1 database file is duplicated and backed up before V2 migration runs. V2 reads from new tables.

## 8. Feature Flags

Feature flags MUST be used for experimental optimizations or UI rewrites:
- `FF_HYBRID_SEARCH`: Toggle between FTS5-only and `sqlite-vec` hybrid retrieval.
- `FF_NATIVE_GRAPH`: Toggle for Stage 9 Skia graph.

## 9. Layout Strategy

<layout_strategy>
- Use React Native layout (Yoga) for all UI components
- Use FlashList for virtualization
- Avoid dynamic height reflows where possible
- Pre-measure text ONLY if trivial and safe
- DO NOT introduce custom layout engines
</layout_strategy>

## 10. Final Integration: "System Complete"

System is complete ONLY when:
- [ ] A user can save a snippet instantly with zero network delay (async embedding).
- [ ] UI reflects strict separation of Candidate vs Full cards.
- [ ] Concepts can be formed without mutating the original capture.
- [ ] Graph visualizes only Concepts, rendered smoothly via Skia.
- [ ] Knowledge Health relies strictly on `familiarity_score` without new gamification mechanics.

<final_mandate>
Execute sequentially. Protect the save. Optimize the reads.
</final_mandate>