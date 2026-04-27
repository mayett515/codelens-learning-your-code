import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, spacing } from '../../../../ui/theme';
import type { DotConnectorIndicatorStatus } from '../types/dotConnector';

interface DotConnectorIndicatorProps {
  status: DotConnectorIndicatorStatus;
  count: number;
  maxItems: number;
  onTapPreview: () => void;
  onTogglePerTurn: (next: boolean) => void;
  perTurnEnabled: boolean;
  partialReason?: string | null | undefined;
}

export function DotConnectorIndicator(props: DotConnectorIndicatorProps) {
  const disabled = props.status === 'disabled' || props.status === 'unavailable';
  return (
    <View style={styles.row}>
      <Pressable
        style={[styles.indicator, disabled && styles.indicatorMuted]}
        onPress={props.onTapPreview}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={labelFor(props.status, props.count)}
      >
        <Text style={[styles.text, disabled && styles.textMuted]} numberOfLines={1}>
          {labelFor(props.status, props.count)}
        </Text>
        {props.status === 'partial' && props.partialReason ? (
          <Text style={styles.warning} numberOfLines={1}>{props.partialReason}</Text>
        ) : null}
      </Pressable>
      <Pressable
        style={[styles.toggle, props.perTurnEnabled ? styles.toggleOn : styles.toggleOff]}
        onPress={() => props.onTogglePerTurn(!props.perTurnEnabled)}
        accessibilityRole="switch"
        accessibilityState={{ checked: props.perTurnEnabled }}
      >
        <Text style={styles.toggleText}>{props.perTurnEnabled ? 'On' : 'Off'}</Text>
      </Pressable>
    </View>
  );
}

function labelFor(status: DotConnectorIndicatorStatus, count: number): string {
  if (status === 'loading') return `${count} memories`;
  if (status === 'ok') return `${count} memories loaded`;
  if (status === 'partial') return `${count} memories loaded`;
  if (status === 'unavailable') return 'Retrieval unavailable';
  if (status === 'disabled') return 'Memories off';
  return '0 memories';
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    maxWidth: 220,
  },
  indicator: {
    minHeight: 36,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surfaceLight,
  },
  indicatorMuted: {
    opacity: 0.65,
  },
  text: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  textMuted: {
    color: colors.textSecondary,
  },
  warning: {
    color: colors.yellow,
    fontSize: 10,
  },
  toggle: {
    minHeight: 36,
    justifyContent: 'center',
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
  },
  toggleOn: {
    backgroundColor: colors.primary,
  },
  toggleOff: {
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleText: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
});
