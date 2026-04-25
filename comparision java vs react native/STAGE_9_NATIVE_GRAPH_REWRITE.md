# Stage 9 — Native Graph Rewrite

> Builds on Stage 1 schemas, Stage 3 card components, Stage 5 promotion (concept creation), Stage 6 retrieval (last_accessed_at, computeStrength).
> Delivers the concept knowledge graph: a GPU-accelerated force-directed visualization of concept relationships.
> Codex-implementable. Read-only — Stage 9 performs NO schema writes beyond what previous stages already defined.

---

## Rendering Backend Decision

<rendering_backend_decision>
Stage 9 uses `@shopify/react-native-skia` as the graph rendering backend.

Do NOT use:
- WebView
- Cytoscape
- `react-native-svg` for graph rendering (SVG is too slow for 300 nodes at 60fps)

D3-force is still used for layout calculation (pure JS, no DOM).
Skia is used for all drawing (nodes, edges, labels).
Reanimated shared values + Gesture Handler are used for pan/zoom/tap interaction.
</rendering_backend_decision>

---

## Required Reading

Before implementing this stage, read:

1. `CODELENS_REGRESSION_GUARD.md`
2. `CODELENS_COMPLETENESS_GUARD.md`
3. `CODELENS_MASTER_PLAN.md`
4. `STAGE_1_DATA_FOUNDATION.md` — concept schema, relationship arrays, computeStrength
5. `STAGE_3_CARD_COMPONENTS.md` — ConceptCardFull.onViewGraph entry point contract
6. `STAGE_6_RETRIEVAL.md` — last_accessed_at semantics, hot/cold tier rules
7. This file

Conflict resolution:
- Regression Guard wins for product safety.
- Stage 1 wins for concept schema, relationship array semantics, and computeStrength.
- Stage 3 wins for ConceptCardFull prop contract (`onViewGraph: () => void` is LOCKED).
- Stage 6 wins for `last_accessed_at` semantics — graph queries MUST NOT update it.
- This file wins for graph types, layout engine, visual encoding, rendering architecture, and interaction model.

---

## Scope

### In scope

- `GraphNode`, `GraphEdge`, `EdgeKind`, `GraphMode`, `GraphData`, `NodePositionBuffer`, `NodeIndexMap` types
- Three locked visual modes: Structure, Recency, Strength
- Per-mode node color, node radius, edge style encoding
- D3-force layout engine (pure JS, synchronous tick, no DOM)
- `@shopify/react-native-skia` drawing: batched edge Path, per-node circle loop, label text
- `SharedValue<Float32Array>` for node positions (UI thread readable, no React re-renders on position update)
- Reanimated shared values + Skia Matrix transform for pan/zoom
- Gesture Handler tap (single + double) + long-press + pan + pinch
- Manual hit testing (coordinate inversion + distance check — no SVG event handlers)
- Full graph view (max 300 concept nodes)
- Ego view (focal concept + 1-hop neighbors, max 40 nodes)
- `graphKeys` query key factory
- `useFullGraph` and `useEgoGraph` TanStack Query hooks
- `GraphScreen` navigable via `onViewGraph` (Stage 3) and Hub
- GraphModeBar, GraphLegend, NodePreviewTooltip — React Native overlays (outside Skia canvas)
- Loading state, empty state, isolated-node state
- Performance budget enforcement (60fps with 300 nodes)
- Tests, acceptance criteria, anti-regression rules

### Out of scope (deferred)

- Relationship editing (adding/removing edges)
- Concept editing from within the graph
- Multi-hop path finding or highlight
- Sub-graph filtering by concept_type
- Graph export/share
- Cross-graph search, cluster detection
- Timeline animation of graph evolution
- 3D layout
- Graph sync across devices

### Strict non-changes

- `computeStrength` formula — use as-is from `src/features/learning/strength/computeStrength.ts`
- `last_accessed_at` — read-only here; Stage 6 retrieval engine owns all writes
- `familiarity_score` and `importance_score` — read-only; Stage 7 `applyReviewRating` owns all writes
- ConceptCardFull `onViewGraph: () => void` prop contract — LOCKED by Stage 3
- Concept relationship arrays — read-only; Stage 5 promotion owns writes

---

## Stage Invariants

<stage_9_invariants>
- Graph is CONCEPT-ONLY. Captures are NOT graph nodes. Never render a capture as a node.
- Graph queries are READ-ONLY. Stage 9 never writes to the database.
- `last_accessed_at` is NOT updated by graph navigation. Only Stage 6 retrieval engine updates it.
- `@shopify/react-native-skia` is the sole rendering backend for nodes and edges. No react-native-svg for graph drawing.
- Node positions live in `SharedValue<Float32Array>`, not in React state. Writing positions to React state is FORBIDDEN — it causes a re-render per frame.
- All edges drawn in one batched Skia `Path` per edge kind per frame. No per-edge React components or draw calls.
- Node drawing is a JS loop over the position buffer. No per-node React components inside the Skia Canvas.
- Hit testing is manual: invert the pan/zoom transform matrix, then `Math.hypot(graphX - node.x, graphY - node.y) < nodeRadius`. No SVG event handlers.
- D3-force simulation MUST run synchronously (`.stop()` before `.tick(N)`). Never run the RAF animation loop.
- Layout MUST complete in ≤ 400ms for 80 nodes. For 80–300 nodes, layout may take up to 800ms; show a loading indicator during layout (not during data fetch).
- Pan/zoom runs at 60fps via Reanimated shared values + Skia Matrix transform. No `Animated.Value` on the hot path.
- NodePreviewTooltip, GraphModeBar, GraphLegend are React Native components rendered as overlays above the Skia Canvas — they are NOT drawn inside Skia.
- The three visual modes change only visual encoding — they do NOT reload GraphData and do NOT re-run layout. Mode switch is one re-render of the Skia canvas.
- Edge deduplication is mandatory. Mutual listings create one edge, not two.
- Prerequisite edges are DIRECTED (prerequisite → concept). Related and contrast are UNDIRECTED.
- Full graph cap: 300 nodes. Ego cap: 40 nodes. Both are hard limits in Phase 1.
- If 0 concepts exist → empty state. A single isolated node with no edges is valid and MUST render correctly.
</stage_9_invariants>

---

## Core Concepts

<graph_semantics>
The graph represents the user's knowledge structure — how concepts relate to each other in their understanding. It is NOT a code dependency graph, NOT a skill tree, NOT a study curriculum.

Edge directions:
- Prerequisite: B → A (arrowhead at A) means "B must be understood before A".
- Related: A ↔ B (no arrowhead, dashed line) means "these ideas share conceptual territory".
- Contrast: A ⊕ B (no arrowhead, dotted line) means "understanding one sharpens the other through opposition".

Prerequisites are the only directed edges. Related and contrast are symmetric.
</graph_semantics>

---

## Data Types

All types live in `src/features/graph/types.ts`.

### `EdgeKind`

```ts
export type EdgeKind = 'prerequisite' | 'related' | 'contrast';
```

### `GraphMode`

```ts
export type GraphMode = 'structure' | 'recency' | 'strength';
```

### `GraphNode`

