import { describe, expect, it } from 'vitest';
import { buildEdges, toRenderableEdges } from '../engine/edgeBuilder';
import type { ConceptId } from '@/src/features/learning';
import type { GraphEdge, GraphRelationshipConcept } from '../types';

function id(value: string): ConceptId {
  return value as ConceptId;
}

const conceptA = id('c_111111111111111111111');
const conceptB = id('c_222222222222222222222');
const conceptC = id('c_333333333333333333333');
const conceptD = id('c_444444444444444444444');

function concept(
  id: ConceptId,
  overrides: Partial<GraphRelationshipConcept> = {},
): GraphRelationshipConcept {
  return {
    id,
    prerequisites: [],
    relatedConcepts: [],
    contrastConcepts: [],
    ...overrides,
  };
}

describe('Stage 9A edge builder', () => {
  it('directs prerequisite edges from prerequisite to concept', () => {
    const edges = buildEdges(
      new Set([conceptA, conceptB]),
      [concept(conceptA, { prerequisites: [conceptB] }), concept(conceptB)],
    );

    expect(edges).toEqual([
      {
        id: `${conceptB}__prerequisite__${conceptA}`,
        sourceId: conceptB,
        targetId: conceptA,
        kind: 'prerequisite',
      },
    ]);
  });

  it('dedupes mutual related and contrast edges using canonical id order', () => {
    const edges = buildEdges(
      new Set([conceptA, conceptB]),
      [
        concept(conceptA, { relatedConcepts: [conceptB], contrastConcepts: [conceptB] }),
        concept(conceptB, { relatedConcepts: [conceptA], contrastConcepts: [conceptA] }),
      ],
    );

    expect(edges).toEqual([
      {
        id: `${conceptA}__related__${conceptB}`,
        sourceId: conceptA,
        targetId: conceptB,
        kind: 'related',
      },
      {
        id: `${conceptA}__contrast__${conceptB}`,
        sourceId: conceptA,
        targetId: conceptB,
        kind: 'contrast',
      },
    ]);
  });

  it('allows prerequisite and related edges between the same pair', () => {
    const edges = buildEdges(
      new Set([conceptA, conceptB]),
      [
        concept(conceptA, {
          prerequisites: [conceptB],
          relatedConcepts: [conceptB],
        }),
        concept(conceptB),
      ],
    );

    expect(edges.map((edge) => edge.kind)).toEqual(['prerequisite', 'related']);
  });

  it('drops edges to concepts outside the current node set', () => {
    const edges = buildEdges(
      new Set([conceptA]),
      [concept(conceptA, { prerequisites: [conceptB], relatedConcepts: [conceptC], contrastConcepts: [conceptD] })],
    );

    expect(edges).toEqual([]);
  });

  it('adds renderable indices from the node index map', () => {
    const edges: GraphEdge[] = [
      {
        id: `${conceptA}__related__${conceptB}`,
        sourceId: conceptA,
        targetId: conceptB,
        kind: 'related',
      },
    ];

    expect(toRenderableEdges(edges, new Map([[conceptA, 0], [conceptB, 1]]))).toEqual([
      {
        ...edges[0],
        sourceIndex: 0,
        targetIndex: 1,
      },
    ]);
  });

  it('throws when renderable edge indices are missing', () => {
    const edges: GraphEdge[] = [
      {
        id: `${conceptA}__related__${conceptB}`,
        sourceId: conceptA,
        targetId: conceptB,
        kind: 'related',
      },
    ];

    expect(() => toRenderableEdges(edges, new Map([[conceptA, 0]]))).toThrow(
      'Cannot render edge with missing node index',
    );
  });
});
