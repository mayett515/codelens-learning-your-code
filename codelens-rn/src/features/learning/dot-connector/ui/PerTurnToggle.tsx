import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, fontSize, spacing } from '../../../../ui/theme';

export function PerTurnToggle(props: {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}) {
  return (
    <Pressable
      style={[styles.toggle, props.enabled ? styles.on : styles.off]}
      onPress={() => props.onChange(!props.enabled)}
      accessibilityRole="switch"
      accessibilityState={{ checked: props.enabled }}
    >
      <Text style={styles.text}>{props.enabled ? 'Memories on' : 'Memories off'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  toggle: {
    minHeight: 36,
    justifyContent: 'center',
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
  },
  on: {
    backgroundColor: colors.primary,
  },
  off: {
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  text: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
});