```ts
export interface GraphNode {
  id: ConceptId;
  name: string;
  conceptType: ConceptType;
  familiarityScore: number;        // 0..1, from concepts.familiarity_score
  importanceScore: number;         // 0..1, from concepts.importance_score
  lastAccessedAt: number | null;   // ms epoch, from concepts.last_accessed_at
  strength: number;                // computed: computeStrength(familiarityScore, importanceScore)

  // Mutable by D3. Undefined before layout.
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;              // fixed x — used to pin focal node in ego view
  fy?: number | null;              // fixed y — used to pin focal node in ego view
}
```

### `GraphEdge`

Query-layer type. Carries only semantic identity — no positional indices. This is what `GraphData.edges` contains and what `buildEdges` returns.

```ts
export interface GraphEdge {
  id: string;          // deterministic: `${sourceId}__${kind}__${targetId}`
  sourceId: ConceptId; // for 'prerequisite': the prerequisite concept
  targetId: ConceptId; // for 'prerequisite': the concept that requires source
  kind: EdgeKind;
}
```

### `RenderableGraphEdge`

Layout-layer type. Extends `GraphEdge` with buffer indices so the draw loop can read positions in O(1) without a map lookup per frame. Created by `toRenderableEdges` inside `runForceLayout`.

```ts
export interface RenderableGraphEdge extends GraphEdge {
  sourceIndex: number; // index i into NodePositionBuffer (x = buf[i*2], y = buf[i*2+1])
  targetIndex: number;
}
```

### `GraphData`

```ts
export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  isEgoView: boolean;
  focalConceptId: ConceptId | null;
  totalConceptCount: number;
  cappedAt: number | null;         // 300 for full graph, 40 for ego; null if under cap
}
```

### `NodePositionBuffer`

```ts
// Float32Array of size N * 2
// Layout: [x0, y0, x1, y1, ..., xN-1, yN-1]
// Index for node at position i: buffer[i*2] = x, buffer[i*2+1] = y
export type NodePositionBuffer = Float32Array;

// ConceptId → index in the buffer (i, not i*2)
export type NodeIndexMap = Map<ConceptId, number>;
```

### `LayoutResult`

```ts
export interface LayoutResult {
  nodes: PositionedNode[];
  edges: RenderableGraphEdge[];    // GraphEdge + buffer indices, built inside runForceLayout
  positionBuffer: NodePositionBuffer;
  nodeIndexMap: NodeIndexMap;
  durationMs: number;
}
```

### `PositionedNode`

```ts
export interface PositionedNode extends GraphNode {
  x: number;
  y: number;
}
```

### `NodeVisual`

```ts
export interface NodeVisual {
  fill: string;       // hex
  radius: number;     // dp
  strokeColor: string;
  strokeWidth: number;
}
```

### `EdgeVisual`

```ts
export interface EdgeVisual {
  strokeColor: string;
  strokeWidth: number;
  dashIntervals: number[] | null;  // null = solid
  hasArrow: boolean;
}
```

---

## Visual Encoding

All functions live in `src/features/graph/engine/visualEncoding.ts`.

No encoding function may throw. Unknown values (e.g., unrecognized `concept_type`) fall back to `mechanism` defaults with a `console.warn` in dev.

---

### Mode: Structure

**Node color** — fixed per `concept_type`:

```ts
export const CONCEPT_TYPE_COLORS: Record<ConceptType, string> = {
  mechanism:              '#6366F1', // indigo-500
  mental_model:           '#A855F7', // purple-500
  pattern:                '#EC4899', // pink-500
  architecture_principle: '#F43F5E', // rose-500
  language_feature:       '#F59E0B', // amber-500
  api_idiom:              '#10B981', // emerald-500
  data_structure:         '#14B8A6', // teal-500
  algorithmic_idea:       '#3B82F6', // blue-500
  performance_principle:  '#F97316', // orange-500
  debugging_heuristic:    '#EAB308', // yellow-500
  failure_mode:           '#EF4444', // red-500
  testing_principle:      '#22C55E', // green-500
};
```

**Node radius** — uniform: `14dp`.

**Node stroke** — `#FFFFFF` at `1.5dp`.

---

### Mode: Recency

**Age thresholds** (source: `lastAccessedAt` ms epoch, `null` = never accessed):

| Bucket | Condition | Color | Label |
|--------|-----------|-------|-------|
| `veryRecent` | age < 7 days | `#F97316` | "< 1 week" |
| `recent` | 7–30 days | `#FACC15` | "1–4 weeks" |
| `moderate` | 30–90 days | `#60A5FA` | "1–3 months" |
| `stale` | ≥ 90 days or `null` | `#94A3B8` | "3+ months" / "Never" |

```ts
export const getRecencyColor = (lastAccessedAt: number | null, nowMs: number): string => {
  if (lastAccessedAt === null) return '#94A3B8';
  const ageDays = (nowMs - lastAccessedAt) / 86_400_000;
  if (ageDays < 7)  return '#F97316';
  if (ageDays < 30) return '#FACC15';
  if (ageDays < 90) return '#60A5FA';
  return '#94A3B8';
};
```

**Node radius** — uniform: `14dp`.

**Node stroke** — `rgba(255,255,255,0.6)` at `1dp`.

---

### Mode: Strength

**Node color** — four-bucket gradient:

| Bucket | Range | Color |
|--------|-------|-------|
| `veryWeak` | 0.00–0.25 | `#EF4444` |
| `weak` | 0.25–0.50 | `#F97316` |
| `moderate` | 0.50–0.70 | `#FACC15` |
| `strong` | 0.70–1.00 | `#22C55E` |

Interpolate within each bucket locally, not across all four globally.

```ts
export const getStrengthColor = (strength: number): string => {
  if (strength < 0.25) return lerpColor('#EF4444', '#F97316', strength / 0.25);
  if (strength < 0.50) return lerpColor('#F97316', '#FACC15', (strength - 0.25) / 0.25);
  if (strength < 0.70) return lerpColor('#FACC15', '#22C55E', (strength - 0.50) / 0.20);
  return '#22C55E';
};
```

**Node radius** — proportional to strength:

```ts
export const STRENGTH_RADIUS_MIN = 8;  // dp — strength 0
export const STRENGTH_RADIUS_MAX = 26; // dp — strength 1

export const getStrengthRadius = (strength: number): number =>
  STRENGTH_RADIUS_MIN + (STRENGTH_RADIUS_MAX - STRENGTH_RADIUS_MIN) * strength;
```

**Node stroke** — `#FFFFFF` at `1.5dp`.

---

### Edge Kind Visual Styles

Consistent across all visual modes.

| `EdgeKind` | Stroke Color | Width | Dash Array | Arrow |
|------------|-------------|-------|------------|-------|
| `prerequisite` | `#94A3B8` | `1.5dp` | none | Yes — at **target** end |
| `related` | `#CBD5E1` | `1dp` | `[6, 4]` | No |
| `contrast` | `#CBD5E1` | `1dp` | `[2, 3]` | No |

Edge opacity: `0.65` at rest. When a node is focused: edges connecting to focused node → `1.0`; others → `0.2`.

Arrowhead for prerequisite edges: drawn as a small filled triangle at the target end of the line, rotated to match edge angle. Size: 6dp base, 9dp height. Fill color: `#94A3B8`.

