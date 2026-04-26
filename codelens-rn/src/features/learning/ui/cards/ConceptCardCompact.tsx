import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, spacing } from '../../../../ui/theme';
import { ConceptTypeChip } from '../primitives/ConceptTypeChip';
import { LanguageChip } from '../primitives/LanguageChip';
import { StrengthIndicator } from '../primitives/StrengthIndicator';
import type { ConceptId } from '../../types/ids';
import type { ConceptType } from '../../types/learning';

interface ConceptCardCompactProps {
  conceptId: ConceptId;
  name: string;
  conceptType: ConceptType;
  strength: number;
  languageOrRuntime: string[];
  canonicalSummary: string | null;
  relationshipLine?: string | null;
  onPress: (conceptId: ConceptId) => void;
}

export function ConceptCardCompact(props: ConceptCardCompactProps) {
  const visibleLanguages = props.languageOrRuntime.slice(0, 2);
  const hiddenCount = Math.max(0, props.languageOrRuntime.length - visibleLanguages.length);

  return (
    <Pressable style={styles.card} onPress={() => props.onPress(props.conceptId)}>
      <View style={styles.headerRow}>
        <Text style={styles.name} numberOfLines={1}>{props.name}</Text>
        <StrengthIndicator strength={props.strength} />
      </View>
      <View style={styles.metaRow}>
        <ConceptTypeChip type={props.conceptType} />
        {visibleLanguages.map((language) => <LanguageChip key={language} label={language} />)}
        {hiddenCount > 0 ? <Text style={styles.moreText}>+{hiddenCount}</Text> : null}
      </View>
      {props.canonicalSummary ? (
        <Text style={styles.summary} numberOfLines={2}>{props.canonicalSummary}</Text>
      ) : null}
      {props.relationshipLine ? (
        <Text style={styles.relationship} numberOfLines={1}>{props.relationshipLine}</Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  name: {
    color: colors.text,
    flex: 1,
    fontSize: fontSize.lg,
    fontWeight: '800',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  moreText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  summary: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: spacing.sm,
  },
  relationship: {
    color: colors.primaryLight,
    fontSize: fontSize.sm,
    marginTop: spacing.sm,
  },
});
