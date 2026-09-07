/**
 * @deprecated Use `TypeNodeChip` from `./TypeNodeChip` instead.
 */
import { TypeNodeChip } from './TypeNodeChip';
import type { DomainProfile } from '../../../ontology';
import type { ConceptType } from '../../types/learning';

export interface ConceptTypeChipProps {
  type: ConceptType;
  size?: 'sm' | 'md';
  profile?: DomainProfile | undefined;
}

export function ConceptTypeChip({ type, size, profile }: ConceptTypeChipProps) {
  return size
    ? <TypeNodeChip typeNodeId={type} size={size} profile={profile} />
    : <TypeNodeChip typeNodeId={type} profile={profile} />;
}