---

## Edge Deduplication

File: `src/features/graph/engine/edgeBuilder.ts`

**Rules:**

1. Only include edges where both source and target are in the current node set.
2. Prerequisite: `sourceId = prerequisiteConceptId`, `targetId = conceptId` (directed).
3. Related/contrast: canonical `sourceId = lex_min(A, B)`, `targetId = lex_max(A, B)` (undirected).
4. Edge ID: `${sourceId}__${kind}__${targetId}`. Deduplication key. Seen-set prevents double-rendering.
5. A `prerequisite` + `related` edge between the same pair can coexist — different kinds, different IDs.

`buildEdges` returns `GraphEdge[]` (no indices). Indices are added later by `toRenderableEdges` inside `runForceLayout`.

```ts
export const buildEdges = (
  nodeIds: Set<ConceptId>,
  concepts: Pick<GraphNode, 'id' | 'prerequisites_json' | 'related_concepts_json' | 'contrast_concepts_json'>[]
): GraphEdge[] => {
  const seen = new Set<string>();
  const edges: GraphEdge[] = [];

  for (const concept of concepts) {
    if (!nodeIds.has(concept.id)) continue;

    for (const prereqId of concept.prerequisites_json) {
      if (!nodeIds.has(prereqId)) continue;
      const edgeId = `${prereqId}__prerequisite__${concept.id}`;
      if (seen.has(edgeId)) continue;
      seen.add(edgeId);
      edges.push({ id: edgeId, kind: 'prerequisite', sourceId: prereqId, targetId: concept.id });
    }

    for (const relId of concept.related_concepts_json) {
      if (!nodeIds.has(relId)) continue;
      const [src, tgt] = concept.id < relId ? [concept.id, relId] : [relId, concept.id];
      const edgeId = `${src}__related__${tgt}`;
      if (seen.has(edgeId)) continue;
      seen.add(edgeId);
      edges.push({ id: edgeId, kind: 'related', sourceId: src as ConceptId, targetId: tgt as ConceptId });
    }

    for (const contId of concept.contrast_concepts_json) {
      if (!nodeIds.has(contId)) continue;
      const [src, tgt] = concept.id < contId ? [concept.id, contId] : [contId, concept.id];
      const edgeId = `${src}__contrast__${tgt}`;
      if (seen.has(edgeId)) continue;
      seen.add(edgeId);
      edges.push({ id: edgeId, kind: 'contrast', sourceId: src as ConceptId, targetId: tgt as ConceptId });
    }
  }

  return edges;
};

export const toRenderableEdges = (
  edges: GraphEdge[],
  nodeIndexMap: NodeIndexMap,
): RenderableGraphEdge[] =>
  edges.map((e) => ({
    ...e,
    sourceIndex: nodeIndexMap.get(e.sourceId)!,
    targetIndex: nodeIndexMap.get(e.targetId)!,
  }));
```

---

## Layout Engine

File: `src/features/graph/engine/layout.ts`

### Dependency

Install `d3-force` only. Do NOT install the full `d3` bundle.

```
npm install d3-force
npm install --save-dev @types/d3-force
```

### D3 Node Interface

```ts
interface D3Node extends GraphNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx: number | null;
  fy: number | null;
}
```

### Force Configuration

```ts
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide } from 'd3-force';

export const runForceLayout = (
  rawNodes: GraphNode[],
  edges: GraphEdge[],
  opts: {
    width: number;
    height: number;
    ticks?: number;
    focalConceptId?: ConceptId;
  }
): LayoutResult => {
  const start = Date.now();
  const { width, height, focalConceptId } = opts;
  const ticks = opts.ticks ?? adaptiveTicks(rawNodes.length);

  // Clone — never mutate cached GraphData
  const nodes: D3Node[] = rawNodes.map((n) => ({
    ...n,
    x: width / 2 + (Math.random() - 0.5) * 120,
    y: height / 2 + (Math.random() - 0.5) * 120,
    vx: 0, vy: 0,
    fx: n.id === focalConceptId ? width / 2 : null,
    fy: n.id === focalConceptId ? height / 2 : null,
  }));

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const d3Links = edges
    .filter((e) => nodeMap.has(e.sourceId) && nodeMap.has(e.targetId))
    .map((e) => ({ source: nodeMap.get(e.sourceId)!, target: nodeMap.get(e.targetId)! }));

  forceSimulation<D3Node>(nodes)
    .force('link',      forceLink(d3Links).id((d: any) => d.id).distance(120).strength(0.6))
    .force('charge',    forceManyBody().strength(-280))
    .force('center',    forceCenter(width / 2, height / 2).strength(0.05))
    .force('collision', forceCollide<D3Node>().radius((d) => (d.radius ?? 14) + 8))
    .stop()
    .tick(ticks);

  const positionBuffer = buildPositionBuffer(nodes);
  const nodeIndexMap = buildNodeIndexMap(nodes);
  const renderableEdges = toRenderableEdges(edges, nodeIndexMap);

  return {
    nodes: nodes as PositionedNode[],
    edges: renderableEdges,
    positionBuffer,
    nodeIndexMap,
    durationMs: Date.now() - start,
  };
};
```

### `buildPositionBuffer`

```ts
export const buildPositionBuffer = (nodes: PositionedNode[]): NodePositionBuffer => {
  const buf = new Float32Array(nodes.length * 2);
  for (let i = 0; i < nodes.length; i++) {
    buf[i * 2]     = nodes[i].x;
    buf[i * 2 + 1] = nodes[i].y;
  }
  return buf;
};
```

### `buildNodeIndexMap`

```ts
export const buildNodeIndexMap = (nodes: GraphNode[]): NodeIndexMap => {
  const map: NodeIndexMap = new Map();
  nodes.forEach((n, i) => map.set(n.id, i));
  return map;
};
```

### Adaptive Ticks

```ts
const TICKS_BY_COUNT: Array<[number, number]> = [
  [40,  300],
  [80,  250],
  [150, 200],
  [300, 150],
];

export const adaptiveTicks = (nodeCount: number): number => {
  for (const [threshold, ticks] of TICKS_BY_COUNT) {
    if (nodeCount <= threshold) return ticks;
  }
  return 150;
};
```

### Performance Constraints

| Metric | Limit |
|--------|-------|
| Layout: ≤ 80 nodes | ≤ 400ms |
| Layout: 80–300 nodes | ≤ 800ms (show layout spinner, not data spinner) |
| Pan/zoom frame rate | 60fps constant — Reanimated UI thread |
| Skia draw call: 300 nodes + 600 edges | < 4ms per frame |
| Mode switch re-draw | < 16ms (one frame) |
| Peak additional memory for graph scene | ≤ 50MB RSS |

If `durationMs > 400`, emit `console.warn('[Graph] Slow layout: ${durationMs}ms for ${nodeCount} nodes')`.

---

## Skia Rendering Architecture

This section describes how positions from D3 flow to pixels on screen. This is the key performance path — read carefully before implementing.

### The Core Insight

Standard React Native graph libraries write node positions to React state → trigger re-render → SVG components update. For 300 nodes at 60fps, this is ~300 component updates × 60 frames/sec = thousands of reconciliation cycles per second. It cannot hit 60fps.

