import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, spacing } from '../../../../ui/theme';
import { getActiveDomainProfile } from '@/src/features/ontology';
import { useOntologyProfile } from '@/src/features/ontology/hooks/useProfileSelection';
import { ConceptCardCompact } from '../../ui/cards/ConceptCardCompact';
import { computeStrength } from '../../strength/computeStrength';
import { useReviewSettings } from '../hooks/useReviewSettings';
import { useWeakConcepts } from '../hooks/useWeakConcepts';
import type { ConceptId } from '../../types/ids';

export function ReviewThresholdScreen(props: {
  profileId?: string | null | undefined;
  onOpenConcept: (conceptId: ConceptId) => void;
  onClose?: () => void;
}) {
  const settings = useReviewSettings();
  const fallbackProfile = getActiveDomainProfile();
  const { data: selectedProfile } = useOntologyProfile(props.profileId);
  const profile = selectedProfile ?? fallbackProfile;
  const { data: concepts = [], isLoading } = useWeakConcepts(settings.weakConceptThreshold, props.profileId);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>{profile.labels.reviewModeTitle}</Text>
          <Text style={styles.subtitle}>{profile.review.thresholdSubtitle}</Text>
        </View>
        {props.onClose ? (
          <Pressable onPress={props.onClose} hitSlop={12}>
            <Text style={styles.close}>{profile.review.thresholdCloseLabel}</Text>
          </Pressable>
        ) : null}
      </View>
      {isLoading ? <ActivityIndicator color={colors.primary} /> : null}
      {!isLoading && concepts.length === 0 ? (
        <Text style={styles.empty}>{profile.review.thresholdEmptyLabel}</Text>
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
            profile={profile}
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
