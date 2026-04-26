import { Text, StyleSheet } from 'react-native';
import { colors, fontSize, spacing } from '../../../../ui/theme';
import type { ConceptType } from '../../types/learning';

interface ConceptTypeChipProps {
  type: ConceptType;
  size?: 'sm' | 'md';
}

export function ConceptTypeChip({ type, size = 'sm' }: ConceptTypeChipProps) {
  return (
    <Text style={[styles.chip, size === 'md' && styles.md]} numberOfLines={1}>
      {type.replace(/_/g, ' ')}
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