The solution: positions live in a `SharedValue<Float32Array>` that Reanimated can read on the UI thread without going through the React reconciler. Skia reads from this value in its draw callback and paints directly. Zero React re-renders during pan/zoom.

### Data Flow

```
D3 layout (JS thread, one-shot synchronous)
    │
    └─► Float32Array (plain JS value)
            │
            └─► SharedValue<Float32Array> (via .value = buf)
                    │
                    ├─► Skia onDraw worklet (UI thread) — reads positions, draws frame
                    │
                    └─► Gesture hit test worklet (UI thread) — reads positions, checks distance
```

### SharedValue Setup

In `GraphCanvas`:

```ts
import { useSharedValue } from 'react-native-reanimated';

// Initialized with empty buffer; populated after layout completes
const nodePositions = useSharedValue<Float32Array>(new Float32Array(0));

// After layout result arrives:
useEffect(() => {
  if (!layoutResult) return;
  nodePositions.value = layoutResult.positionBuffer;
}, [layoutResult]);
```

**Never** write to `nodePositions.value` inside the draw worklet. It is read-only within Skia's draw callback. Write only from JS thread (after layout or when pinning a node).

### Pan/Zoom State

```ts
const translateX = useSharedValue(0);
const translateY = useSharedValue(0);
const scale      = useSharedValue(1);

// Saved values for gesture end
const savedTX    = useSharedValue(0);
const savedTY    = useSharedValue(0);
const savedScale = useSharedValue(1);
```

### Skia Draw Callback

The `onDraw` callback runs on the UI thread. It reads SharedValues directly (no `.value` crossing threads — Reanimated makes them available as plain values in worklet context).

```ts
import { Canvas, useDrawCallback, Skia, BlendMode } from '@shopify/react-native-skia';

const onDraw = useDrawCallback(
  (canvas) => {
    'worklet';

    const positions = nodePositions.value;
    if (positions.length === 0) return;

    const tx = translateX.value;
    const ty = translateY.value;
    const s  = scale.value;

    // Apply pan/zoom transform
    canvas.save();
    canvas.translate(tx, ty);
    canvas.scale(s, s);

    // 1. Draw all edges (one batched path per kind)
    drawEdgesBatched(canvas, positions, edges, mode, focusedIndex.value, edgePaints);

    // 2. Draw arrowheads for prerequisite edges
    drawArrowheads(canvas, positions, prerequisiteEdges, arrowPaint);

    // 3. Draw all nodes (loop, no React components)
    drawNodes(canvas, positions, nodes, mode, focusedIndex.value, focalIndex, nowMs, nodePaints);

    // 4. Draw node labels (only if scale > 0.7)
    if (s > 0.7) {
      drawLabels(canvas, positions, nodes, labelPaint);
    }

    canvas.restore();
  },
  [nodePositions, translateX, translateY, scale, focusedIndex, mode, nowMs]
);

return <Canvas style={{ flex: 1 }} onDraw={onDraw} />;
```

### Pre-allocated Paint Objects

Pre-allocate all `Skia.Paint()` objects at module/component initialization. Never create `Paint` inside the draw worklet — object creation in a hot path tanks performance.

```ts
// src/features/graph/ui/graphPaints.ts

import { Skia } from '@shopify/react-native-skia';

export const buildGraphPaints = () => {
  const prerequisiteEdge = Skia.Paint();
  prerequisiteEdge.setColor(Skia.Color('#94A3B8'));
  prerequisiteEdge.setStrokeWidth(1.5);
  prerequisiteEdge.setStyle(PaintStyle.Stroke);
  prerequisiteEdge.setAntiAlias(true);

  const relatedEdge = Skia.Paint();
  relatedEdge.setColor(Skia.Color('#CBD5E1'));
  relatedEdge.setStrokeWidth(1.0);
  relatedEdge.setStyle(PaintStyle.Stroke);
  relatedEdge.setAntiAlias(true);
  // Dashes applied via PathEffect, set separately per draw

  const contrastEdge = Skia.Paint();
  contrastEdge.setColor(Skia.Color('#CBD5E1'));
  contrastEdge.setStrokeWidth(1.0);
  contrastEdge.setStyle(PaintStyle.Stroke);
  contrastEdge.setAntiAlias(true);

  const nodeFill = Skia.Paint();
  nodeFill.setStyle(PaintStyle.Fill);
  nodeFill.setAntiAlias(true);

  const nodeStroke = Skia.Paint();
  nodeStroke.setColor(Skia.Color('#FFFFFF'));
  nodeStroke.setStrokeWidth(1.5);
  nodeStroke.setStyle(PaintStyle.Stroke);
  nodeStroke.setAntiAlias(true);

  const label = Skia.Paint();
  label.setColor(Skia.Color('#E2E8F0'));
  label.setAntiAlias(true);

  return { prerequisiteEdge, relatedEdge, contrastEdge, nodeFill, nodeStroke, label };
};
```

### Batched Edge Drawing

Draw all edges of each kind in a single `Skia.Path()` to minimize draw calls:

```ts
// src/features/graph/engine/drawEdgesBatched.ts

export const drawEdgesBatched = (
  canvas: SkCanvas,
  positions: Float32Array,
  edges: RenderableGraphEdge[],
  focusedIndex: number,  // -1 if none
  paints: GraphPaints,
): void => {
  // Separate paths per kind for different paint settings
  const prereqPath = Skia.Path.Make();
  const relatedPath = Skia.Path.Make();
  const contrastPath = Skia.Path.Make();

  for (const edge of edges) {
    const sx = positions[edge.sourceIndex * 2];
    const sy = positions[edge.sourceIndex * 2 + 1];
    const tx = positions[edge.targetIndex * 2];
    const ty = positions[edge.targetIndex * 2 + 1];

    const path = edge.kind === 'prerequisite' ? prereqPath
               : edge.kind === 'related'      ? relatedPath
               : contrastPath;

    path.moveTo(sx, sy);
    path.lineTo(tx, ty);
  }

  // Opacity based on focus — modify paint alpha, restore after
  canvas.drawPath(prereqPath,  paints.prerequisiteEdge);
  canvas.drawPath(relatedPath, paints.relatedEdge);
  canvas.drawPath(contrastPath, paints.contrastEdge);
};
```

Note: `Skia.Path.Make()` allocates a new path object each frame. For ≤ 300 nodes with reasonable edge density (~2x nodes = 600 edges), this is fast. If profiling shows allocation pressure, pre-allocate path objects and call `.reset()` each frame.

### Node Drawing Loop

