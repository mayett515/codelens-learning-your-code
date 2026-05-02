# Stage 9 Plan - Native Concept Graph

Stage 9 replaces the legacy WebView/Cytoscape graph path with a native, concept-only graph feature.

<stage_9_contract>
  <rendering_backend>Skia</rendering_backend>
  <layout_engine>d3-force synchronous ticks</layout_engine>
  <graph_scope>concepts only</graph_scope>
  <db_behavior>read only</db_behavior>
  <forbidden_nodes>captures bookmarks personas sessions retrieval-memories</forbidden_nodes>
  <forbidden_backends>WebView Cytoscape react-native-svg</forbidden_backends>
</stage_9_contract>

## Slice 9A - Data And Pure Engine Foundation

Status: complete.

Scope:
- Add graph domain types.
- Add graph query key factory.
- Add read-only full graph and ego graph data queries.
- Add edge builder with prerequisite direction and related/contrast dedupe.
- Add visual encoding for Structure, Recency, and Strength modes.
- Add focused tests for data, edge, and visual invariants.

Out of scope:
- Skia dependency and rendering.
- D3 layout dependency.
- Routes or navigation.
- Gesture handling.
- Removing legacy `src/graph/*`.
- Any changes to extractor, retrieval, embeddings, review scoring, bookmarks, or personas.

## Slice 9B - Layout Foundation

Status: complete.

Scope:
- Add `d3-force` and `@types/d3-force`.
- Implement synchronous force layout.
- Add position buffer and node index helpers.
- Add layout tests and timing warnings.

Out of scope:
- Skia canvas rendering.
- Navigation wiring.

## Slice 9C - Native Render Core

Status: complete.

Scope:
- Add `@shopify/react-native-skia`.
- Implement batched edge drawing, node drawing, labels, and paint helpers.
- Add a native `GraphCanvas` render harness that records a Skia picture from layout output.

Out of scope:
- Full screen route ownership and navigation entry points.
- Relationship editing or filters.

## Slice 9D - Screen And Navigation Wiring

Status: complete.

Scope:
- Add graph route/screen.
- Wire Learning Hub entry and `ConceptCardFull.onViewGraph`.
- Add mode bar, legend, loading, empty, error, and cap states.

Out of scope:
- Relationship editing or filters.

## Slice 9E - Interaction Polish

Status: code complete; device smoke pending.

Scope:
- Add manual hit testing.
- Add tap focus, double-tap detail navigation, long-press tooltip, pan, and pinch.
- Verify no graph interaction mutates `last_accessed_at`.

Out of scope:
- Graph export, search, relationship editing, or layout caching.
