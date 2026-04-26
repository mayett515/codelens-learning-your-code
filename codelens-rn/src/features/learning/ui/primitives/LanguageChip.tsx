import { Text, StyleSheet } from 'react-native';
import { colors, fontSize, spacing } from '../../../../ui/theme';

interface LanguageChipProps {
  label: string;
  size?: 'sm' | 'md';
}

export function LanguageChip({ label, size = 'sm' }: LanguageChipProps) {
  return (
    <Text style={[styles.chip, size === 'md' && styles.md]} numberOfLines={1}>
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: 8,
    backgroundColor: colors.surfaceLight,
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  md: {
    fontSize: fontSize.md,
    paddingVertical: spacing.xs,
  },
});