```ts
export const drawNodes = (
  canvas: SkCanvas,
  positions: Float32Array,
  nodes: GraphNode[],
  mode: GraphMode,
  focusedIndex: number,
  focalIndex: number,   // -1 if full graph
  nowMs: number,
  paints: GraphPaints,
): void => {
  for (let i = 0; i < nodes.length; i++) {
    const x = positions[i * 2];
    const y = positions[i * 2 + 1];
    const node = nodes[i];

    const { fill, radius, strokeColor, strokeWidth } = computeNodeVisual(node, mode, nowMs);

    // Fill
    paints.nodeFill.setColor(Skia.Color(fill));
    canvas.drawCircle(x, y, radius, paints.nodeFill);

    // Stroke
    paints.nodeStroke.setColor(Skia.Color(strokeColor));
    paints.nodeStroke.setStrokeWidth(strokeWidth);
    canvas.drawCircle(x, y, radius, paints.nodeStroke);

    // Focus halo
    if (i === focusedIndex) {
      paints.nodeStroke.setColor(Skia.Color('#FFFFFF80'));
      paints.nodeStroke.setStrokeWidth(2);
      canvas.drawCircle(x, y, radius + 6, paints.nodeStroke);
    }

    // Focal halo (ego view center)
    if (i === focalIndex && i !== focusedIndex) {
      paints.nodeStroke.setColor(Skia.Color('#FFFFFF55'));
      paints.nodeStroke.setStrokeWidth(1.5);
      canvas.drawCircle(x, y, radius + 4, paints.nodeStroke);
    }
  }
};
```

---

## Manual Hit Testing

Because nodes are drawn imperatively (not React components), tap events cannot use `onPress`. Instead, hit testing is done in the gesture handler worklet:

```ts
// Convert screen coordinates to graph coordinates
const toGraphCoords = (screenX: number, screenY: number): [number, number] => {
  'worklet';
  return [
    (screenX - translateX.value) / scale.value,
    (screenY - translateY.value) / scale.value,
  ];
};

const hitTest = (screenX: number, screenY: number): number => {
  'worklet';
  const positions = nodePositions.value;
  const [gx, gy] = toGraphCoords(screenX, screenY);
  let bestIndex = -1;
  let bestDist = Infinity;

  for (let i = 0; i < positions.length / 2; i++) {
    const dx = gx - positions[i * 2];
    const dy = gy - positions[i * 2 + 1];
    const dist = Math.sqrt(dx * dx + dy * dy);
    // nodeRadii is a Float32Array with per-node radius — pre-built from nodeVisuals
    if (dist < nodeRadii[i] && dist < bestDist) {
      bestDist = dist;
      bestIndex = i;
    }
  }
  return bestIndex; // -1 if miss
};
```

`nodeRadii` is a `Float32Array` built once after layout from `computeNodeVisual` for the current mode. It must be rebuilt when the visual mode changes (since Strength mode has variable radii).

---

## Gestures

File: `src/features/graph/ui/GraphCanvas.tsx` (gesture setup section)

All gestures use `react-native-gesture-handler` v2 API.

```ts
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

const panGesture = Gesture.Pan()
  .onUpdate((e) => {
    'worklet';
    translateX.value = savedTX.value + e.translationX;
    translateY.value = savedTY.value + e.translationY;
    // Panning dismisses tooltip
    if (tooltipVisible.value) {
      tooltipVisible.value = false;
    }
  })
  .onEnd(() => {
    'worklet';
    savedTX.value = translateX.value;
    savedTY.value = translateY.value;
  });

const pinchGesture = Gesture.Pinch()
  .onUpdate((e) => {
    'worklet';
    scale.value = Math.max(0.3, Math.min(3.0, savedScale.value * e.scale));
  })
  .onEnd(() => {
    'worklet';
    savedScale.value = scale.value;
  });

// Double-tap detection via timestamp delta
const lastTapTime = useSharedValue(0);
const lastTapIndex = useSharedValue(-1);

const tapGesture = Gesture.Tap().onEnd((e) => {
  'worklet';
  const now = Date.now();
  const hitIndex = hitTest(e.absoluteX, e.absoluteY);

  if (hitIndex === -1) {
    // Miss — clear focus
    focusedIndex.value = -1;
    tooltipVisible.value = false;
    return;
  }

  const isDoubleTap = (now - lastTapTime.value < 300) && (lastTapIndex.value === hitIndex);
  lastTapTime.value = now;
  lastTapIndex.value = hitIndex;

  if (isDoubleTap) {
    runOnJS(onNodeDoubleTap)(hitIndex);
  } else {
    focusedIndex.value = hitIndex;
    tooltipVisible.value = false;
  }
});

const longPressGesture = Gesture.LongPress()
  .minDuration(500)
  .onStart((e) => {
    'worklet';
    const hitIndex = hitTest(e.absoluteX, e.absoluteY);
    if (hitIndex !== -1) {
      runOnJS(onNodeLongPress)(hitIndex, e.absoluteX, e.absoluteY);
    }
  });

const composed = Gesture.Simultaneous(
  Gesture.Simultaneous(panGesture, pinchGesture),
  Gesture.Exclusive(longPressGesture, tapGesture)
);
```

Scale bounds: `[0.3, 3.0]`. No hard bounds on pan.

---

## Graph Views

### Full Graph

**When shown:** Navigate to `GraphScreen` with no `focalConceptId`.

**Node selection:**
1. Load all concepts (id, name, concept_type, familiarity_score, importance_score, last_accessed_at, prerequisites_json, related_concepts_json, contrast_concepts_json).
2. Compute `strength = computeStrength(familiarity_score, importance_score)` for each.
3. Sort by `strength DESC`, tie-break `created_at ASC`.
4. Take first 300. If `total > 300`, set `cappedAt = 300`.
5. Build edges among the 300 selected nodes (cross-edges to excluded nodes silently dropped).
6. Run layout.

**Cap banner** (when `cappedAt` non-null):
> "Showing 300 of {totalConceptCount} concepts · Strongest first"

### Ego View

**When shown:** Navigate to `GraphScreen({ focalConceptId: conceptId })`.

**Node selection:**
1. Load all concepts (same columns).
2. Find focal concept. If not found → navigate back, show toast "Concept no longer exists".
3. Direct neighbors: collect all concept IDs in focal's relationship arrays.
4. Reverse neighbors: scan all concepts for those listing focal in their relationship arrays (linear scan, acceptable up to 500 concepts).
5. Neighbor priority:
   - Tier 1: prerequisites of focal
   - Tier 2: related concepts of focal
   - Tier 3: contrast concepts of focal
   - Tier 4: reverse-edge concepts
   - Within each tier: sort by `strength DESC`
6. Select top 39 neighbors (focal = 1 guaranteed → 40 total max).
7. Build edges. Run layout with focal pinned at center.

**"View Full Graph" link** — shown below the mode bar in ego view. Navigates to `GraphScreen` with no `focalConceptId`.

---

## Query Layer

File: `src/features/graph/data/graphKeys.ts`

```ts
export const graphKeys = {
  all:  ['graph'] as const,
  full: ()                       => [...graphKeys.all, 'full'] as const,
  ego:  (conceptId: ConceptId)   => [...graphKeys.all, 'ego', conceptId] as const,
} as const;
```

### `useFullGraph`

File: `src/features/graph/hooks/useFullGraph.ts`

```ts
export const useFullGraph = (opts: { enabled?: boolean } = {}): UseQueryResult<GraphData> =>
  useQuery({
    queryKey: graphKeys.full(),
    queryFn: fetchFullGraphData,
    staleTime: 30_000,
    gcTime:    5 * 60_000,
    enabled: opts.enabled ?? true,
  });
```

### `useEgoGraph`

File: `src/features/graph/hooks/useEgoGraph.ts`

