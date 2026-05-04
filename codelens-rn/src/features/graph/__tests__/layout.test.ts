import { describe, expect, it } from 'vitest';
import {
  adaptiveTicks,
  buildNodeIndexMap,
  buildPositionBuffer,
  runForceLayout,
} from '../engine/layout';
import type { ConceptId } from '@/src/features/learning';
import type { GraphEdge, GraphNode, PositionedNode } from '../types';

function id(value: string): ConceptId {
  return value as ConceptId;
}

const conceptA = id('c_111111111111111111111');
const conceptB = id('c_222222222222222222222');
const conceptC = id('c_333333333333333333333');

function node(id: ConceptId, overrides: Partial<GraphNode> = {}): GraphNode {
  return {
    id,
    name: id,
    typeNodeId: 'mechanism',
    familiarityScore: 0.5,
    importanceScore: 0.5,
    lastAccessedAt: null,
    strength: 0.5,
    ...overrides,
  };
}

function edge(sourceId: ConceptId, targetId: ConceptId): GraphEdge {
  return {
    id: `${sourceId}__related__${targetId}`,
    sourceId,
    targetId,
    kind: 'related',
  };
}

describe('Stage 9B graph layout', () => {
  it('uses locked adaptive tick tiers', () => {
    expect(adaptiveTicks(40)).toBe(300);
    expect(adaptiveTicks(80)).toBe(250);
    expect(adaptiveTicks(150)).toBe(200);
    expect(adaptiveTicks(300)).toBe(150);
    expect(adaptiveTicks(301)).toBe(150);
  });

  it('builds position buffer with x/y pairs', () => {
    const nodes: PositionedNode[] = [
      { ...node(conceptA), x: 10, y: 20 },
      { ...node(conceptB), x: 30, y: 40 },
    ];

    const buffer = buildPositionBuffer(nodes);

    expect(buffer).toBeInstanceOf(Float32Array);
    expect([...buffer]).toEqual([10, 20, 30, 40]);
  });

  it('builds a ConceptId to buffer-index map', () => {
    const map = buildNodeIndexMap([node(conceptA), node(conceptB)]);

    expect(map.get(conceptA)).toBe(0);
    expect(map.get(conceptB)).toBe(1);
  });

  it('positions all nodes with finite x/y values and renderable edge indices', () => {
    const result = runForceLayout(
      [node(conceptA), node(conceptB), node(conceptC)],
      [edge(conceptA, conceptB), edge(conceptB, conceptC)],
      { width: 320, height: 640, ticks: 25 },
    );

    expect(result.nodes).toHaveLength(3);
    expect(result.positionBuffer).toHaveLength(6);
    result.nodes.forEach((positioned) => {
      expect(Number.isFinite(positioned.x)).toBe(true);
      expect(Number.isFinite(positioned.y)).toBe(true);
    });
    expect(result.edges).toEqual([
      expect.objectContaining({ sourceIndex: 0, targetIndex: 1 }),
      expect.objectContaining({ sourceIndex: 1, targetIndex: 2 }),
    ]);
  });

  it('pins the focal node at canvas center for ego layout', () => {
    const result = runForceLayout(
      [node(conceptA), node(conceptB)],
      [edge(conceptA, conceptB)],
      { width: 300, height: 500, ticks: 20, focalConceptId: conceptA },
    );

    const focal = result.nodes[0];
    expect(focal.id).toBe(conceptA);
    expect(focal.x).toBeCloseTo(150, 4);
    expect(focal.y).toBeCloseTo(250, 4);
    expect(focal.fx).toBe(150);
    expect(focal.fy).toBe(250);
  });

  it('does not mutate original GraphNode inputs', () => {
    const original = [node(conceptA), node(conceptB)];
    const before = structuredClone(original);

    runForceLayout(original, [edge(conceptA, conceptB)], { width: 200, height: 200, ticks: 5 });

    expect(original).toEqual(before);
  });
});
