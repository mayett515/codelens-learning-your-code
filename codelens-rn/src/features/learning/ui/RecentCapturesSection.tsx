import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, spacing } from '../../../ui/theme';
import { CaptureCardCompact } from './cards/CaptureCardCompact';
import type { ConceptId, LearningCaptureId } from '../types/ids';
import type { LearningCapture, LearningConcept } from '../types/learning';

interface RecentCapturesSectionProps {
  captures: LearningCapture[];
  conceptsById: Map<ConceptId, LearningConcept>;
  onOpenCapture: (id: LearningCaptureId) => void;
}

export function RecentCapturesSection({
  captures,
  conceptsById,
  onOpenCapture,
}: RecentCapturesSectionProps) {
  if (captures.length === 0) {
    return <EmptySection title="Recent Captures" text="Save something that clicked while reading code." />;
  }

  return (
    <View style={styles.section}>
      <SectionHeader title="Recent Captures" meta={`Newest ${captures.length}`} />
      {captures.map((capture) => (
        <CaptureCardCompact
          key={capture.id}
          captureId={capture.id}
          title={capture.title}
          state={capture.state}
          whatClicked={capture.whatClicked}
          linkedConceptName={
            capture.linkedConceptId ? conceptsById.get(capture.linkedConceptId)?.name ?? null : null
          }
          sourceLabel={capture.sessionId ?? capture.snippetSource?.path ?? null}
          relativeTime={formatRelativeDate(capture.createdAt)}
          onPress={onOpenCapture}
        />
      ))}
    </View>
  );
}

function SectionHeader({ title, meta }: { title: string; meta?: string }) {
  return (
    <View style={styles.headerRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {meta ? <Text style={styles.meta}>{meta}</Text> : null}
    </View>
  );
}

function EmptySection({ title, text }: { title: string; text: string }) {
  return (
    <View style={styles.section}>
      <SectionHeader title={title} />
      <Text style={styles.empty}>{text}</Text>
    </View>
  );
}

function formatRelativeDate(ms: number): string {
  return new Date(ms).toLocaleDateString();
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
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
