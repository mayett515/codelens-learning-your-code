import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, spacing } from '../../../ui/theme';
import { computeStrength } from '../strength/computeStrength';
import type { ConceptId } from '../types/ids';
import type { LearningConcept } from '../types/learning';

interface KnowledgeHealthScreenProps {
  concepts: LearningConcept[];
  onOpenConcept: (id: ConceptId) => void;
}

export function KnowledgeHealthScreen({ concepts, onOpenConcept }: KnowledgeHealthScreenProps) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Knowledge Health</Text>
      {concepts.length === 0 ? (
        <Text style={styles.empty}>Save a few captures to see your knowledge map.</Text>
      ) : (
        concepts.map((concept) => {
          const strength = computeStrength(concept.familiarityScore, concept.importanceScore);
          return (
            <Pressable key={concept.id} style={styles.row} onPress={() => onOpenConcept(concept.id)}>
              <View style={styles.rowHeader}>
                <Text style={styles.name} numberOfLines={1}>{concept.name}</Text>
                <Text style={styles.percent}>{Math.round(strength * 100)}%</Text>
              </View>
              <View style={styles.rail}>
                <View style={[styles.fill, { width: `${Math.round(strength * 100)}%` as `${number}%` }]} />
              </View>
            </Pressable>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.xxl,
    fontWeight: '800',
    marginBottom: spacing.lg,
  },
  row: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.md,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  name: {
    color: colors.text,
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  percent: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  rail: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfaceLight,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.green,
  },
  empty: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
  },
});
