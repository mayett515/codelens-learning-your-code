import { Text, StyleSheet } from 'react-native';
import { colors, fontSize, spacing } from '../../../../ui/theme';
import type { CaptureState } from '../../types/learning';

interface StateChipProps {
  state: CaptureState;
}

const stateColor: Record<CaptureState, string> = {
  unresolved: colors.yellow,
  linked: colors.green,
  proposed_new: colors.blue,
};

export function StateChip({ state }: StateChipProps) {
  return (
    <Text style={[styles.chip, { color: stateColor[state], borderColor: stateColor[state] }]}>
      {state.replace(/_/g, ' ')}
    </Text>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 8,
    fontSize: fontSize.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
});
