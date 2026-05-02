import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from 'd3-force';
import { toRenderableEdges } from './edgeBuilder';
import type {
  GraphEdge,
  GraphNode,
  LayoutResult,
  NodeIndexMap,
  NodePositionBuffer,
  PositionedNode,
} from '../types';
import type { ConceptId } from '@/src/features/learning';

interface D3Node extends GraphNode, SimulationNodeDatum {
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx: number | null;
  fy: number | null;
}

interface D3Link extends SimulationLinkDatum<D3Node> {
  source: D3Node;
  target: D3Node;
}

interface LayoutOptions {
  width: number;
  height: number;
  ticks?: number;
  focalConceptId?: ConceptId;
}

const TICKS_BY_COUNT: Array<[number, number]> = [
  [40, 300],
  [80, 250],
  [150, 200],
  [300, 150],
];

export function adaptiveTicks(nodeCount: number): number {
  for (const [threshold, ticks] of TICKS_BY_COUNT) {
    if (nodeCount <= threshold) return ticks;
  }
  return 150;
}

export function buildPositionBuffer(nodes: PositionedNode[]): NodePositionBuffer {
  const buffer = new Float32Array(nodes.length * 2);
  nodes.forEach((node, index) => {
    buffer[index * 2] = node.x;
    buffer[index * 2 + 1] = node.y;
  });
  return buffer;
}

export function buildNodeIndexMap(nodes: Pick<GraphNode, 'id'>[]): NodeIndexMap {
  const map: NodeIndexMap = new Map();
  nodes.forEach((node, index) => {
    map.set(node.id, index);
  });
  return map;
}

export function runForceLayout(
  rawNodes: GraphNode[],
  edges: GraphEdge[],
  options: LayoutOptions,
): LayoutResult {
  const startMs = Date.now();
  const { width, height, focalConceptId } = options;
  const ticks = options.ticks ?? adaptiveTicks(rawNodes.length);
  const centerX = width / 2;
  const centerY = height / 2;
  const initialRadius = Math.max(40, Math.min(width, height) * 0.18);

  const nodes: D3Node[] = rawNodes.map((node, index) => {
    const angle = rawNodes.length === 0 ? 0 : (index / rawNodes.length) * Math.PI * 2;
    const isFocal = focalConceptId === node.id;
    return {
      ...node,
      x: centerX + Math.cos(angle) * initialRadius,
      y: centerY + Math.sin(angle) * initialRadius,
      vx: 0,
      vy: 0,
      fx: isFocal ? centerX : null,
      fy: isFocal ? centerY : null,
    };
  });

  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const d3Links: D3Link[] = edges
    .map((edge) => {
      const source = nodeMap.get(edge.sourceId);
      const target = nodeMap.get(edge.targetId);
      if (!source || !target) return null;
      return { source, target };
    })
    .filter((link): link is D3Link => link !== null);

  forceSimulation<D3Node>(nodes)
    .force(
      'link',
      forceLink<D3Node, D3Link>(d3Links)
        .id((node) => node.id)
        .distance(120)
        .strength(0.6),
    )
    .force('charge', forceManyBody<D3Node>().strength(-280))
    .force('center', forceCenter(centerX, centerY).strength(0.05))
    .force('collision', forceCollide<D3Node>().radius((node) => nodeRadius(node) + 8))
    .stop()
    .tick(ticks);

  const positionedNodes: PositionedNode[] = nodes.map((node) => ({
    ...node,
    x: finiteOr(node.x, centerX),
    y: finiteOr(node.y, centerY),
  }));
  const positionBuffer = buildPositionBuffer(positionedNodes);
  const nodeIndexMap = buildNodeIndexMap(positionedNodes);
  const durationMs = Date.now() - startMs;

  if (
    (rawNodes.length <= 80 && durationMs > 400) ||
    (rawNodes.length > 80 && durationMs > 800)
  ) {
    console.warn(`[Graph] Slow layout: ${durationMs}ms for ${rawNodes.length} nodes`);
  }

  return {
    nodes: positionedNodes,
    edges: toRenderableEdges(edges, nodeIndexMap),
    positionBuffer,
    nodeIndexMap,
    durationMs,
  };
}

function nodeRadius(node: GraphNode): number {
  return Number.isFinite(node.strength) ? 8 + 18 * Math.min(1, Math.max(0, node.strength)) : 14;
}

function finiteOr(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}
