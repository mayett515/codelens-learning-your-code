import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, spacing } from '../../../../ui/theme';
import { ConceptCardCompact } from '../../ui/cards/ConceptCardCompact';
import { computeStrength } from '../../strength/computeStrength';
import { useReviewSettings } from '../hooks/useReviewSettings';
import { useWeakConcepts } from '../hooks/useWeakConcepts';
import type { ConceptId } from '../../types/ids';

export function ReviewThresholdScreen(props: {
  onOpenConcept: (conceptId: ConceptId) => void;
  onClose?: () => void;
}) {
  const settings = useReviewSettings();
  const { data: concepts = [], isLoading } = useWeakConcepts(settings.weakConceptThreshold);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Review Mode</Text>
          <Text style={styles.subtitle}>Browse concepts below your refresh threshold.</Text>
        </View>
        {props.onClose ? (
          <Pressable onPress={props.onClose} hitSlop={12}>
            <Text style={styles.close}>Close</Text>
          </Pressable>
        ) : null}
      </View>
      {isLoading ? <ActivityIndicator color={colors.primary} /> : null}
      {!isLoading && concepts.length === 0 ? (
        <Text style={styles.empty}>No concepts under your refresh threshold.</Text>
      ) : null}
      <ScrollView contentContainerStyle={styles.list}>
        {concepts.map((concept) => (
          <ConceptCardCompact
            key={concept.id}
            conceptId={concept.id}
            name={concept.name}
            conceptType={concept.conceptType}
            strength={computeStrength(concept.familiarityScore, concept.importanceScore)}
            languageOrRuntime={concept.languageOrRuntime}
            canonicalSummary={concept.canonicalSummary}
            onPress={props.onOpenConcept}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  headerText: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  close: {
    color: colors.primaryLight,
    fontWeight: '700',
  },
  empty: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
  },
  list: {
    paddingBottom: spacing.xl,
  },
});
