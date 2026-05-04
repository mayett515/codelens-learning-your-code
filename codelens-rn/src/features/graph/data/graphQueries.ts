import {
  computeStrength,
  getLearningConceptList,
  type ConceptId,
  type LearningConcept,
} from '@/src/features/learning';
import { buildEdges } from '../engine/edgeBuilder';
import { GraphFocalNotFoundError, type GraphData, type GraphNode } from '../types';

const FULL_GRAPH_LIMIT = 300;
const EGO_GRAPH_LIMIT = 40;

interface NeighborCandidate {
  concept: LearningConcept;
  priority: number;
}

function toGraphNode(concept: LearningConcept): GraphNode {
  return {
    id: concept.id,
    name: concept.name,
    typeNodeId: concept.conceptType,
    familiarityScore: concept.familiarityScore,
    importanceScore: concept.importanceScore,
    lastAccessedAt: concept.lastAccessedAt ?? null,
    strength: computeStrength(concept.familiarityScore, concept.importanceScore),
  };
}

function compareForFullGraph(left: LearningConcept, right: LearningConcept): number {
  const strengthDelta =
    computeStrength(right.familiarityScore, right.importanceScore) -
    computeStrength(left.familiarityScore, left.importanceScore);
  if (strengthDelta !== 0) return strengthDelta;
  if (left.createdAt !== right.createdAt) return left.createdAt - right.createdAt;
  return left.id.localeCompare(right.id);
}

function compareNeighborCandidates(left: NeighborCandidate, right: NeighborCandidate): number {
  if (left.priority !== right.priority) return left.priority - right.priority;
  return compareForFullGraph(left.concept, right.concept);
}

function conceptsById(concepts: LearningConcept[]): Map<ConceptId, LearningConcept> {
  return new Map(concepts.map((concept) => [concept.id, concept]));
}

function relationshipConcepts(concepts: LearningConcept[]): LearningConcept[] {
  return concepts;
}

export async function fetchFullGraphData(): Promise<GraphData> {
  const concepts = await getLearningConceptList();
  const totalConceptCount = concepts.length;
  const selectedConcepts = [...concepts]
    .sort(compareForFullGraph)
    .slice(0, FULL_GRAPH_LIMIT);
  const nodeIds = new Set(selectedConcepts.map((concept) => concept.id));

  return {
    nodes: selectedConcepts.map(toGraphNode),
    edges: buildEdges(nodeIds, relationshipConcepts(selectedConcepts)),
    isEgoView: false,
    focalConceptId: null,
    totalConceptCount,
    cappedAt: totalConceptCount > FULL_GRAPH_LIMIT ? FULL_GRAPH_LIMIT : null,
  };
}

export async function fetchEgoGraphData(conceptId: ConceptId): Promise<GraphData> {
  const concepts = await getLearningConceptList();
  const totalConceptCount = concepts.length;
  const byId = conceptsById(concepts);
  const focalConcept = byId.get(conceptId);
  if (!focalConcept) throw new GraphFocalNotFoundError(conceptId);

  const candidates = new Map<ConceptId, NeighborCandidate>();
  const addCandidate = (id: ConceptId, priority: number): void => {
    if (id === conceptId) return;
    const concept = byId.get(id);
    if (!concept) return;
    const existing = candidates.get(id);
    if (!existing || priority < existing.priority) {
      candidates.set(id, { concept, priority });
    }
  };

  focalConcept.prerequisites.forEach((id) => addCandidate(id, 1));
  focalConcept.relatedConcepts.forEach((id) => addCandidate(id, 2));
  focalConcept.contrastConcepts.forEach((id) => addCandidate(id, 3));

  concepts.forEach((concept) => {
    if (concept.id === conceptId) return;
    if (
      concept.prerequisites.includes(conceptId) ||
      concept.relatedConcepts.includes(conceptId) ||
      concept.contrastConcepts.includes(conceptId)
    ) {
      addCandidate(concept.id, 4);
    }
  });

  const neighbors = [...candidates.values()]
    .sort(compareNeighborCandidates)
    .slice(0, EGO_GRAPH_LIMIT - 1)
    .map((candidate) => candidate.concept);
  const selectedConcepts = [focalConcept, ...neighbors];
  const nodeIds = new Set(selectedConcepts.map((concept) => concept.id));

  return {
    nodes: selectedConcepts.map(toGraphNode),
    edges: buildEdges(nodeIds, relationshipConcepts(selectedConcepts)),
    isEgoView: true,
    focalConceptId: conceptId,
    totalConceptCount,
    cappedAt: candidates.size > neighbors.length ? EGO_GRAPH_LIMIT : null,
  };
}
