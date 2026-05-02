# Stage 9 Native Concept Graph Handoff

<handoff version="1" date="2026-05-01" repo="C:\Projects\CodeLensApp\CodeLens-v2\codelens-rn">
  <purpose>
    Capture exactly what was analyzed, sliced, implemented, verified, and intentionally left for the next pass during Stage 9.
    This file is written for another LLM or engineer continuing from the same workspace.
  </purpose>
</handoff>

<baseline_checkpoint>
  <completed_before_stage_9>
    <item>Stage 8 Personas and Chat UX is complete.</item>
    <item>Stage 8.5A project-level bookmark list screen is complete.</item>
    <item>Stage 8 history must not be rewritten.</item>
  </completed_before_stage_9>
  <git_log_seen>
    <commit sha="ec92872">Add the Stage 8.5A project-level bookmark list screen.</commit>
    <commit sha="267579d">docs(stage8): add stage 8.5 follow-up plan</commit>
    <commit sha="f97db0c">chore(stage8): tighten bookmark slice after review</commit>
    <commit sha="d6438bf">feat(stage8): add reader bookmarks for code lines</commit>
  </git_log_seen>
  <pre_existing_dirty_files>
    <file path="../.claude/settings.local.json" status="modified" touched_by_stage_9="false" />
    <file path="../.claude/settings.json" status="untracked" touched_by_stage_9="false" />
  </pre_existing_dirty_files>
</baseline_checkpoint>

<required_docs_read>
  <doc path="MAIN.md" />
  <doc path="whatwe_agreedonthearchitecture.md" />
  <doc path="whatwe_agreedonthearchitecture_humans.md" />
  <doc path="ARCHITECTURE.md" />
  <doc path="current_state.md" />
  <doc path="PERSISTENCE.md" />
  <doc path="..\comparision java vs react native\STAGE_9_NATIVE_GRAPH_REWRITE.md" />
</required_docs_read>

<architecture_decisions_respected>
  <decision id="feature-owned-code">
    Stage 9 graph code lives under src/features/graph. Route files stay thin and delegate to feature-owned screens.
  </decision>
  <decision id="query-key-factories">
    Graph TanStack Query keys are produced by src/features/graph/data/graphKeys.ts. No hardcoded queryKey arrays were added.
  </decision>
  <decision id="concept-only-graph">
    Nodes are concepts only. Captures, bookmarks, personas, sessions, retrieval memories, and vector rows are not graph nodes.
  </decision>
  <decision id="read-only-graph">
    Graph queries and interactions are read-only. They do not mutate last_accessed_at, scores, embeddings, tiers, relationships, or concepts.
  </decision>
  <decision id="native-backend">
    New Stage 9 graph backend is Skia. No WebView, Cytoscape, or react-native-svg backend was added under src/features/graph.
  </decision>
  <decision id="layout-contract">
    Layout uses d3-force synchronously with forceSimulation(...).stop().tick(N). No D3 tick callback or requestAnimationFrame layout loop is used.
  </decision>
  <decision id="learning-boundary">
    Graph reads learning data through the learning public barrel and existing computeStrength. Extractor, retrieval, embeddings, and scoring logic were not altered for graph behavior.
  </decision>
  <decision id="typescript-guardrails">
    No new as any, no @ts-expect-error, no hidden deep imports for graph data access.
  </decision>
</architecture_decisions_respected>

<stage_9_contract>
  <rendering_backend>Skia via @shopify/react-native-skia</rendering_backend>
  <layout_engine>d3-force synchronous ticks</layout_engine>
  <full_graph_cap>300 concepts</full_graph_cap>
  <ego_graph_cap>40 concepts</ego_graph_cap>
  <edge_kinds>prerequisite related contrast</edge_kinds>
  <visual_modes>structure recency strength</visual_modes>
  <forbidden_nodes>captures bookmarks personas sessions retrieval-memories vector-rows</forbidden_nodes>
  <forbidden_graph_backends>WebView Cytoscape react-native-svg</forbidden_graph_backends>
  <forbidden_mutations>last_accessed_at scores embeddings tiers relationships concepts</forbidden_mutations>
</stage_9_contract>

