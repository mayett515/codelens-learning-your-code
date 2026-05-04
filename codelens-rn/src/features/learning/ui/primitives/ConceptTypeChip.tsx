/**
 * @deprecated Use `TypeNodeChip` from `./TypeNodeChip` instead.
 */
import { TypeNodeChip } from './TypeNodeChip';
import type { ConceptType } from '../../types/learning';

export interface ConceptTypeChipProps {
  type: ConceptType;
  size?: 'sm' | 'md';
}

export function ConceptTypeChip({ type, size }: ConceptTypeChipProps) {
  return size ? <TypeNodeChip typeNodeId={type} size={size} /> : <TypeNodeChip typeNodeId={type} />;
}
