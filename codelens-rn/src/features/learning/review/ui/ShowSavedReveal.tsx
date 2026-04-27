import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';
import { colors, fontSize, spacing } from '../../../../ui/theme';
import { CaptureCardCompact } from '../../ui/cards/CaptureCardCompact';
import type { LearningCapture } from '../../types/learning';

export function ShowSavedReveal(props: {
  summary: string | null;
  captures: LearningCapture[];
  onOpenCapture?: ((id: LearningCapture['id']) => void) | undefined;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.container}>
      <Pressable style={styles.button} onPress={() => setOpen((value) => !value)}>
        <Text style={styles.buttonText}>{open ? 'Hide what I had saved' : 'Show what I had saved'}</Text>
      </Pressable>
      {open ? (
        <View style={styles.reveal}>
          {props.summary ? <Text style={styles.summary}>{props.summary}</Text> : null}
          {props.captures.map((capture) => (
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
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  button: {
    minHeight: 44,
    justifyContent: 'center',
  },
  buttonText: {
    color: colors.primaryLight,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  reveal: {
    gap: spacing.sm,
  },
  summary: {
    color: colors.text,
    fontSize: fontSize.md,
    lineHeight: 21,
  },
});