<slice_plan>
  <slice id="9A" name="Data and Pure Engine Foundation" status="complete">
    <scope>
      <item>Add graph domain types.</item>
      <item>Add graph query key factory.</item>
      <item>Add read-only full graph and ego graph queries.</item>
      <item>Add edge builder with prerequisite direction and related/contrast dedupe.</item>
      <item>Add visual encoding for Structure, Recency, and Strength modes.</item>
      <item>Add focused tests for data, edge, and visual invariants.</item>
    </scope>
    <files>
      <file path="src/features/graph/types.ts" />
      <file path="src/features/graph/data/graphKeys.ts" />
      <file path="src/features/graph/data/graphQueries.ts" />
      <file path="src/features/graph/engine/edgeBuilder.ts" />
      <file path="src/features/graph/engine/visualEncoding.ts" />
      <file path="src/features/graph/__tests__/edgeBuilder.test.ts" />
      <file path="src/features/graph/__tests__/visualEncoding.test.ts" />
      <file path="src/features/graph/__tests__/graphQueries.test.ts" />
    </files>
  </slice>

  <slice id="9B" name="Layout Foundation" status="complete">
    <scope>
      <item>Add d3-force and @types/d3-force.</item>
      <item>Implement synchronous force layout with adaptive tick counts.</item>
      <item>Clone layout nodes so cached query data is not mutated.</item>
      <item>Add Float32Array position buffer and node index map helpers.</item>
      <item>Pin focal concept in ego graph layouts.</item>
      <item>Add tests for ticks, buffers, finite positions, focal pinning, and no input mutation.</item>
    </scope>
    <files>
      <file path="src/features/graph/engine/layout.ts" />
      <file path="src/features/graph/__tests__/layout.test.ts" />
      <file path="package.json" />
      <file path="package-lock.json" />
    </files>
  </slice>

  <slice id="9C" name="Native Render Core" status="complete">
    <scope>
      <item>Add Expo SDK 54-compatible @shopify/react-native-skia.</item>
      <item>Pre-allocate graph paints.</item>
      <item>Draw batched edge paths by kind.</item>
      <item>Draw prerequisite arrowheads, nodes, and labels from layout buffers.</item>
      <item>Add native GraphCanvas harness recording a Skia picture from the layout output.</item>
    </scope>
    <files>
      <file path="src/features/graph/ui/graphPaints.ts" />
      <file path="src/features/graph/engine/drawEdgesBatched.ts" />
      <file path="src/features/graph/ui/GraphCanvas.tsx" />
      <file path="package.json" />
      <file path="package-lock.json" />
    </files>
  </slice>

  <slice id="9D" name="Screen and Navigation Wiring" status="complete">
    <scope>
      <item>Add feature-owned GraphScreen.</item>
      <item>Add thin app/graph route.</item>
      <item>Register graph route in root stack.</item>
      <item>Wire Learning Hub Knowledge Graph entry.</item>
      <item>Wire ConceptCardFull.onViewGraph to focused graph route.</item>
      <item>Add native mode bar, legend, loading, error, empty, cap, and tooltip states.</item>
    </scope>
    <files>
      <file path="src/features/graph/ui/GraphScreen.tsx" />
      <file path="src/features/graph/ui/GraphModeBar.tsx" />
      <file path="src/features/graph/ui/GraphLegend.tsx" />
      <file path="src/features/graph/ui/NodePreviewTooltip.tsx" />
      <file path="src/features/graph/hooks/useGraphData.ts" />
      <file path="src/features/graph/index.ts" />
      <file path="app/graph.tsx" />
      <file path="app/_layout.tsx" />
      <file path="src/features/learning/ui/LearningHubScreen.tsx" />
    </files>
  </slice>

  <slice id="9E" name="Interaction Polish" status="code-complete-device-smoke-pending">
    <scope>
      <item>Manual hit testing against layout positions.</item>
      <item>Tap focus.</item>
      <item>Double-tap navigation into concept ego graph.</item>
      <item>Long-press node preview tooltip.</item>
      <item>Pan and pinch transform using gesture handler and Reanimated shared values.</item>
    </scope>
    <pending_verification>
      <item>Android device smoke for Skia canvas rendering.</item>
      <item>Real concept-data gesture feel and framing check.</item>
      <item>Optional screenshot or pixel verification if a local dev/device loop is available.</item>
    </pending_verification>
  </slice>
</slice_plan>

<learning_boundary_changes>
  <change path="src/features/learning/types/learning.ts">
    Added optional lastAccessedAt to LearningConcept so graph recency mode can read Stage 6 metadata.
  </change>
  <change path="src/features/learning/codecs/concept.ts">
    Mapped lastAccessedAt from concept rows with null fallback.
  </change>
  <change path="src/features/learning/index.ts">
    Exported ConceptId from the public learning barrel for feature-owned graph typing.
  </change>
  <non_changes>
    <item>No extractor changes.</item>
    <item>No retrieval ranking changes.</item>
    <item>No embedding write changes.</item>
    <item>No scoring formula changes.</item>
    <item>No bookmark or persona graph-node changes.</item>
  </non_changes>
