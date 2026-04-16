import { memo } from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { colors, fontSize, spacing } from '../../../ui/theme';

interface Props {
  name: string;
  selected: boolean;
  onPress: () => void;
  variant?: 'default' | 'merge' | undefined;
}

export const ConceptChip = memo(function ConceptChip({
  name,
  selected,
  onPress,
  variant,
}: Props) {
  const isMerge = variant === 'merge';
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        selected && styles.chipSelected,
        isMerge && styles.chipMerge,
      ]}
    >
      <Text
        style={[
          styles.text,
          selected && styles.textSelected,
          isMerge && styles.textMerge,
        ]}
        numberOfLines={1}
      >
        {name}
      </Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 2,
    borderRadius: 16,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
  },
  chipSelected: {
    backgroundColor: `${colors.primary}20`,
    borderColor: colors.primary,
  },
  chipMerge: {
    backgroundColor: `${colors.yellow}15`,
    borderColor: colors.yellow,
  },
  text: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  textSelected: {
    color: colors.primary,
  },
  textMerge: {
    color: colors.yellow,
  },
});
