import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, spacing } from '../../../../ui/theme';
import { getActiveDomainProfile } from '@/src/features/ontology';
import { TypeNodeChip } from '../../ui/primitives/TypeNodeChip';
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
  const sessionStartRef = useRef(Date.now());
  const settings = useReviewSettings();
  const session = useReviewSession(props.conceptId);
  const ratingMutation = useApplyReviewRating();
  const data = session.data;
  const profile = getActiveDomainProfile();

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
        summary={data.concept.canonicalSummary}
        captures={data.captures}
        onDone={props.onDone}
        onOpenConcept={() => props.onOpenConcept?.(props.conceptId)}
        onOpenCapture={props.onOpenCapture}
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
      sessionStart: sessionStartRef.current,
    });
    setPhase('done');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>{data.concept.name}</Text>
        <TypeNodeChip typeNodeId={data.concept.conceptType} size="md" />
      </View>
      {phase === 'reflect' ? (
        <>
          <Text style={styles.prompt}>{profile.review.reflectPromptTemplate.replace('{conceptName}', data.concept.name)}</Text>
          <ReflectionInput value={reflection} onChangeText={setReflection} />
          <ShowSavedReveal
            summary={data.concept.canonicalSummary}
            captures={data.captures}
            onOpenCapture={props.onOpenCapture}
          />
          <Pressable style={styles.primary} onPress={() => setPhase('rate')}>
            <Text style={styles.primaryText}>{profile.review.reflectSubmitLabel}</Text>
          </Pressable>
        </>
      ) : (
        <SelfRatingPrompt onRate={rate} disabled={ratingMutation.isPending} />
      )}
      {ratingMutation.error ? (
        <Text style={styles.error}>
          {ratingMutation.error instanceof Error ? ratingMutation.error.message : profile.review.reflectErrorLabel}
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