</learning_boundary_changes>

<dependencies_added>
  <dependency name="d3-force" kind="runtime" reason="Stage 9 synchronous native force layout" />
  <dependency name="@types/d3-force" kind="dev" reason="Typed d3-force layout implementation" />
  <dependency name="@shopify/react-native-skia" kind="runtime" version="2.2.12" reason="Native Skia graph rendering" />
  <note>npm install reported 19 audit findings: 18 moderate and 1 high. No audit fix was run.</note>
</dependencies_added>

<verification>
  <command status="pass">node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit</command>
  <command status="pass">npm.cmd test -- src/features/graph/__tests__/edgeBuilder.test.ts src/features/graph/__tests__/visualEncoding.test.ts src/features/graph/__tests__/graphQueries.test.ts src/features/graph/__tests__/layout.test.ts</command>
  <result>4 graph test files passed, 24 graph tests passed.</result>
  <command status="pass">npm.cmd test -- --run</command>
  <result>41 test files passed, 211 tests passed.</result>
  <command status="pass-with-warnings">git diff --check</command>
  <result>No whitespace errors. CRLF conversion warnings only, including pre-existing ../.claude/settings.local.json warning.</result>
  <guard status="pass">rg -n "queryKey: \[|as any|@ts-expect-error" app src</guard>
  <guard status="pass">rg -n "WebView|react-native-webview|react-native-svg|cytoscape|learning_captures|embeddings_vec|bookmarks|personas|\.update\(|\.insert\(|\.delete\(|UPDATE |INSERT |DELETE " src\features\graph</guard>
  <guard status="pass">rg -n -F ".on('tick'" src\features\graph</guard>
  <guard status="pass">rg -n -F '.on("tick"' src\features\graph</guard>
</verification>

<known_limitations>
  <item>No Android device smoke has been run after adding the Skia graph route.</item>
  <item>No in-app browser or device screenshot verification has been run for canvas pixels or gesture behavior.</item>
  <item>Focus dimming currently passes focusedIndex into draw helpers; further polish can split connected and non-connected edge alpha more explicitly.</item>
  <item>Graph route is code-verified by TypeScript and tests, but not end-to-end navigated on device.</item>
  <item>Legacy Stage 5 WebView/Cytoscape files still exist outside src/features/graph; Stage 9 work added the native replacement path without deleting legacy files.</item>
</known_limitations>

<guardrails_for_next_llm>
  <must_not_touch>
    <file path="../.claude/settings.json" />
    <file path="../.claude/settings.local.json" />
  </must_not_touch>
  <must_not_do>
    <item>Do not rewrite Stage 8 or Stage 8.5A history.</item>
    <item>Do not make captures, bookmarks, personas, sessions, retrieval memories, or vector rows graph nodes.</item>
    <item>Do not add WebView, Cytoscape, or react-native-svg under src/features/graph.</item>
    <item>Do not mutate graph source data from graph reads or interactions.</item>
    <item>Do not alter embeddings, retrieval, extractor, or scoring unless a later approved stage explicitly requires it.</item>
    <item>Do not add hardcoded queryKey arrays.</item>
    <item>Do not add as any or @ts-expect-error.</item>
  </must_not_do>
  <should_do_next>
    <item>Run Android device smoke for /graph and /graph?conceptId=...</item>
    <item>Inspect real graph data with more than 40 concepts and confirm caps/readability.</item>
    <item>Check pan/pinch/tap/double-tap/long-press behavior on physical device.</item>
    <item>Optionally add a small route-level smoke test if the repo pattern supports it.</item>
    <item>Decide whether to remove or quarantine legacy src/graph WebView graph only after explicit approval, because Stage 9 so far only added the native replacement path.</item>
  </should_do_next>
</guardrails_for_next_llm>

<final_state_summary>
  Stage 9 now has a feature-owned native concept graph path with data queries, pure engine utilities, synchronous D3 layout, Skia drawing, route wiring, Learning Hub entry, concept-card focused graph navigation, and core gestures.
  Static and unit verification pass.
  Device/UI smoke remains the main pending Stage 9 QA item.
</final_state_summary>
