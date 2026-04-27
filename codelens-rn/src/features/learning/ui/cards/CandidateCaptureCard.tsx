import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, spacing } from '../../../../ui/theme';
import { ConceptTypeChip } from '../primitives/ConceptTypeChip';
import type { ConceptType } from '../../types/learning';
import type { CandidateSaveState } from '../../types/saveModal';

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
  saveState: CandidateSaveState;
  onSave: () => void;
  onInspect: () => void;
  onMakeConcept?: () => void;
}

export function CandidateCaptureCard({
  title,
  whatClicked,
  rawSnippet,
  conceptType,
  linkedConceptName,
  crossLanguageHint,
  extractionConfidence,
  saveState,
  onSave,
  onInspect,
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
        {conceptType ? <ConceptTypeChip type={conceptType} /> : null}
      </View>
      <Text style={styles.clicked} numberOfLines={1}>{whatClicked}</Text>
      <Text style={styles.snippet} numberOfLines={3}>{rawSnippet}</Text>
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
