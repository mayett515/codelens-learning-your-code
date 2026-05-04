import { codingProfile } from './profiles/codingProfile';
import type { DomainProfile, OntologyNode } from './types';

export type {
  BoundaryRule,
  DomainLabels,
  DomainProfile,
  EmbeddingProfile,
  ExtractionProfile,
  GraphProfile,
  MetadataFieldDefinition,
  OntologyNode,
  OntologyNodeCreator,
  OntologyNodeKind,
  OntologyNodeStatus,
  OntologyProfile,
  PromotionProfile,
  RetrievalProfile,
  ReviewProfile,
  OntologyCorrectionEvidence,
  OntologyCorrectionField,
  OntologyCorrectionSource,
  OntologyCorrectionSubjectKind,
} from './types';

export {
  CODING_CONCEPT_TYPE_COLORS,
  CODING_CONCEPT_TYPE_NODE_IDS,
  codingOntologyNodes,
  codingProfile,
} from './profiles/codingProfile';
export type { CodingConceptTypeNodeId } from './profiles/codingProfile';

export { getMetadataField, getMetadataFieldLabel, getMetadataFieldPlaceholder } from './metadata';
export { validateOntologyCorrection } from './corrections';

export function getActiveDomainProfile() {
  return codingProfile;
}

export function getOntologyNode(
  nodeId: string,
  profile: DomainProfile = getActiveDomainProfile(),
): OntologyNode | undefined {
  return profile.ontology.nodes.find((node) => node.id === nodeId);
}

export function getOntologyNodeLabel(
  nodeId: string,
  profile: DomainProfile = getActiveDomainProfile(),
): string {
  return getOntologyNode(nodeId, profile)?.label ?? nodeId.replace(/_/g, ' ');
}
