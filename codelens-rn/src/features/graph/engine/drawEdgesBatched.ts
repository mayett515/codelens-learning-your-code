import type {
  SkCanvas,
  SkFont,
  SkPath,
} from '@shopify/react-native-skia';
import { Skia as NativeSkia } from '@shopify/react-native-skia';
import { computeEdgeVisual, computeNodeVisual } from './visualEncoding';
import { setPaintColor, type GraphPaints } from '../ui/graphPaints';
import type { EdgeKind, GraphMode, LayoutResult, RenderableGraphEdge } from '../types';

type SkiaApi = typeof NativeSkia;

interface DrawOptions {
  mode: GraphMode;
  nowMs: number;
  focusedIndex?: number;
}

const EDGE_KINDS: EdgeKind[] = ['prerequisite', 'related', 'contrast'];
const ARROW_BASE = 6;
const ARROW_HEIGHT = 9;

export function drawEdgesBatched(
  canvas: SkCanvas,
  skia: SkiaApi,
  layout: LayoutResult,
  paints: GraphPaints,
  options: DrawOptions,
): void {
  const paths = createEdgePaths(skia, layout);
  const arrowheads = createArrowheadPath(skia, layout, options);
  const hasFocus = options.focusedIndex !== undefined && options.focusedIndex >= 0;

  for (const kind of EDGE_KINDS) {
    const path = paths[kind];
    if (path.isEmpty()) continue;
    const paint = paints.edge[kind];
    paint.setAlphaf(hasFocus ? 0.2 : 0.65);
    canvas.drawPath(path, paint);
  }

  if (!arrowheads.isEmpty()) {
    paints.arrow.setAlphaf(hasFocus ? 0.2 : 0.65);
    canvas.drawPath(arrowheads, paints.arrow);
  }
}

export function drawNodes(
  canvas: SkCanvas,
  skia: SkiaApi,
  layout: LayoutResult,
  paints: GraphPaints,
  options: DrawOptions,
): void {
  layout.nodes.forEach((node, index) => {
    const x = layout.positionBuffer[index * 2];
    const y = layout.positionBuffer[index * 2 + 1];
    if (!isFiniteCoordinate(x, y, index)) return;

    const visual = computeNodeVisual(node, options.mode, options.nowMs);
    setPaintColor(skia, paints.nodeFill, visual.fill);
    paints.nodeFill.setAlphaf(1);
    canvas.drawCircle(x, y, visual.radius, paints.nodeFill);

    setPaintColor(skia, paints.nodeStroke, visual.strokeColor);
    paints.nodeStroke.setStrokeWidth(visual.strokeWidth);
    paints.nodeStroke.setAlphaf(1);
    canvas.drawCircle(x, y, visual.radius, paints.nodeStroke);
  });
}

export function drawLabels(
  canvas: SkCanvas,
  skia: SkiaApi,
  layout: LayoutResult,
  paints: GraphPaints,
  font: SkFont,
  options: DrawOptions,
): void {
  layout.nodes.forEach((node, index) => {
    const x = layout.positionBuffer[index * 2];
    const y = layout.positionBuffer[index * 2 + 1];
    if (!isFiniteCoordinate(x, y, index)) return;

    const visual = computeNodeVisual(node, options.mode, options.nowMs);
    setPaintColor(skia, paints.label, '#E5E7EB');
    paints.label.setAlphaf(0.9);
    canvas.drawText(node.name, x + visual.radius + 5, y + 4, paints.label, font);
  });
}

export function createEdgePaths(
  skia: SkiaApi,
  layout: LayoutResult,
): Record<EdgeKind, SkPath> {
  const paths = {
    prerequisite: skia.Path.Make(),
    related: skia.Path.Make(),
    contrast: skia.Path.Make(),
  };

  for (const edge of layout.edges) {
    const points = edgePoints(layout, edge);
    if (!points) continue;
    const visual = computeEdgeVisual(edge.kind);
    if (visual.dashIntervals) {
      addDashedLine(paths[edge.kind], points.x1, points.y1, points.x2, points.y2, visual.dashIntervals);
    } else {
      paths[edge.kind].moveTo(points.x1, points.y1).lineTo(points.x2, points.y2);
    }
  }

  return paths;
}

function createArrowheadPath(
  skia: SkiaApi,
  layout: LayoutResult,
  options: DrawOptions,
): SkPath {
  const path = skia.Path.Make();

  for (const edge of layout.edges) {
    if (edge.kind !== 'prerequisite') continue;
    const points = edgePoints(layout, edge);
    if (!points) continue;

    const targetNode = layout.nodes[edge.targetIndex];
    const targetVisual = computeNodeVisual(targetNode, options.mode, options.nowMs);
    const angle = Math.atan2(points.y2 - points.y1, points.x2 - points.x1);
    const tipX = points.x2 - Math.cos(angle) * targetVisual.radius;
    const tipY = points.y2 - Math.sin(angle) * targetVisual.radius;
    const baseX = tipX - Math.cos(angle) * ARROW_HEIGHT;
    const baseY = tipY - Math.sin(angle) * ARROW_HEIGHT;
    const perpendicular = angle + Math.PI / 2;
    const leftX = baseX + Math.cos(perpendicular) * (ARROW_BASE / 2);
    const leftY = baseY + Math.sin(perpendicular) * (ARROW_BASE / 2);
    const rightX = baseX - Math.cos(perpendicular) * (ARROW_BASE / 2);
    const rightY = baseY - Math.sin(perpendicular) * (ARROW_BASE / 2);

    path.moveTo(tipX, tipY).lineTo(leftX, leftY).lineTo(rightX, rightY).close();
  }

  return path;
}

function edgePoints(
  layout: LayoutResult,
  edge: RenderableGraphEdge,
): { x1: number; y1: number; x2: number; y2: number } | null {
  const x1 = layout.positionBuffer[edge.sourceIndex * 2];
  const y1 = layout.positionBuffer[edge.sourceIndex * 2 + 1];
  const x2 = layout.positionBuffer[edge.targetIndex * 2];
  const y2 = layout.positionBuffer[edge.targetIndex * 2 + 1];
  if (!isFiniteCoordinate(x1, y1, edge.sourceIndex)) return null;
  if (!isFiniteCoordinate(x2, y2, edge.targetIndex)) return null;
  return { x1, y1, x2, y2 };
}

function addDashedLine(
  path: SkPath,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  dashIntervals: number[],
): void {
  const [dashLength, gapLength] = dashIntervals;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy);
  if (length === 0) return;

  const unitX = dx / length;
  const unitY = dy / length;
  let distance = 0;
  while (distance < length) {
    const start = distance;
    const end = Math.min(distance + dashLength, length);
    path
      .moveTo(x1 + unitX * start, y1 + unitY * start)
      .lineTo(x1 + unitX * end, y1 + unitY * end);
    distance += dashLength + gapLength;
  }
}

function isFiniteCoordinate(x: number, y: number, index: number): boolean {
  const isFinitePair = Number.isFinite(x) && Number.isFinite(y);
  if (!isFinitePair) {
    console.warn(`[Graph] Skipping node with invalid position at index ${index}`);
  }
  return isFinitePair;
}
