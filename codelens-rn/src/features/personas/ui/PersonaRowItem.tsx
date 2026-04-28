import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, spacing } from '../../../ui/theme';

interface PersonaRowItemProps {
  title: string;
  subtitle: string;
  iconEmoji?: string | null | undefined;
  active: boolean;
  disabled?: boolean | undefined;
  onPress: () => void;
}

export function PersonaRowItem({
  title,
  subtitle,
  iconEmoji,
  active,
  disabled,
  onPress,
}: PersonaRowItemProps) {
  return (
    <Pressable
      style={[styles.row, active && styles.rowActive, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}
    >
      <View style={styles.iconBox}>
        <Text style={styles.iconText}>{iconEmoji ?? title.slice(0, 1)}</Text>
      </View>
      <View style={styles.copy}>
        <Text style={[styles.title, active && styles.titleActive]} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.subtitle} numberOfLines={2}>
          {subtitle}
        </Text>
      </View>
      {active ? <Text style={styles.activeMark}>Active</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  rowActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(96, 139, 219, 0.16)',
  },
  disabled: {
    opacity: 0.6,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceLight,
  },
  iconText: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  copy: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  titleActive: {
    color: colors.primary,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  activeMark: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
});
