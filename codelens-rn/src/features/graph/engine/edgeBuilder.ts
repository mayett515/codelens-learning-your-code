import type {
  GraphEdge,
  GraphRelationshipConcept,
  NodeIndexMap,
  RenderableGraphEdge,
} from '../types';
import type { ConceptId } from '@/src/features/learning';

function canonicalPair(left: ConceptId, right: ConceptId): [ConceptId, ConceptId] {
  return left < right ? [left, right] : [right, left];
}

export function buildEdges(
  nodeIds: Set<ConceptId>,
  concepts: GraphRelationshipConcept[],
): GraphEdge[] {
  const seen = new Set<string>();
  const edges: GraphEdge[] = [];

  const pushEdge = (edge: GraphEdge): void => {
    if (seen.has(edge.id)) return;
    seen.add(edge.id);
    edges.push(edge);
  };

  for (const concept of concepts) {
    if (!nodeIds.has(concept.id)) continue;

    for (const prerequisiteId of concept.prerequisites) {
      if (!nodeIds.has(prerequisiteId)) continue;
      pushEdge({
        id: `${prerequisiteId}__prerequisite__${concept.id}`,
        sourceId: prerequisiteId,
        targetId: concept.id,
        kind: 'prerequisite',
      });
    }

    for (const relatedId of concept.relatedConcepts) {
      if (!nodeIds.has(relatedId)) continue;
      const [sourceId, targetId] = canonicalPair(concept.id, relatedId);
      pushEdge({
        id: `${sourceId}__related__${targetId}`,
        sourceId,
        targetId,
        kind: 'related',
      });
    }

    for (const contrastId of concept.contrastConcepts) {
      if (!nodeIds.has(contrastId)) continue;
      const [sourceId, targetId] = canonicalPair(concept.id, contrastId);
      pushEdge({
        id: `${sourceId}__contrast__${targetId}`,
        sourceId,
        targetId,
        kind: 'contrast',
      });
    }
  }

  return edges;
}

export function toRenderableEdges(
  edges: GraphEdge[],
  nodeIndexMap: NodeIndexMap,
): RenderableGraphEdge[] {
  return edges.map((edge) => {
    const sourceIndex = nodeIndexMap.get(edge.sourceId);
    const targetIndex = nodeIndexMap.get(edge.targetId);
    if (sourceIndex === undefined || targetIndex === undefined) {
      throw new Error(`Cannot render edge with missing node index: ${edge.id}`);
    }

    return {
      ...edge,
      sourceIndex,
      targetIndex,
    };
  });
}
