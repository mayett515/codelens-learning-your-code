import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, spacing } from '../../../ui/theme';
import { computeStrength } from '../strength/computeStrength';
import { ConceptCardCompact } from './cards/ConceptCardCompact';
import type { ConceptId } from '../types/ids';
import type { LearningConcept } from '../types/learning';

interface ConceptListSectionProps {
  concepts: LearningConcept[];
  onOpenConcept: (id: ConceptId) => void;
}

export function ConceptListSection({ concepts, onOpenConcept }: ConceptListSectionProps) {
  if (concepts.length === 0) {
    return (
      <View style={styles.section}>
        <SectionHeader title="Concept List" />
        <Text style={styles.empty}>Concepts appear after related captures are grouped.</Text>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <SectionHeader title="Concept List" meta="Weakest first" />
      {concepts.map((concept) => (
        <ConceptCardCompact
          key={concept.id}
          conceptId={concept.id}
          name={concept.name}
          conceptType={concept.conceptType}
          strength={computeStrength(concept.familiarityScore, concept.importanceScore)}
          languageOrRuntime={concept.languageOrRuntime}
          canonicalSummary={concept.canonicalSummary}
          relationshipLine={relationshipLine(concept)}
          onPress={onOpenConcept}
        />
      ))}
    </View>
  );
}

function relationshipLine(concept: LearningConcept): string | null {
  const relatedCount =
    concept.prerequisites.length + concept.relatedConcepts.length + concept.contrastConcepts.length;
  if (relatedCount === 0) return null;
  return `${relatedCount} related idea${relatedCount === 1 ? '' : 's'}`;
}

function SectionHeader({ title, meta }: { title: string; meta?: string }) {
  return (
    <View style={styles.headerRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {meta ? <Text style={styles.meta}>{meta}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: '800',
  },
  meta: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  empty: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    paddingVertical: spacing.md,
  },
});
