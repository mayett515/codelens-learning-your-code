import { View, Pressable, StyleSheet } from 'react-native';
import { colors, spacing } from '../theme';
import type { MarkColor } from '@/src/domain/types';

const MARK_COLORS: { key: MarkColor; value: string }[] = [
  { key: 'red', value: colors.red },
  { key: 'green', value: colors.green },
  { key: 'yellow', value: colors.yellow },
  { key: 'blue', value: colors.blue },
  { key: 'purple', value: colors.purple },
];

interface Props {
  active: MarkColor;
  onSelect: (color: MarkColor) => void;
}

export function ColorPicker({ active, onSelect }: Props) {
  return (
    <View style={styles.container}>
      {MARK_COLORS.map(({ key, value }) => (
        <Pressable
          key={key}
          style={[
            styles.swatch,
            { backgroundColor: value },
            active === key && styles.swatchActive,
          ]}
          onPress={() => onSelect(key)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    justifyContent: 'center',
  },
  swatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    opacity: 0.5,
  },
  swatchActive: {
    opacity: 1,
    borderWidth: 2,
    borderColor: colors.text,
  },
});