```ts
export const useEgoGraph = (opts: { conceptId: ConceptId; enabled?: boolean }): UseQueryResult<GraphData> =>
  useQuery({
    queryKey: graphKeys.ego(opts.conceptId),
    queryFn:  () => fetchEgoGraphData(opts.conceptId),
    staleTime: 30_000,
    gcTime:    5 * 60_000,
    enabled: opts.enabled ?? true,
  });
```

### Error Types

```ts
export class GraphFocalNotFoundError extends Error {
  constructor(conceptId: ConceptId) {
    super(`Graph ego view: focal concept ${conceptId} not found`);
    this.name = 'GraphFocalNotFoundError';
  }
}
```

---

## Navigation Contract

### `GraphScreenParams`

```ts
export type GraphScreenParams = {
  focalConceptId?: ConceptId;
  initialMode?: GraphMode;  // default: 'structure'
};
```

### Entry Points

**1. ConceptCardFull → Ego View**

Stage 3 defines `onViewGraph: () => void`. Wired by the screen hosting `ConceptCardFull` (not by the component itself):

```ts
onViewGraph={() =>
  navigation.push('Graph', { focalConceptId: concept.id, initialMode: 'structure' })
}
```

**2. Learning Hub → Full Graph**

```ts
navigation.push('Graph', { initialMode: 'structure' });
```

---

## Components

### `GraphScreen`

File: `src/features/graph/ui/GraphScreen.tsx`

Orchestrates data, layout, and overlay UI. Renders the Skia canvas and all React Native overlays.

```ts
// Local state — layout result and interaction state
const [layoutResult, setLayoutResult] = useState<LayoutResult | null>(null);
const [isLayingOut, setIsLayingOut] = useState(false);
const [mode, setMode] = useState<GraphMode>(initialMode ?? 'structure');

// Shared values for Skia canvas
const nodePositions = useSharedValue<Float32Array>(new Float32Array(0));
const focusedIndex  = useSharedValue<number>(-1);
const tooltipVisible = useSharedValue(false);
```

Layout trigger:

```ts
useEffect(() => {
  if (!graphData || canvasDimensions.width === 0) return;
  setIsLayingOut(true);

  // Run in next tick to let loading indicator render first
  requestAnimationFrame(() => {
    const result = runForceLayout(graphData.nodes, graphData.edges, {
      width: canvasDimensions.width,
      height: canvasDimensions.height,
      focalConceptId: graphData.focalConceptId ?? undefined,
    });
    setLayoutResult(result);
    nodePositions.value = result.positionBuffer;
    setIsLayingOut(false);
  });
}, [graphData, canvasDimensions]);
```

The layout `useEffect` triggers on `graphData` change and `canvasDimensions` change (> 20dp threshold). It does NOT trigger on mode change.

Callbacks bridging UI thread → JS thread for navigation:

```ts
const onNodeDoubleTap = useCallback((index: number) => {
  const node = layoutResult?.nodes[index];
  if (!node) return;
  navigation.push('ConceptDetail', { conceptId: node.id });
}, [layoutResult, navigation]);

const onNodeLongPress = useCallback((index: number, screenX: number, screenY: number) => {
  setTooltipState({ nodeIndex: index, screenX, screenY });
}, []);
```

### `GraphCanvas`

File: `src/features/graph/ui/GraphCanvas.tsx`

Renders the Skia `<Canvas>` with the `onDraw` worklet and `GestureDetector` wrapping it.

Props:

```ts
interface GraphCanvasProps {
  layoutResult: LayoutResult;
  mode: GraphMode;
  nowMs: number;
  focusedIndex: SharedValue<number>;
  tooltipVisible: SharedValue<boolean>;
  nodePositions: SharedValue<Float32Array>;
  focalIndex: number;          // -1 in full graph, node index in ego view
  onNodeDoubleTap: (index: number) => void;
  onNodeLongPress: (index: number, screenX: number, screenY: number) => void;
  onCanvasMiss: () => void;    // tap hit nothing — clear focus
}
```

This component owns all gesture handlers, the `onDraw` worklet, and the pre-allocated paint objects.

### `NodePreviewTooltip`

File: `src/features/graph/ui/NodePreviewTooltip.tsx`

React Native overlay. Positioned absolutely using `screenX`, `screenY` from long-press coordinates (clamped to screen bounds). NOT inside Skia canvas — unaffected by pan/zoom.

```ts
interface NodePreviewTooltipProps {
  node: GraphNode;
  screenX: number;
  screenY: number;
  mode: GraphMode;
  nowMs: number;
  onDismiss: () => void;
  onOpenDetail: (conceptId: ConceptId) => void;
}
```

**Content by mode:**

*All modes:*
- Concept name (bold, 2-line max)
- `ConceptTypeChip` (Stage 3 shared primitive — reuse as-is)

*Structure:* prerequisite count ("Requires N prerequisites" or nothing if 0)

*Recency:* "Last accessed: N days ago" or "Never accessed via Dot Connector"

*Strength:* horizontal strength bar (colored per `getStrengthColor`); "Familiarity: N% · Importance: N%"

*Footer:* "View detail →" → calls `onOpenDetail`, dismisses tooltip.

**Dismissal:** pan begins, tap canvas background, "View detail" tapped, new long-press on different node.

### `GraphModeBar`

File: `src/features/graph/ui/GraphModeBar.tsx`

```ts
interface GraphModeBarProps {
  currentMode: GraphMode;
  onModeChange: (mode: GraphMode) => void;
}
```

Three tabs: "Structure" | "Recency" | "Strength". Mode switch is instant — no loading, no layout re-run.

### `GraphLegend`

File: `src/features/graph/ui/GraphLegend.tsx`

```ts
interface GraphLegendProps {
  mode: GraphMode;
  presentConceptTypes: ConceptType[];
}
```

Collapsible panel, collapsed by default. Anchored to bottom of screen above safe area inset.

- **Structure:** color chips for each present `ConceptType` + edge style legend (solid/dashed/dotted)
- **Recency:** gradient bar with time labels
- **Strength:** gradient bar with % labels + two node size examples (smallest, largest)

---

## Loading & Empty States

**Data loading** (`useQuery` pending): activity indicator centered on screen. Mode bar shown (greyed out). No skeleton graph.

