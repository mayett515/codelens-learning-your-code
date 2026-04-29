import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, spacing } from '../../../ui/theme';

interface Props {
  onPress: () => void;
  disabled?: boolean | undefined;
}

export function StopGeneratingButton({ onPress, disabled }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Stop generating"
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      style={({ pressed }) => [
        styles.button,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <View style={styles.icon} />
      <Text style={styles.label}>Stop</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minWidth: 44,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: 22,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.red,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.4,
  },
  icon: {
    width: 12,
    height: 12,
    borderRadius: 2,
    backgroundColor: colors.red,
  },
  label: {
    color: colors.red,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
});
