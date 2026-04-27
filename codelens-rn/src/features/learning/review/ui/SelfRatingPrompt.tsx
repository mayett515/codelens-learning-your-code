import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, spacing } from '../../../../ui/theme';
import type { ReviewRatingOrSkip } from '../types/review';

export function SelfRatingPrompt(props: {
  onRate: (rating: ReviewRatingOrSkip) => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>How did this feel?</Text>
      <RatingButton label="I got it" onPress={() => props.onRate('strong')} disabled={props.disabled} />
      <RatingButton label="Partial" onPress={() => props.onRate('partial')} disabled={props.disabled} />
      <RatingButton label="Need to revisit" onPress={() => props.onRate('weak')} disabled={props.disabled} />
      <RatingButton label="Skip" onPress={() => props.onRate('skip')} disabled={props.disabled} />
    </View>
  );
}

function RatingButton(props: { label: string; onPress: () => void; disabled?: boolean | undefined }) {
  return (
    <Pressable style={[styles.button, props.disabled && styles.disabled]} onPress={props.onPress} disabled={props.disabled}>
      <Text style={styles.buttonText}>{props.label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '800',
  },
  button: {
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
  },
  disabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: colors.text,
    fontWeight: '700',
  },
});
