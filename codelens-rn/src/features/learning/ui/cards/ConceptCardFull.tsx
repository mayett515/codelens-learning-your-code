import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, spacing } from '../../../../ui/theme';
import { ConceptTypeChip } from '../primitives/ConceptTypeChip';
import { LanguageChip } from '../primitives/LanguageChip';
import { StrengthIndicator } from '../primitives/StrengthIndicator';
import type { ConceptId, LearningCaptureId } from '../../types/ids';
import type { ConceptType } from '../../types/learning';

interface ConceptCardFullProps {
  conceptId: ConceptId;
  name: string;
  conceptType: ConceptType;
  strength: number;
  canonicalSummary: string | null;
  coreConcept?: string | null;
  architecturalPattern?: string | null;
  programmingParadigm?: string | null;
  languageOrRuntime: string[];
  surfaceFeatures: string[];
  keywords?: string[];
  prerequisites: Array<{ id: ConceptId; name: string }>;
  relatedConcepts: Array<{ id: ConceptId; name: string }>;
  contrastConcepts: Array<{ id: ConceptId; name: string }>;
  linkedCaptures: Array<{
    id: LearningCaptureId;
    title: string;
    whatClicked: string;
    sessionId?: string | null;
    sessionLabel?: string | null;
    languageOrRuntime?: string | null;
    createdAt: number;
  }>;
  representativeCaptureIds: LearningCaptureId[];
  originSessions: Array<{
    sessionId: string;
    sessionLabel: string;
    captureCount: number;
    lastCaptureAt: number;
    projectLabel?: string | null;
  }>;
  onStartReview: () => void;
  onViewGraph: () => void;
  onOpenConcept: (id: ConceptId) => void;
  onOpenCapture: (id: LearningCaptureId) => void;
  onJumpToSession?: (sessionId: string) => void;
}

export function ConceptCardFull(props: ConceptCardFullProps) {
  const representativeSet = new Set(props.representativeCaptureIds);
  return (
    <ScrollView style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.name}>{props.name}</Text>
        <StrengthIndicator strength={props.strength} size="md" />
      </View>
      <ConceptTypeChip type={props.conceptType} size="md" />
      {props.canonicalSummary ? <Text style={styles.summary}>{props.canonicalSummary}</Text> : null}
      <View style={styles.actions}>
        <Action label="Start Review" onPress={props.onStartReview} />
        <Action label="View in Graph" onPress={props.onViewGraph} />
      </View>

      <Section title="Abstraction">
        <Meta label="Core" value={props.coreConcept} />
        <Meta label="Pattern" value={props.architecturalPattern} />
        <Meta label="Paradigm" value={props.programmingParadigm} />
      </Section>

      <Section title="Context">
        <ChipRow values={props.languageOrRuntime} />
        <ChipRow values={props.surfaceFeatures} />
        <ChipRow values={props.keywords ?? []} />
      </Section>

      {props.originSessions.length > 0 ? (
        <Section title="Where You Learned This">
          {props.originSessions.map((session) => (
            <Pressable
              key={session.sessionId}
              style={styles.sessionRow}
              onPress={() => props.onJumpToSession?.(session.sessionId)}
            >
              <Text style={styles.sessionTitle}>{session.sessionLabel}</Text>
              <Text style={styles.sessionMeta}>
                {session.captureCount} capture{session.captureCount === 1 ? '' : 's'}
                {session.projectLabel ? ` · ${session.projectLabel}` : ''}
              </Text>
            </Pressable>
          ))}
        </Section>
      ) : null}

      <Section title="Learning Structure">
        <ConceptLinks label="Prerequisites" items={props.prerequisites} onOpenConcept={props.onOpenConcept} />
        <ConceptLinks label="Related" items={props.relatedConcepts} onOpenConcept={props.onOpenConcept} />
        <ConceptLinks label="Contrast" items={props.contrastConcepts} onOpenConcept={props.onOpenConcept} />
      </Section>

      <Section title="Evidence">
        {props.linkedCaptures.map((capture) => (
          <Pressable key={capture.id} style={styles.captureRow} onPress={() => props.onOpenCapture(capture.id)}>
            <Text style={styles.captureTitle} numberOfLines={1}>
              {representativeSet.has(capture.id) ? 'Representative · ' : ''}{capture.title}
            </Text>
            <Text style={styles.captureText} numberOfLines={1}>{capture.whatClicked}</Text>
          </Pressable>
        ))}
      </Section>
    </ScrollView>
  );
}

function Action(props: { label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.action} onPress={props.onPress}>
      <Text style={styles.actionText}>{props.label}</Text>
    </Pressable>
  );
}

function Section(props: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{props.title}</Text>
      {props.children}
    </View>
  );
}

function Meta(props: { label: string; value?: string | null | undefined }) {
  if (!props.value) return null;
  return <Text style={styles.metaText}>{props.label}: {props.value}</Text>;
}

function ChipRow(props: { values: string[] }) {
  if (props.values.length === 0) return null;
  return (
    <View style={styles.chipRow}>
      {props.values.map((value) => <LanguageChip key={value} label={value} />)}
    </View>
  );
}

function ConceptLinks(props: {
  label: string;
  items: Array<{ id: ConceptId; name: string }>;
  onOpenConcept: (id: ConceptId) => void;
}) {
  if (props.items.length === 0) return null;
  return (
    <View style={styles.linkBlock}>
      <Text style={styles.metaText}>{props.label}</Text>
      {props.items.map((item) => (
        <Pressable key={item.id} onPress={() => props.onOpenConcept(item.id)}>
          <Text style={styles.linkText}>{item.name}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  name: {
    color: colors.text,
    flex: 1,
    fontSize: fontSize.xxl,
    fontWeight: '800',
  },
  summary: {
    color: colors.text,
    fontSize: fontSize.md,
    lineHeight: 21,
    marginTop: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  action: {
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
  },
  actionText: {
    color: colors.text,
    fontWeight: '700',
  },
  section: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    textTransform: 'uppercase',
  },
  metaText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  sessionRow: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
  },
  sessionTitle: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  sessionMeta: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  linkBlock: {
    gap: spacing.xs,
  },
  linkText: {
    color: colors.primaryLight,
    fontSize: fontSize.md,
  },
  captureRow: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.sm,
  },
  captureTitle: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  captureText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
});
