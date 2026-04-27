import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, spacing } from '../../../../ui/theme';
import { useDismissCluster } from '../hooks/useDismissCluster';
import { usePromotionSuggestion } from '../hooks/usePromotionSuggestion';
import { usePromotionSuggestions } from '../hooks/usePromotionSuggestions';
import { PromotionSuggestionCard } from './PromotionSuggestionCard';

interface PromotionSuggestionsSectionProps {
  onOpenReview: (fingerprint: string) => void;
}

export function PromotionSuggestionsSection({ onOpenReview }: PromotionSuggestionsSectionProps) {
  const { data: suggestions = [] } = usePromotionSuggestions({ limit: 5 });
  const dismissMutation = useDismissCluster();

  if (suggestions.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Promotion Suggestions</Text>
      {suggestions.map((suggestion) => (
        <SuggestionCardLoader
          key={suggestion.fingerprint}
          fingerprint={suggestion.fingerprint}
          onOpenReview={onOpenReview}
          onDismiss={(fingerprint) => dismissMutation.mutate(suggestion)}
        />
      ))}
    </View>
  );
}

function SuggestionCardLoader(props: {
  fingerprint: string;
  onOpenReview: (fingerprint: string) => void;
  onDismiss: (fingerprint: string) => void;
}) {
  const { data } = usePromotionSuggestion(props.fingerprint);
  const suggestion = data?.suggestion;
  const sampleTitles = data?.captures.slice(0, 3).map((capture) => capture.title) ?? [];

  if (!suggestion) return null;
  return (
    <PromotionSuggestionCard
      fingerprint={suggestion.fingerprint}
      proposedName={suggestion.proposedName}
      proposedConceptType={suggestion.proposedConceptType}
      captureCount={suggestion.captureIds.length}
      sessionCount={suggestion.sessionCount}
      sharedKeywords={suggestion.sharedKeywords}
      sampleCaptureTitles={sampleTitles}
      avgExtractionConfidence={suggestion.avgExtractionConfidence}
      onOpenReview={props.onOpenReview}
      onDismiss={props.onDismiss}
    />
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: '800',
    marginBottom: spacing.sm,
  },
});
