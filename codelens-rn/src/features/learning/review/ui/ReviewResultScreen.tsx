import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, spacing } from '../../../../ui/theme';
import { CaptureCardCompact } from '../../ui/cards/CaptureCardCompact';
import type { LearningCapture } from '../../types/learning';

export function ReviewResultScreen(props: {
  conceptName: string;
  summary?: string | null;
  captures?: LearningCapture[];
  onDone: () => void;
  onOpenConcept: () => void;
  onOpenCapture?: ((id: LearningCapture['id']) => void) | undefined;
  onContinueInChat?: (() => void) | undefined;
}) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{props.conceptName}</Text>
      <Text style={styles.body}>Review saved.</Text>
      {props.summary ? <Text style={styles.summary}>{props.summary}</Text> : null}
      {(props.captures ?? []).map((capture) => (
        <CaptureCardCompact
          key={capture.id}
          captureId={capture.id}
          title={capture.title}
          whatClicked={capture.whatClicked}
          state={capture.state}
          relativeTime={new Date(capture.createdAt).toLocaleDateString()}
          linkedConceptName={null}
          onPress={() => props.onOpenCapture?.(capture.id)}
        />
      ))}
      <Pressable style={styles.primary} onPress={props.onDone}>
        <Text style={styles.primaryText}>Done</Text>
      </Pressable>
      {props.onContinueInChat ? (
        <Pressable style={styles.secondary} onPress={props.onContinueInChat}>
          <Text style={styles.secondaryText}>Continue in chat</Text>
        </Pressable>
      ) : null}
      <Pressable style={styles.secondary} onPress={props.onOpenConcept}>
        <Text style={styles.secondaryText}>Open this concept</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: '800',
  },
  body: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
  },
  summary: {
    color: colors.text,
    fontSize: fontSize.md,
    lineHeight: 21,
  },
  primary: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  primaryText: {
    color: colors.text,
    fontWeight: '700',
  },
  secondary: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryText: {
    color: colors.primaryLight,
    fontWeight: '700',
  },
});
