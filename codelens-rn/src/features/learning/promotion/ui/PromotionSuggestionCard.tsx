import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, spacing } from '../../../../ui/theme';
import { ConceptTypeChip } from '../../ui/primitives/ConceptTypeChip';
import { LanguageChip } from '../../ui/primitives/LanguageChip';
import type { ConceptType } from '../../types/learning';

interface PromotionSuggestionCardProps {
  fingerprint: string;
  proposedName: string;
  proposedConceptType: ConceptType;
  captureCount: number;
  sessionCount: number;
  sharedKeywords: string[];
  sampleCaptureTitles: string[];
  avgExtractionConfidence: number;
  onOpenReview: (fingerprint: string) => void;
  onDismiss: (fingerprint: string) => void;
}

export function PromotionSuggestionCard(props: PromotionSuggestionCardProps) {
  const visibleKeywords = props.sharedKeywords.slice(0, 2);
  const hiddenKeywordCount = Math.max(0, props.sharedKeywords.length - visibleKeywords.length);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title} numberOfLines={1}>{props.proposedName}</Text>
        <ConceptTypeChip type={props.proposedConceptType} />
      </View>
      <Text style={styles.meta}>
        From {props.captureCount} captures across {props.sessionCount} sessions
      </Text>
      <View style={styles.keywordRow}>
        {visibleKeywords.map((keyword) => <LanguageChip key={keyword} label={keyword} />)}
        {hiddenKeywordCount > 0 ? <Text style={styles.moreText}>+{hiddenKeywordCount}</Text> : null}
      </View>
      {props.sampleCaptureTitles.slice(0, 3).map((title) => (
        <Text key={title} style={styles.sampleTitle} numberOfLines={1}>{title}</Text>
      ))}
      <View style={styles.actions}>
        <Pressable style={styles.secondaryButton} onPress={() => props.onDismiss(props.fingerprint)}>
          <Text style={styles.secondaryText}>Dismiss</Text>
        </Pressable>
        <Pressable style={styles.primaryButton} onPress={() => props.onOpenReview(props.fingerprint)}>
          <Text style={styles.primaryText}>Review</Text>
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
    backgroundColor: colors.surface,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    color: colors.text,
    flex: 1,
    fontSize: fontSize.lg,
    fontWeight: '800',
  },
  meta: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: spacing.sm,
  },
  keywordRow: {
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
  sampleTitle: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  secondaryButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  secondaryText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
  },
  primaryButton: {
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
  },
  primaryText: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
});
