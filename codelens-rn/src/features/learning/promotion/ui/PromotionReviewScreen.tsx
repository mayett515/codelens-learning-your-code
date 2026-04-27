import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, fontSize, spacing } from '../../../../ui/theme';
import { CaptureCardCompact } from '../../ui/cards/CaptureCardCompact';
import { LanguageChip } from '../../ui/primitives/LanguageChip';
import { CONCEPT_TYPES, type ConceptType, type LearningConcept } from '../../types/learning';
import { useLinkClusterToExisting } from '../hooks/useLinkClusterToExisting';
import { usePromoteConcept } from '../hooks/usePromoteConcept';
import { usePromotionSuggestion } from '../hooks/usePromotionSuggestion';
import { useSingleCapturePromotion } from '../hooks/useSingleCapturePromotion';
import { NormalizedKeyConflictDialog } from './NormalizedKeyConflictDialog';
import { NormalizedKeyConflictError } from '../types/promotion';
import type { LearningCaptureId } from '../../types/ids';
import type { PromotionReviewModel } from '../types/promotion';

interface PromotionReviewScreenProps {
  fingerprint?: string | null;
  singleCaptureId?: LearningCaptureId | null;
  onComplete: (conceptId: string) => void;
  onCancel?: () => void;
}

export function PromotionReviewScreen({
  fingerprint = null,
  singleCaptureId = null,
  onComplete,
  onCancel,
}: PromotionReviewScreenProps) {
  const { data: clusterData } = usePromotionSuggestion(fingerprint);
  const { data: singleData } = useSingleCapturePromotion(singleCaptureId);
  const reviewModel = toReviewModel(clusterData, singleData);
  const captures = reviewModel?.captures ?? [];
  const [name, setName] = useState('');
  const [conceptType, setConceptType] = useState<ConceptType>('mental_model');
  const [includedIds, setIncludedIds] = useState<Set<LearningCaptureId>>(new Set());
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [canonicalSummary, setCanonicalSummary] = useState('');
  const [coreConcept, setCoreConcept] = useState('');
  const [architecturalPattern, setArchitecturalPattern] = useState('');
  const [programmingParadigm, setProgrammingParadigm] = useState('');
  const [conflict, setConflict] = useState<LearningConcept | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const promoteMutation = usePromoteConcept();
  const linkExistingMutation = useLinkClusterToExisting();

  useEffect(() => {
    if (!reviewModel) return;
    setName((current) => current || reviewModel.proposedName);
    setConceptType(reviewModel.proposedConceptType);
    setIncludedIds((current) => current.size > 0 ? current : new Set(reviewModel.captures.map((capture) => capture.id)));
  }, [reviewModel]);

  const includedCaptureIds = [...includedIds];
  const canConfirm = name.trim().length > 0 && includedCaptureIds.length > 0;

  async function confirm() {
    if (!reviewModel || !canConfirm) return;
    setErrorMessage(null);
    try {
      const result = await promoteMutation.mutateAsync({
        fingerprint: reviewModel.fingerprint,
        name,
        conceptType,
        includedCaptureIds,
        canonicalSummary: canonicalSummary || null,
        coreConcept: coreConcept || null,
        architecturalPattern: architecturalPattern || null,
        programmingParadigm: programmingParadigm || null,
        source: reviewModel.source,
      });
      onComplete(result.conceptId);
    } catch (error) {
      if (error instanceof NormalizedKeyConflictError) {
        setConflict(error.concept);
        return;
      }
      setErrorMessage(error instanceof Error ? error.message : 'Promotion failed');
    }
  }

  async function linkExisting() {
    if (!conflict || !reviewModel) return;
    setErrorMessage(null);
    try {
      const result = await linkExistingMutation.mutateAsync({
        fingerprint: reviewModel.fingerprint,
        targetConceptId: conflict.id,
        includedCaptureIds,
        sharedKeywords: reviewModel.sharedKeywords,
      });
      onComplete(result.conceptId);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Link failed');
    }
  }

  if (!reviewModel) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Promotion Review</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Promotion Review</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Concept name"
        placeholderTextColor={colors.textSecondary}
      />
      <View style={styles.typeRow}>
        {CONCEPT_TYPES.map((type) => (
          <Pressable
            key={type}
            style={[styles.typeButton, conceptType === type && styles.typeButtonActive]}
            onPress={() => setConceptType(type)}
          >
            <Text style={[styles.typeText, conceptType === type && styles.typeTextActive]}>{type}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.chipRow}>
        {reviewModel.sharedKeywords.map((keyword) => <LanguageChip key={keyword} label={keyword} />)}
      </View>
      {reviewModel.source === 'cluster' && includedIds.size < 2 ? (
        <Text style={styles.warning}>
          Keep at least two captures when this came from a cluster.
        </Text>
      ) : null}
      {captures.map((capture) => {
        const included = includedIds.has(capture.id);
        return (
          <View key={capture.id} style={styles.captureRow}>
            <Pressable
              style={[styles.includeBox, included && styles.includeBoxActive]}
              onPress={() => {
                setIncludedIds((current) => {
                  const next = new Set(current);
                  if (next.has(capture.id)) next.delete(capture.id);
                  else next.add(capture.id);
                  return next;
                });
              }}
            >
              <Text style={styles.includeText}>{included ? 'Included' : 'Include'}</Text>
            </Pressable>
            <CaptureCardCompact
              captureId={capture.id}
              title={capture.title}
              state={capture.state}
              whatClicked={capture.whatClicked}
              sourceLabel={capture.sessionId}
              relativeTime={new Date(capture.createdAt).toLocaleDateString()}
              onPress={() => undefined}
            />
          </View>
        );
      })}
      <Pressable style={styles.advancedToggle} onPress={() => setAdvancedOpen((value) => !value)}>
        <Text style={styles.advancedToggleText}>Advanced</Text>
      </Pressable>
      {advancedOpen ? (
        <View style={styles.advanced}>
          <TextInput style={styles.input} value={canonicalSummary} onChangeText={setCanonicalSummary} placeholder="Canonical summary" placeholderTextColor={colors.textSecondary} multiline />
          <TextInput style={styles.input} value={coreConcept} onChangeText={setCoreConcept} placeholder="Core concept" placeholderTextColor={colors.textSecondary} />
          <TextInput style={styles.input} value={architecturalPattern} onChangeText={setArchitecturalPattern} placeholder="Architectural pattern" placeholderTextColor={colors.textSecondary} />
          <TextInput style={styles.input} value={programmingParadigm} onChangeText={setProgrammingParadigm} placeholder="Programming paradigm" placeholderTextColor={colors.textSecondary} />
        </View>
      ) : null}
      <NormalizedKeyConflictDialog
        concept={conflict}
        onEditName={() => setConflict(null)}
        onLinkExisting={linkExisting}
      />
      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
      {onCancel ? (
        <Pressable style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      ) : null}
      <Pressable
        style={[styles.confirmButton, !canConfirm && styles.confirmButtonDisabled]}
        onPress={confirm}
        disabled={!canConfirm || promoteMutation.isPending}
      >
        <Text style={styles.confirmText}>Confirm Concept</Text>
      </Pressable>
    </ScrollView>
  );
}

function toReviewModel(
  clusterData: ReturnType<typeof usePromotionSuggestion>['data'],
  singleData: PromotionReviewModel | null | undefined,
): PromotionReviewModel | null {
  if (singleData) return singleData;
  if (!clusterData) return null;
  return {
    fingerprint: clusterData.suggestion.fingerprint,
    proposedName: clusterData.suggestion.proposedName,
    proposedConceptType: clusterData.suggestion.proposedConceptType,
    captures: clusterData.captures,
    sharedKeywords: clusterData.suggestion.sharedKeywords,
    source: 'cluster',
  };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.xxl,
    fontWeight: '800',
    marginBottom: spacing.md,
  },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface,
    color: colors.text,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  typeButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  typeButtonActive: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}20`,
  },
  typeText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  typeTextActive: {
    color: colors.text,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  warning: {
    color: colors.yellow,
    fontSize: fontSize.sm,
    marginTop: spacing.md,
  },
  captureRow: {
    marginTop: spacing.md,
  },
  includeBox: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  includeBoxActive: {
    borderColor: colors.primary,
  },
  includeText: {
    color: colors.text,
    fontSize: fontSize.sm,
  },
  advancedToggle: {
    minHeight: 44,
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  advancedToggleText: {
    color: colors.primaryLight,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  advanced: {
    marginTop: spacing.sm,
  },
  confirmButton: {
    minHeight: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary,
    marginTop: spacing.lg,
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  cancelButton: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  cancelText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
  },
  errorText: {
    color: colors.red,
    fontSize: fontSize.sm,
    marginTop: spacing.md,
  },
  confirmText: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '800',
  },
});
