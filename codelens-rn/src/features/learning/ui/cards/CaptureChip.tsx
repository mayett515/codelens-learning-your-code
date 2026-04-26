import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, fontSize, spacing } from '../../../../ui/theme';

interface CaptureChipProps {
  label: string;
  sublabel?: string | null;
  onPress?: () => void;
}

export function CaptureChip({ label, sublabel, onPress }: CaptureChipProps) {
  return (
    <Pressable style={styles.chip} onPress={onPress} disabled={!onPress}>
      <Text style={styles.label} numberOfLines={1}>{label}</Text>
      {sublabel ? <Text style={styles.sublabel} numberOfLines={1}>{sublabel}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    alignSelf: 'flex-start',
  },
  label: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  sublabel: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
});
