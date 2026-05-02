import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, spacing } from '@/src/ui/theme';
import type { GraphMode } from '../types';

const MODES: GraphMode[] = ['structure', 'recency', 'strength'];

interface GraphModeBarProps {
  currentMode: GraphMode;
  onModeChange: (mode: GraphMode) => void;
}

export function GraphModeBar({ currentMode, onModeChange }: GraphModeBarProps) {
  return (
    <View style={styles.container}>
      {MODES.map((mode) => {
        const active = mode === currentMode;
        return (
          <Pressable
            key={mode}
            style={[styles.item, active ? styles.itemActive : null]}
            onPress={() => onModeChange(mode)}
          >
            <Text style={[styles.label, active ? styles.labelActive : null]}>{labelForMode(mode)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function labelForMode(mode: GraphMode): string {
  if (mode === 'recency') return 'Recency';
  if (mode === 'strength') return 'Strength';
  return 'Structure';
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: spacing.xs,
    padding: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: 8,
  },
  item: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: 6,
  },
  itemActive: {
    backgroundColor: colors.primary,
  },
  label: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  labelActive: {
    color: colors.text,
  },
});
