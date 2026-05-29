import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  getOntologyNodeLabel,
  type DomainProfile,
} from '../../ontology';
import { colors, fontSize, spacing } from '../../../ui/theme';
import type { CandidateCorrectionDraft } from '../state/save-learning';
import type { ConceptualizeMissingConceptReview } from '../types/saveModal';

interface ConceptualizeCorrectionControlsProps {
  profile: DomainProfile;
  draft: CandidateCorrectionDraft;
  missingConcept?: ConceptualizeMissingConceptReview | null;
  disabled?: boolean;
  onChange: (patch: Partial<CandidateCorrectionDraft>) => void;
}

export function ConceptualizeCorrectionControls({
  profile,
  draft,
  missingConcept,
  disabled = false,
  onChange,
}: ConceptualizeCorrectionControlsProps) {
  const suggested = missingConcept?.suggestedNewConcept ?? null;
  const suggestedParentTypeNodeId = suggested?.parentNodeRef
    && profile.ontology.itemTypeNodeIds.includes(suggested.parentNodeRef.nodeId)
    ? suggested.parentNodeRef.nodeId
    : null;
  const canUseSuggestedAsSubtype = !!suggested && (
    suggested.kind === 'category' || suggested.kind === 'subcategory'
  );

  return (
    <View style={styles.container}>
      {missingConcept ? (
        <View style={styles.missingPanel}>
          <Text style={styles.missingTitle}>No strong existing type</Text>
          <Text style={styles.missingBody}>
            {suggested
              ? `${suggested.label}${suggested.parentLabel ? ` under ${suggested.parentLabel}` : ''}`
              : 'Choose an existing type or create a new subtype before saving if this should become structured knowledge.'}
          </Text>
          {suggested ? (
            <Text style={styles.missingReason}>{suggested.reason}</Text>
          ) : null}
          {canUseSuggestedAsSubtype ? (
            <Pressable
              style={[styles.suggestionButton, disabled && styles.suggestionButtonDisabled]}
              disabled={disabled}
              onPress={() => onChange({
                correctedTypeNodeId: suggestedParentTypeNodeId ?? draft.correctedTypeNodeId,
                newTypeLabel: suggested.label,
                newTypeMeaning: suggested.meaning,
                reason: suggested.reason,
              })}
            >
              <Text style={styles.suggestionButtonText}>Use suggestion</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      <Text style={styles.label}>Type</Text>
      <View style={styles.typeGrid}>
        {profile.ontology.itemTypeNodeIds.map((typeNodeId) => {
          const selected = draft.correctedTypeNodeId === typeNodeId;
          return (
            <Pressable
              key={typeNodeId}
              style={[styles.typeButton, selected && styles.typeButtonSelected]}
              disabled={disabled}
              onPress={() => onChange({ correctedTypeNodeId: typeNodeId })}
            >
              <Text
                style={[styles.typeButtonText, selected && styles.typeButtonTextSelected]}
                numberOfLines={1}
              >
                {getOntologyNodeLabel(typeNodeId, profile)}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <TextInput
        editable={!disabled}
        style={styles.input}
        value={draft.newTypeLabel}
        onChangeText={(value) => onChange({ newTypeLabel: value })}
        placeholder="New subtype"
        placeholderTextColor={colors.textSecondary}
      />
      <TextInput
        editable={!disabled}
        style={[styles.input, styles.reasonInput]}
        value={draft.newTypeMeaning}
        onChangeText={(value) => onChange({ newTypeMeaning: value })}
        placeholder="Meaning / use when"
        placeholderTextColor={colors.textSecondary}
        multiline
      />
      <TextInput
        editable={!disabled}
        style={[styles.input, styles.reasonInput]}
        value={draft.reason}
        onChangeText={(value) => onChange({ reason: value })}
        placeholder="Why / why not"
        placeholderTextColor={colors.textSecondary}
        multiline
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  missingPanel: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surfaceLight,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  missingTitle: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  missingBody: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  missingReason: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontStyle: 'italic',
  },
  suggestionButton: {
    alignSelf: 'flex-start',
    minHeight: 36,
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    marginTop: spacing.xs,
  },
  suggestionButtonDisabled: {
    opacity: 0.5,
  },
  suggestionButtonText: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  label: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  typeButton: {
    minHeight: 36,
    maxWidth: 180,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
  },
  typeButtonSelected: {
    borderColor: colors.primaryLight,
    backgroundColor: 'rgba(96,139,219,0.18)',
  },
  typeButtonText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  typeButtonTextSelected: {
    color: colors.text,
    fontWeight: '700',
  },
  input: {
    minHeight: 40,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    color: colors.text,
    fontSize: fontSize.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  reasonInput: {
    minHeight: 64,
    textAlignVertical: 'top',
  },
});
