import { StyleSheet, View } from 'react-native';
import { colors } from '../../../ui/theme';

interface Props {
  visible: boolean;
}

export function SelectionStartIndicator({ visible }: Props) {
  if (!visible) return null;
  return (
    <View style={styles.indicator} accessibilityLabel="Selection start" />
  );
}

const styles = StyleSheet.create({
  indicator: {
    position: 'absolute',
    left: 6,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: colors.primary,
    borderRadius: 2,
    opacity: 0.85,
  },
});