**Layout computing** (`isLayingOut = true`): small spinner overlay on the canvas area. Different from data loading — mode bar is active (user can see they're about to get the graph).

**Empty state** (0 concepts):
```
[graph icon]
No concepts yet

Concepts appear here once you promote captures.
Tap "Promote to Concept" from any capture detail.
```
Tapping navigates to Learning Hub.

**Isolated node** (concept with no edges): single node renders at canvas center with random jitter from D3 initial conditions. Valid state, no message.

---

## Interaction Model Summary

| Gesture | Target | Result |
|---------|--------|--------|
| Tap — canvas background | Canvas | Clears `focusedIndex`, dismisses tooltip |
| Tap — node | Node | `focusedIndex = hit`. Connecting edges → opacity 1.0, others → 0.2 |
| Double-tap — node | Node | Navigate to ConceptCardFull. Clears state first |
| Long-press — node | Node | Show `NodePreviewTooltip` at screen position |
| "View detail" in tooltip | Tooltip | Navigate to ConceptCardFull. Dismiss tooltip |
| Pan | Canvas | Translate graph. Dismiss tooltip. |
| Pinch | Canvas | Zoom [0.3, 3.0]. Dismiss tooltip. |
| "View Full Graph" | Ego link | Navigate to GraphScreen (full graph, same mode) |

Focus and tooltip are independent states. A user can have focus on node A while the tooltip shows node B.

---

## Error Handling

| Error | Handling |
|-------|----------|
| DB query throws | Query error state → full-screen error with "Try again" refetch button |
| `GraphFocalNotFoundError` | Navigate back + toast "Concept no longer exists" |
| Layout durationMs > 400ms (≤ 80 nodes) | `console.warn` — no UI change |
| Layout durationMs > 800ms (> 80 nodes) | `console.warn` — no UI change (spinner already shown) |
| `Float32Array` position is `NaN` | Skip drawing that node in the loop. `console.warn` with index |
| Zod codec failure on relationship JSON | Loud throw — error propagates to `useQuery`, shows error screen. No partial graph |
| Skia `onDraw` exception | Skia swallows render errors silently; add a `try/catch` around the draw body in dev mode that logs to console |

---

## File Structure

```
src/features/graph/
├── types.ts                         — all graph types
├── data/
│   ├── graphKeys.ts                 — TanStack query key factory
│   └── graphQueries.ts              — fetchFullGraphData, fetchEgoGraphData
├── engine/
│   ├── layout.ts                    — runForceLayout, buildPositionBuffer, buildNodeIndexMap, adaptiveTicks
│   ├── edgeBuilder.ts               — buildEdges
│   ├── visualEncoding.ts            — computeNodeVisual, computeEdgeVisual, color/radius helpers
│   └── drawEdgesBatched.ts          — drawEdgesBatched, drawArrowheads, drawNodes, drawLabels
├── hooks/
│   ├── useFullGraph.ts
│   └── useEgoGraph.ts
└── ui/
    ├── GraphScreen.tsx
    ├── GraphCanvas.tsx              — Skia Canvas + GestureDetector + onDraw worklet
    ├── graphPaints.ts               — pre-allocated Skia Paint objects
    ├── NodePreviewTooltip.tsx       — React Native overlay
    ├── GraphModeBar.tsx             — segmented control
    └── GraphLegend.tsx              — collapsible legend
```

No `GraphNodeCircle.tsx` or `GraphEdgeLine.tsx` — nodes and edges are drawn imperatively, not as React components.

---

## Deliverables

1. `src/features/graph/types.ts`
2. `src/features/graph/data/graphKeys.ts`
3. `src/features/graph/data/graphQueries.ts`
   - `fetchFullGraphData(): Promise<GraphData>`
   - `fetchEgoGraphData(conceptId: ConceptId): Promise<GraphData>`
4. `src/features/graph/engine/layout.ts`
   - `runForceLayout`, `buildPositionBuffer`, `buildNodeIndexMap`, `adaptiveTicks`
5. `src/features/graph/engine/edgeBuilder.ts`
   - `buildEdges(nodeIds, concepts): GraphEdge[]`
   - `toRenderableEdges(edges, nodeIndexMap): RenderableGraphEdge[]`
6. `src/features/graph/engine/visualEncoding.ts`
   - `computeNodeVisual`, `computeEdgeVisual`, `CONCEPT_TYPE_COLORS`
   - `getRecencyColor`, `getStrengthColor`, `getStrengthRadius`
   - `lerpColor(from: string, to: string, t: number): string`
7. `src/features/graph/engine/drawEdgesBatched.ts`
   - `drawEdgesBatched`, `drawArrowheads`, `drawNodes`, `drawLabels`
8. `src/features/graph/hooks/useFullGraph.ts`
9. `src/features/graph/hooks/useEgoGraph.ts`
10. `src/features/graph/ui/GraphScreen.tsx`
11. `src/features/graph/ui/GraphCanvas.tsx`
12. `src/features/graph/ui/graphPaints.ts`
13. `src/features/graph/ui/NodePreviewTooltip.tsx`
14. `src/features/graph/ui/GraphModeBar.tsx`
15. `src/features/graph/ui/GraphLegend.tsx`
16. Tests:
    - `src/features/graph/__tests__/edgeBuilder.test.ts`
    - `src/features/graph/__tests__/layout.test.ts`
    - `src/features/graph/__tests__/visualEncoding.test.ts`
    - `src/features/graph/__tests__/graphQueries.test.ts`

---

## Tests

### `edgeBuilder.test.ts`

```ts
describe('buildEdges', () => {
  test('prerequisite: sourceId = prerequisite, targetId = concept');
  test('related: canonical min→max; mutual listing = one edge');
  test('contrast: canonical min→max; mutual listing = one edge');
  test('prerequisite + related between same pair → two separate edges');
  test('cross-edge to excluded node is silently dropped');
  test('empty arrays → no edges');
  test('edge IDs are deterministic');
})

describe('toRenderableEdges', () => {
  test('sourceIndex and targetIndex populated from NodeIndexMap');
  test('throws (via !) if a ConceptId is not in the map — indicates stale edge set');
  test('output length equals input length — no edges added or dropped');
})
```

### `layout.test.ts`

```ts
describe('runForceLayout', () => {
  test('all nodes have finite x, y after layout');
  test('position buffer has correct length (N * 2)');
  test('position buffer values match node x/y');
  test('focal node is pinned at center (fx, fy set)');
  test('original GraphNode objects are not mutated');
  test('adaptiveTicks tiers: 40→300, 80→250, 150→200, 300→150');
})

describe('buildPositionBuffer', () => {
  test('buffer length = nodes.length * 2');
  test('buffer[i*2] = node[i].x, buffer[i*2+1] = node[i].y');
})
```

### `visualEncoding.test.ts`

```ts
describe('computeNodeVisual', () => {
  test('structure: each ConceptType maps to its assigned color');
  test('structure: radius is always 14');
  test('recency: age < 7 days → orange');
  test('recency: null lastAccessedAt → slate');
  test('strength: radius 8 for strength=0, 26 for strength=1');
  test('strength: color red for strength=0, green for strength=1');
  test('unknown conceptType falls back and warns');
})

describe('lerpColor', () => {
  test('t=0 returns from, t=1 returns to, t=0.5 is mid');
})

describe('computeEdgeVisual', () => {
  test('prerequisite: hasArrow=true, solid stroke');
  test('related: hasArrow=false, dashIntervals=[6,4]');
  test('contrast: hasArrow=false, dashIntervals=[2,3]');
})
```

### `graphQueries.test.ts`

```ts
describe('fetchFullGraphData', () => {
  test('returns at most 300 nodes');
  test('cappedAt=300 when total > 300, null otherwise');
  test('sorted by strength DESC, created_at ASC');
  test('edges reference only nodes in the set');
  test('isEgoView=false, focalConceptId=null');
  test('totalConceptCount = actual DB count');
})

describe('fetchEgoGraphData', () => {
  test('focal concept always present');
  test('returns at most 40 nodes');
  test('throws GraphFocalNotFoundError for missing concept');
  test('neighbor priority: prerequisites > related > contrast > reverse');
  test('isEgoView=true, focalConceptId=input');
  test('reverse-edge concepts included in candidates');
})
```

---

## Acceptance Criteria

### AC-1: Concept-only graph
No capture-derived nodes. Every node is a row from `concepts` table.

### AC-2: Three visual modes are distinct and instant
Mode switch completes within one frame. No loading, no layout re-run. Verified by toggling rapidly between all three modes with 100+ nodes.

### AC-3: Structure mode coloring
Each `concept_type` renders its fixed color from `CONCEPT_TYPE_COLORS`. Uniform 14dp radius.

### AC-4: Recency mode coloring
Concept accessed 3 days ago → orange (`#F97316`). Concept with `last_accessed_at = null` → grey (`#94A3B8`).

### AC-5: Strength mode — proportional radius
Strength 0 → 8dp. Strength 1 → 26dp. Intermediate proportional.

### AC-6: Edge kinds are visually distinct
Prerequisite: solid + arrowhead. Related: dashed. Contrast: dotted. Arrowhead only on prerequisite edges.

### AC-7: Edge deduplication
Mutual `related_concepts_json` listing → ONE rendered edge between the pair.

### AC-8: Prerequisite direction
Concept A with `prerequisites_json = [B]` → arrowhead at A (B enables A).

### AC-9: Full graph cap
100 concepts in DB → at most 300 nodes rendered. (With ≤ 100 concepts, cappedAt is null, no banner.)
300+ concepts in DB → cap banner visible: "Showing 300 of N · Strongest first".

### AC-10: Ego cap
40 nodes maximum in ego view. Focal concept always present.

### AC-11: Ego view centering
Opening from ConceptCardFull → focal concept at canvas center, pinned during layout.

### AC-12: 60fps pan and zoom
Pan and pinch-to-zoom maintain 60fps with 300 nodes + 600 edges. Verified via Flipper/Perfetto frame timeline — no frame exceeding 16.7ms during continuous pan.

### AC-13: Long-press tooltip
Long-pressing a node shows `NodePreviewTooltip` with correct mode-appropriate content. "View detail" navigates to ConceptCardFull.

### AC-14: Double-tap navigation
Double-tapping a node navigates to ConceptCardFull for that concept.

### AC-15: Tap to focus
Single-tap selects a node. Connecting edges → opacity 1.0. Others → opacity 0.2.

### AC-16: Pan dismisses tooltip
Active tooltip disappears when pan begins.

### AC-17: Empty state
Zero concepts → empty state message, not blank canvas or error.

### AC-18: `onViewGraph` entry point unchanged
Stage 3's `onViewGraph: () => void` prop contract is not modified. Wired by caller screen only.

### AC-19: `last_accessed_at` not mutated
After any graph interaction (open, pan, zoom, tap, long-press, double-tap), `last_accessed_at` on all concepts in DB is unchanged.

### AC-20: Codec failure is loud
Malformed `related_concepts_json` → Zod codec throws → useQuery error state → error screen shown. No partial graph with silent empty edges.

---

## Anti-Regression Rules

<anti_regression_rules>

**Stage 1:**
- `computeStrength` imported from `src/features/learning/strength/computeStrength.ts`. Never redefined or duplicated in `src/features/graph/`.
- Relationship arrays decoded only via Stage 1 Zod codecs. Never access raw JSON strings.
- `ConceptId` brand preserved throughout. No raw string where `ConceptId` is expected.

**Stage 3:**
- `ConceptCardFull` prop interface NOT modified. `onViewGraph: () => void` stays exactly as Stage 3 defined it.
- Graph navigation wired by caller screens, not by `ConceptCardFull`.
- `ConceptTypeChip` from Stage 3 shared primitives reused in `NodePreviewTooltip`. Do not create a duplicate chip in `src/features/graph/`.

**Stage 6:**
- `last_accessed_at` is read-only in this stage. No UPDATE on this column in any `src/features/graph/` file.
- Hot/cold tier system irrelevant to graph. `embeddings_vec` is never queried here.
- `computeStrengthFactor` (Stage 6 retrieval ranking) ≠ visual strength encoding. They use the same underlying function but serve different purposes and must not be conflated.

**Stage 7:**
- `familiarity_score` and `importance_score` read-only. `applyReviewRating` remains sole update path.

**Stage 8:**
- Bookmarks not rendered in graph. They are file-level annotations, not knowledge graph objects.
- Personas have no effect on graph data or rendering.

**Graph-specific:**
- `learning_captures` table is NEVER queried in `src/features/graph/data/`.
- D3-force MUST use `.stop().tick(N)`. Never `.on('tick', callback)` in React Native — it starts a RAF loop.
- Node positions MUST be in `SharedValue<Float32Array>`. Never in `useState` or `useReducer`.
- Visual mode switch MUST NOT trigger `useQuery` refetch. Mode is local state only.
- Layout result MUST be in local component state (`useState`). NOT in TanStack cache — positions are screen-size-dependent and must not be shared or cached across screen instances.
- `d3-force` is the ONLY D3 sub-package installed. Never add `d3`, `d3-scale`, `d3-interpolate`, or other D3 sub-packages — they bring DOM shims and bundle bloat.
- Never use `react-native-svg` for graph elements. It was explicitly rejected as too slow for 300 nodes.
- Pre-allocate Skia Paint objects at initialization. Never `Skia.Paint()` inside the `onDraw` worklet.
</anti_regression_rules>

---

## Open Questions

🟡 **OQ-1 — Animated layout convergence:** Current spec uses synchronous layout (`.stop().tick(N)`) — user sees the final stable graph, not nodes flying into place. An animated approach (tick in `useFrameCallback`, copy positions each frame) would show the settling animation. Decide based on UX testing.

🟡 **OQ-2 — Ego expand on tap:** When tapping a neighbor node in ego view — expand to that node's ego (new screen), or replace current ego in-place? Current spec: double-tap always opens ConceptCardFull. Tap only focuses. Expansion requires explicit navigation. Revisit after user testing.

🟡 **OQ-3 — Concept-type filter layer:** Hide/show nodes by `concept_type` (e.g., "show only patterns"). Deferred — no filter UI in Phase 1.

🟡 **OQ-4 — Layout position caching:** Store D3 positions in AsyncStorage keyed by `(sorted node IDs, screen dimensions hash)` to avoid re-layout on every screen mount. Implement only after measuring real layout duration on devices.

🟡 **OQ-5 — 300-node selection strategy:** Currently strongest-first. Hub-node selection (most edges) or recency-weighted hybrid could surface more relevant concepts for active users. Measure first.

🟡 **OQ-6 — Relationship editing:** Natural Stage 10+ feature: add/remove edges from within the graph. Not in scope here.

🔒 **D-1** — Captures are NOT graph nodes.
🔒 **D-2** — `last_accessed_at` is read-only in Stage 9.
🔒 **D-3** — D3-force synchronous tick (`.stop().tick(N)`). No RAF loop.
🔒 **D-4** — Visual mode switch does NOT reload GraphData or re-run layout.
🔒 **D-5** — Full graph cap: 300. Ego cap: 40.
🔒 **D-6** — `@shopify/react-native-skia` is the rendering backend. No SVG, no WebView.
🔒 **D-7** — Node positions in `SharedValue<Float32Array>`. No React state for positions.
🔒 **D-8** — All edges in one batched Skia Path per kind per frame.
