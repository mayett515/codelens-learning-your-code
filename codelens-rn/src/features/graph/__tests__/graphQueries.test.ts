import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ConceptId, LearningConcept } from '@/src/features/learning';

const getLearningConceptListMock = vi.hoisted(() => vi.fn<() => Promise<LearningConcept[]>>());

function computeStrengthForTest(familiarity: number, importance: number): number {
  const clampedFamiliarity = Math.min(1, Math.max(0, familiarity));
  const clampedImportance = Math.min(1, Math.max(0, importance));
  return Math.min(1, 0.1 * clampedImportance + 0.7 * clampedFamiliarity + 0.3 * clampedImportance);
}

vi.mock('@/src/features/learning', () => {
  return {
    computeStrength: computeStrengthForTest,
    getLearningConceptList: getLearningConceptListMock,
  };
});

import { fetchEgoGraphData, fetchFullGraphData } from '../data/graphQueries';
import { GraphFocalNotFoundError } from '../types';

function id(value: string): ConceptId {
  return value as ConceptId;
}

const conceptA = id('c_111111111111111111111');
const conceptB = id('c_222222222222222222222');
const conceptC = id('c_333333333333333333333');
const conceptD = id('c_444444444444444444444');
const conceptE = id('c_555555555555555555555');

function concept(id: ConceptId, overrides: Partial<LearningConcept> = {}): LearningConcept {
  return {
    id,
    name: overrides.name ?? id,
    normalizedKey: id,
    canonicalSummary: null,
    conceptType: 'mechanism',
    coreConcept: null,
    architecturalPattern: null,
    programmingParadigm: null,
    languageOrRuntime: [],
    surfaceFeatures: [],
    prerequisites: [],
    relatedConcepts: [],
    contrastConcepts: [],
    representativeCaptureIds: [],
    familiarityScore: 0,
    importanceScore: 0,
    lastAccessedAt: null,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

describe('Stage 9A graph queries', () => {
  beforeEach(() => {
    getLearningConceptListMock.mockReset();
  });

  it('returns full graph data sorted by strength desc then created_at asc', async () => {
    getLearningConceptListMock.mockResolvedValue([
      concept(conceptA, { name: 'Weak', familiarityScore: 0.1, importanceScore: 0.1, createdAt: 1 }),
      concept(conceptB, { name: 'Strong later', familiarityScore: 0.9, importanceScore: 0.9, createdAt: 5 }),
      concept(conceptC, { name: 'Strong earlier', familiarityScore: 0.9, importanceScore: 0.9, createdAt: 2 }),
    ]);

    const graph = await fetchFullGraphData();

    expect(graph.isEgoView).toBe(false);
    expect(graph.focalConceptId).toBeNull();
    expect(graph.totalConceptCount).toBe(3);
    expect(graph.cappedAt).toBeNull();
    expect(graph.nodes.map((node) => node.id)).toEqual([conceptC, conceptB, conceptA]);
    expect(graph.nodes[0].strength).toBe(computeStrengthForTest(0.9, 0.9));
  });

  it('caps full graph nodes at 300 and keeps edges inside the selected set', async () => {
    const concepts = Array.from({ length: 305 }, (_, index) => {
      const conceptId = id(`c_${String(index).padStart(21, '0')}`);
      return concept(conceptId, {
        familiarityScore: 1 - index / 1000,
        importanceScore: 1,
        relatedConcepts: index === 0 ? [conceptD] : [],
      });
    });
    getLearningConceptListMock.mockResolvedValue(concepts);

    const graph = await fetchFullGraphData();
    const nodeIds = new Set(graph.nodes.map((node) => node.id));

    expect(graph.nodes).toHaveLength(300);
    expect(graph.cappedAt).toBe(300);
    expect(graph.totalConceptCount).toBe(305);
    expect(graph.edges.every((edge) => nodeIds.has(edge.sourceId) && nodeIds.has(edge.targetId))).toBe(true);
  });

  it('returns ego graph with focal concept first and prioritized neighbors', async () => {
    getLearningConceptListMock.mockResolvedValue([
      concept(conceptA, {
        prerequisites: [conceptB],
        relatedConcepts: [conceptC],
        contrastConcepts: [conceptD],
      }),
      concept(conceptB, { name: 'Prerequisite' }),
      concept(conceptC, { name: 'Related' }),
      concept(conceptD, { name: 'Contrast' }),
      concept(conceptE, { name: 'Reverse', relatedConcepts: [conceptA], familiarityScore: 1 }),
    ]);

    const graph = await fetchEgoGraphData(conceptA);

    expect(graph.isEgoView).toBe(true);
    expect(graph.focalConceptId).toBe(conceptA);
    expect(graph.nodes.map((node) => node.id)).toEqual([conceptA, conceptB, conceptC, conceptD, conceptE]);
    expect(graph.edges.map((edge) => edge.id)).toContain(`${conceptB}__prerequisite__${conceptA}`);
    expect(graph.edges.map((edge) => edge.id)).toContain(`${conceptA}__related__${conceptC}`);
    expect(graph.edges.map((edge) => edge.id)).toContain(`${conceptA}__contrast__${conceptD}`);
    expect(graph.edges.map((edge) => edge.id)).toContain(`${conceptA}__related__${conceptE}`);
  });

  it('caps ego graph at 40 nodes while keeping focal concept present', async () => {
    const neighbors = Array.from({ length: 50 }, (_, index) => {
      const conceptId = id(`c_${String(index + 10).padStart(21, '0')}`);
      return concept(conceptId, { familiarityScore: 1 - index / 100, importanceScore: 1 });
    });
    getLearningConceptListMock.mockResolvedValue([
      concept(conceptA, { relatedConcepts: neighbors.map((item) => item.id) }),
      ...neighbors,
    ]);

    const graph = await fetchEgoGraphData(conceptA);

    expect(graph.nodes).toHaveLength(40);
    expect(graph.nodes[0].id).toBe(conceptA);
    expect(graph.cappedAt).toBe(40);
  });

  it('throws GraphFocalNotFoundError for missing focal concept', async () => {
    getLearningConceptListMock.mockResolvedValue([concept(conceptA)]);

    await expect(fetchEgoGraphData(conceptB)).rejects.toBeInstanceOf(GraphFocalNotFoundError);
  });
});
