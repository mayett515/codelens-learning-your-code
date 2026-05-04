import type { ConceptId, ConceptType } from '@/src/features/learning';

export type EdgeKind = 'prerequisite' | 'related' | 'contrast';
export type GraphMode = 'structure' | 'recency' | 'strength';

export interface GraphNode {
  id: ConceptId;
  name: string;
  typeNodeId: ConceptType;
  familiarityScore: number;
  importanceScore: number;
  lastAccessedAt: number | null;
  strength: number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface GraphEdge {
  id: string;
  sourceId: ConceptId;
  targetId: ConceptId;
  kind: EdgeKind;
}

export interface RenderableGraphEdge extends GraphEdge {
  sourceIndex: number;
  targetIndex: number;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  isEgoView: boolean;
  focalConceptId: ConceptId | null;
  totalConceptCount: number;
  cappedAt: number | null;
}

export type NodePositionBuffer = Float32Array;
export type NodeIndexMap = Map<ConceptId, number>;

export interface PositionedNode extends GraphNode {
  x: number;
  y: number;
}

export interface LayoutResult {
  nodes: PositionedNode[];
  edges: RenderableGraphEdge[];
  positionBuffer: NodePositionBuffer;
  nodeIndexMap: NodeIndexMap;
  durationMs: number;
}

export interface NodeVisual {
  fill: string;
  radius: number;
  strokeColor: string;
  strokeWidth: number;
}

export interface EdgeVisual {
  strokeColor: string;
  strokeWidth: number;
  dashIntervals: number[] | null;
  hasArrow: boolean;
}

export interface GraphRelationshipConcept {
  id: ConceptId;
  prerequisites: ConceptId[];
  relatedConcepts: ConceptId[];
  contrastConcepts: ConceptId[];
}

export class GraphFocalNotFoundError extends Error {
  constructor(conceptId: ConceptId) {
    super(`Graph focal concept not found: ${conceptId}`);
    this.name = 'GraphFocalNotFoundError';
  }
}
