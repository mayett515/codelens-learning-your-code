import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, spacing } from '../../../ui/theme';
import { computeStrength } from '../strength/computeStrength';
import type { LearningConcept } from '../types/learning';

interface KnowledgeHealthEntryProps {
  concepts: LearningConcept[];
  onOpen: () => void;
}

export function KnowledgeHealthEntry({ concepts, onOpen }: KnowledgeHealthEntryProps) {
  if (concepts.length === 0) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Knowledge Health</Text>
        <Text style={styles.empty}>Save a few captures to see your knowledge map.</Text>
      </View>
    );
  }

  const weakest = concepts[0];
  const strength = computeStrength(weakest.familiarityScore, weakest.importanceScore);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Knowledge Health</Text>
      <Pressable style={styles.entry} onPress={onOpen}>
        <View style={styles.gradientRail}>
          <View style={[styles.gradientFill, { width: `${Math.round(strength * 100)}%` as `${number}%` }]} />
        </View>
        <Text style={styles.entryTitle}>Weakest concept: {weakest.name}</Text>
        <Text style={styles.entryMeta}>{Math.round(strength * 100)}% strength</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: '800',
    marginBottom: spacing.sm,
  },
  entry: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  gradientRail: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surfaceLight,
    overflow: 'hidden',
  },
  gradientFill: {
    height: '100%',
    backgroundColor: colors.green,
  },
  entryTitle: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '700',
    marginTop: spacing.md,
  },
  entryMeta: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  empty: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    paddingVertical: spacing.md,
  },
});
