import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, spacing } from '../../../../ui/theme';
import { StateChip } from '../primitives/StateChip';
import { SourceBreadcrumb } from '../primitives/SourceBreadcrumb';
import type { LearningCaptureId } from '../../types/ids';
import type { CaptureState } from '../../types/learning';

interface CaptureCardCompactProps {
  captureId: LearningCaptureId;
  title: string;
  state: CaptureState;
  whatClicked: string;
  linkedConceptName?: string | null;
  sourceLabel?: string | null;
  relativeTime?: string;
  onPress: (captureId: LearningCaptureId) => void;
}

export function CaptureCardCompact(props: CaptureCardCompactProps) {
  return (
    <Pressable style={styles.card} onPress={() => props.onPress(props.captureId)}>
      <View style={styles.topRow}>
        <Text style={styles.title} numberOfLines={1}>{props.title}</Text>
        <StateChip state={props.state} />
      </View>
      {props.linkedConceptName ? (
        <Text style={styles.related} numberOfLines={1}>{props.linkedConceptName}</Text>
      ) : null}
      <Text style={styles.clicked} numberOfLines={1}>{props.whatClicked}</Text>
      <SourceBreadcrumb sessionLabel={props.sourceLabel} relativeTime={props.relativeTime} compact />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    color: colors.text,
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  related: {
    color: colors.primaryLight,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  clicked: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
});
