import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, spacing } from '../../../ui/theme';

interface Props {
  line: number;
  onAsk: () => void;
  onBookmark: () => void;
  onDismiss: () => void;
}

export function GutterActionChip({ line, onAsk, onBookmark, onDismiss }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.lineText}>Line {line}</Text>
      <Pressable style={styles.primaryBtn} onPress={onAsk} accessibilityRole="button">
        <Text style={styles.primaryText}>Ask about this line</Text>
      </Pressable>
      <Pressable style={styles.secondaryBtn} onPress={onBookmark} accessibilityRole="button">
        <Text style={styles.secondaryText}>Bookmark this line</Text>
      </Pressable>
      <Pressable style={styles.closeBtn} onPress={onDismiss} accessibilityRole="button">
        <Text style={styles.closeText}>x</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.lg,
    minHeight: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  lineText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  primaryBtn: {
    flex: 1,
    minHeight: 36,
    borderRadius: 6,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  primaryText: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  secondaryBtn: {
    flex: 1,
    minHeight: 36,
    borderRadius: 6,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  secondaryText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
});
