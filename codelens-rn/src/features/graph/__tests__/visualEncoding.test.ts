import { describe, expect, it, vi } from 'vitest';
import {
  CONCEPT_TYPE_COLORS,
  computeEdgeVisual,
  computeNodeVisual,
  getRecencyColor,
  getStrengthColor,
  getStrengthRadius,
  lerpColor,
} from '../engine/visualEncoding';
import { codingProfile } from '@/src/features/ontology';
import type { ConceptId } from '@/src/features/learning';
import type { GraphNode } from '../types';

function id(value: string): ConceptId {
  return value as ConceptId;
}

function node(overrides: Partial<GraphNode> = {}): GraphNode {
  return {
    id: id('c_111111111111111111111'),
    name: 'Closure',
    typeNodeId: 'mechanism',
    familiarityScore: 0.5,
    importanceScore: 0.5,
    lastAccessedAt: null,
    strength: 0.5,
    ...overrides,
  };
}

describe('Stage 9A visual encoding', () => {
  it('sources structure colors from the active domain profile', () => {
    expect(CONCEPT_TYPE_COLORS).toBe(codingProfile.graph.nodeColors);
  });

  it('maps structure mode type nodes to locked colors with uniform radius', () => {
    const visual = computeNodeVisual(node({ typeNodeId: 'api_idiom' }), 'structure', Date.now());
    expect(visual.fill).toBe(CONCEPT_TYPE_COLORS.api_idiom);
    expect(visual.radius).toBe(14);
  });

  it('falls back and warns for unknown type nodes', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const visual = computeNodeVisual(
      node({ typeNodeId: 'unknown_type' as never }),
      'structure',
      Date.now(),
    );

    expect(visual.fill).toBe(CONCEPT_TYPE_COLORS.mechanism);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Unknown ontology type node'));
    warn.mockRestore();
  });

  it('colors recency buckets from last_accessed_at without mutation', () => {
    const now = 100 * 86_400_000;
    expect(getRecencyColor(now - 3 * 86_400_000, now)).toBe('#F97316');
    expect(getRecencyColor(now - 14 * 86_400_000, now)).toBe('#FACC15');
    expect(getRecencyColor(now - 45 * 86_400_000, now)).toBe('#60A5FA');
    expect(getRecencyColor(null, now)).toBe('#94A3B8');
  });

  it('uses proportional strength radius and bucketed strength colors', () => {
    expect(getStrengthRadius(0)).toBe(8);
    expect(getStrengthRadius(1)).toBe(26);
    expect(getStrengthColor(0)).toBe('#EF4444');
    expect(getStrengthColor(1)).toBe('#22C55E');
  });

  it('interpolates colors deterministically', () => {
    expect(lerpColor('#000000', '#FFFFFF', 0)).toBe('#000000');
    expect(lerpColor('#000000', '#FFFFFF', 1)).toBe('#FFFFFF');
    expect(lerpColor('#000000', '#FFFFFF', 0.5)).toBe('#808080');
  });

  it('encodes edge kinds with locked visual styles', () => {
    expect(computeEdgeVisual('prerequisite')).toMatchObject({
      strokeColor: '#94A3B8',
      dashIntervals: null,
      hasArrow: true,
    });
    expect(computeEdgeVisual('related')).toMatchObject({
      dashIntervals: [6, 4],
      hasArrow: false,
    });
    expect(computeEdgeVisual('contrast')).toMatchObject({
      dashIntervals: [2, 3],
      hasArrow: false,
    });
  });

  it('computes node visuals for recency and strength modes without re-layout data', () => {
    const now = 100 * 86_400_000;
    expect(computeNodeVisual(node({ lastAccessedAt: now - 3 * 86_400_000 }), 'recency', now).fill).toBe('#F97316');
    expect(computeNodeVisual(node({ strength: 1 }), 'strength', now).radius).toBe(26);
  });
});
