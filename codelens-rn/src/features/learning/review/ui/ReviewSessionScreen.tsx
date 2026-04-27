import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, spacing } from '../../../../ui/theme';
import { ConceptTypeChip } from '../../ui/primitives/ConceptTypeChip';
import { ReflectionInput } from './ReflectionInput';
import { ShowSavedReveal } from './ShowSavedReveal';
import { SelfRatingPrompt } from './SelfRatingPrompt';
import { ReviewResultScreen } from './ReviewResultScreen';
import { useApplyReviewRating } from '../hooks/useApplyReviewRating';
import { useReviewSession } from '../hooks/useReviewSession';
import { useReviewSettings } from '../hooks/useReviewSettings';
import type { ConceptId, LearningCaptureId } from '../../types/ids';
import type { ReviewRatingOrSkip } from '../types/review';

export function ReviewSessionScreen(props: {
  conceptId: ConceptId;
  onDone: () => void;
  onOpenConcept?: (conceptId: ConceptId) => void;
  onOpenCapture?: (captureId: LearningCaptureId) => void;
  onContinueInChat?: (conceptId: ConceptId) => void;
}) {
  const [reflection, setReflection] = useState('');
  const [phase, setPhase] = useState<'reflect' | 'rate' | 'done'>('reflect');
  const settings = useReviewSettings();
  const session = useReviewSession(props.conceptId);
  const ratingMutation = useApplyReviewRating();
  const data = session.data;

  if (session.isLoading || !data) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (phase === 'done') {
    return (
      <ReviewResultScreen
        conceptName={data.concept.name}
        onDone={props.onDone}
        onOpenConcept={() => props.onOpenConcept?.(props.conceptId)}
        onContinueInChat={props.onContinueInChat ? () => props.onContinueInChat?.(props.conceptId) : undefined}
      />
    );
  }

  const rate = async (rating: ReviewRatingOrSkip) => {
    if (rating === 'skip') {
      props.onDone();
      return;
    }
    await ratingMutation.mutateAsync({
      conceptId: props.conceptId,
      rating,
      recallText: reflection,
      recordRecallText: settings.recordRecallText,
    });
    setPhase('done');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>{data.concept.name}</Text>
        <ConceptTypeChip type={data.concept.conceptType} size="md" />
      </View>
      {phase === 'reflect' ? (
        <>
          <Text style={styles.prompt}>What still makes sense to you about {data.concept.name}?</Text>
          <ReflectionInput value={reflection} onChangeText={setReflection} />
          <ShowSavedReveal
            summary={data.concept.canonicalSummary}
            captures={data.captures}
            onOpenCapture={props.onOpenCapture}
          />
          <Pressable style={styles.primary} onPress={() => setPhase('rate')}>
            <Text style={styles.primaryText}>Submit</Text>
          </Pressable>
        </>
      ) : (
        <SelfRatingPrompt onRate={rate} disabled={ratingMutation.isPending} />
      )}
      {ratingMutation.error ? (
        <Text style={styles.error}>
          {ratingMutation.error instanceof Error ? ratingMutation.error.message : 'Could not save review'}
        </Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  header: {
    gap: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.xxl,
    fontWeight: '800',
  },
  prompt: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  primary: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  primaryText: {
    color: colors.text,
    fontWeight: '700',
  },
  error: {
    color: colors.red,
    fontSize: fontSize.sm,
  },
});
