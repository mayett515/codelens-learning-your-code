import { View, StyleSheet } from 'react-native';
import { colors } from '../../../../ui/theme';

interface StrengthIndicatorProps {
  strength: number;
  size?: 'sm' | 'md';
}

export function StrengthIndicator({ strength, size = 'sm' }: StrengthIndicatorProps) {
  const clamped = Math.max(0, Math.min(1, strength));
  return (
    <View style={[styles.track, size === 'md' && styles.trackMd]}>
      <View style={[styles.fill, { width: `${clamped * 100}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 48,
    height: 4,
    borderRadius: 4,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  trackMd: {
    width: 72,
    height: 6,
  },
  fill: {
    height: '100%',
    backgroundColor: colors.green,
  },
});
