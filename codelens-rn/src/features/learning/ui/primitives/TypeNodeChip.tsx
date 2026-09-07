import { Text, StyleSheet } from 'react-native';
import { colors, fontSize, spacing } from '../../../../ui/theme';
import { getOntologyNodeLabel } from '../../../ontology';
import type { DomainProfile } from '../../../ontology';
import type { ConceptType } from '../../types/learning';

export interface TypeNodeChipProps {
  typeNodeId: ConceptType;
  size?: 'sm' | 'md';
  profile?: DomainProfile | undefined;
}

export function TypeNodeChip({ typeNodeId, size = 'sm', profile }: TypeNodeChipProps) {
  return (
    <Text style={[styles.chip, size === 'md' && styles.md]} numberOfLines={1}>
      {getOntologyNodeLabel(typeNodeId, profile)}
    </Text>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    textTransform: 'capitalize',
  },
  md: {
    fontSize: fontSize.md,
    paddingVertical: spacing.xs,
  },
});
