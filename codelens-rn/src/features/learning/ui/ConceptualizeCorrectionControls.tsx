import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  getOntologyNodeLabel,
  type DomainProfile,
} from '../../ontology';
import { colors, fontSize, spacing } from '../../../ui/theme';
import type { CandidateCorrectionDraft } from '../state/save-learning';

interface ConceptualizeCorrectionControlsProps {
  profile: DomainProfile;
  draft: CandidateCorrectionDraft;
  disabled?: boolean;
  onChange: (patch: Partial<CandidateCorrectionDraft>) => void;
}

export function ConceptualizeCorrectionControls({
  profile,
  draft,
  disabled = false,
  onChange,
}: ConceptualizeCorrectionControlsProps) {
  return (
    <View style={styles.container}>
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
