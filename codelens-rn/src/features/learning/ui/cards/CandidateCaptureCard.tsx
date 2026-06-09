import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, spacing } from '../../../../ui/theme';
import { TypeNodeChip } from '../primitives/TypeNodeChip';
import type { ConceptType } from '../../types/learning';
import type {
  CandidateSaveState,
  ConceptualizeMissingConceptReview,
  ConceptualizeSuggestedNewConceptReview,
} from '../../types/saveModal';

interface CandidateCaptureCardProps {
  candidateId: string;
  title: string;
  whatClicked: string;
  rawSnippet: string;
  conceptType?: ConceptType | null;
  linkedConceptName?: string | null;
  isNewLanguageForExistingConcept?: boolean;
  crossLanguageHint?: string | null;
  extractionConfidence?: number | null;
  missingConcept?: ConceptualizeMissingConceptReview | null;
  saveState: CandidateSaveState;
  profileProposalId?: string | null | undefined;
  onSave: () => void;
  onInspect: () => void;
  onReviewProposal?: (() => void) | undefined;
  onMakeConcept?: (() => void) | undefined;
}

export function CandidateCaptureCard({
  title,
  whatClicked,
  rawSnippet,
  conceptType,
  linkedConceptName,
  crossLanguageHint,
  extractionConfidence,
  missingConcept,
  saveState,
  profileProposalId,
  onSave,
  onInspect,
  onReviewProposal,
  onMakeConcept,
}: CandidateCaptureCardProps) {
  const isSaving = saveState === 'saving';
  const isSaved = saveState === 'saved';
  const confidenceLow = extractionConfidence !== null && extractionConfidence !== undefined && extractionConfidence < 0.7;
  const canMakeConcept = !linkedConceptName && extractionConfidence !== null && extractionConfidence !== undefined && extractionConfidence >= 0.7;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {conceptType ? <TypeNodeChip typeNodeId={conceptType} /> : null}
      </View>
      <Text style={styles.clicked} numberOfLines={1}>{whatClicked}</Text>
      <Text style={styles.snippet} numberOfLines={3}>{rawSnippet}</Text>
      {missingConcept ? (
        <View style={styles.missingBox}>
          <Text style={styles.missingTitle}>Needs type review</Text>
          <Text style={styles.missingText} numberOfLines={2}>
            {missingConcept.suggestedNewConcept
              ? `Suggested new ${formatSuggestedKind(missingConcept.suggestedNewConcept.kind)}: ${missingConcept.suggestedNewConcept.label}`
              : 'No existing type was a strong enough match.'}
          </Text>
        </View>
      ) : null}
      <View style={styles.metaColumn}>
        {linkedConceptName ? (
          <Text style={styles.metaText} numberOfLines={1}>Related: {linkedConceptName}</Text>
        ) : null}
        {crossLanguageHint ? (
          <Text style={styles.metaText} numberOfLines={1}>{crossLanguageHint}</Text>
        ) : null}
        {confidenceLow ? (
          <Text style={styles.warningText} numberOfLines={1}>Low confidence, saved unresolved if needed</Text>
        ) : null}
      </View>
      <View style={styles.actions}>
        {isSaved && profileProposalId && onReviewProposal ? (
          <Pressable style={styles.inspectButton} onPress={onReviewProposal}>
            <Text style={styles.inspectText}>Review proposal</Text>
          </Pressable>
        ) : null}
        {canMakeConcept && onMakeConcept ? (
          <Pressable style={styles.inspectButton} onPress={onMakeConcept}>
            <Text style={styles.inspectText}>Make concept</Text>
          </Pressable>
        ) : null}
        <Pressable style={styles.inspectButton} onPress={onInspect}>
          <Text style={styles.inspectText}>Inspect</Text>
        </Pressable>
        <Pressable
          style={[styles.saveButton, isSaved && styles.savedButton]}
          onPress={onSave}
          disabled={isSaving || isSaved}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={colors.text} />
          ) : (
            <Text style={styles.saveText}>{isSaved ? 'Saved' : 'Save'}</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surfaceLight,
    padding: spacing.md,
    marginBottom: spacing.md,
    maxHeight: 280,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '700',
    flex: 1,
  },
  clicked: {
    color: colors.text,
    fontSize: fontSize.md,
    marginTop: spacing.sm,
  },
  snippet: {
    color: colors.textSecondary,
    fontFamily: 'monospace',
    fontSize: fontSize.sm,
    marginTop: spacing.sm,
    lineHeight: 18,
  },
  metaColumn: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  metaText: {
    color: colors.primaryLight,
    fontSize: fontSize.sm,
  },
  warningText: {
    color: colors.yellow,
    fontSize: fontSize.sm,
  },
  missingBox: {
    borderWidth: 1,
    borderColor: colors.yellow,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginTop: spacing.sm,
    backgroundColor: 'rgba(234,179,8,0.10)',
  },
  missingTitle: {
    color: colors.yellow,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  missingText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  inspectButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  inspectText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
  },
  saveButton: {
    minHeight: 44,
    minWidth: 92,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
  },
  savedButton: {
    backgroundColor: colors.green,
  },
  saveText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: fontSize.md,
  },
});

function formatSuggestedKind(kind: ConceptualizeSuggestedNewConceptReview['kind']): string {
  switch (kind) {
    case 'relationshipType':
      return 'relationship';
    case 'subcategory':
      return 'subtype';
    default:
      return kind;
  }
}
