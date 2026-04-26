import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, spacing } from '../../../../ui/theme';
import { ConceptTypeChip } from '../primitives/ConceptTypeChip';
import { SourceBreadcrumb } from '../primitives/SourceBreadcrumb';
import { StateChip } from '../primitives/StateChip';
import type { ConceptId, LearningCaptureId } from '../../types/ids';
import type { CaptureState, ConceptType } from '../../types/learning';

interface CaptureCardFullProps {
  captureId?: LearningCaptureId;
  title: string;
  conceptType?: ConceptType | null;
  state?: CaptureState;
  whatClicked: string;
  whyItMattered: string | null;
  rawSnippet: string;
  snippetLang?: string | null;
  snippetSourcePath?: string | null;
  snippetStartLine?: number | null;
  snippetEndLine?: number | null;
  relativeTime?: string | null;
  sessionLabel?: string | null;
  linkedConcept?: {
    id: ConceptId;
    name: string;
    summary?: string | null;
  } | null;
  derivedFromCaptureId?: LearningCaptureId | null;
  derivedChildrenCount?: number;
  editableUntil?: number | null;
  now?: number;
  onContinue?: () => void;
  onEdit?: () => void;
  onLinkConcept?: () => void;
  onUnlinkConcept?: () => void;
  onDelete?: () => void;
}

export function CaptureCardFull(props: CaptureCardFullProps) {
  const canEdit = props.editableUntil ? (props.now ?? Date.now()) <= props.editableUntil : false;
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{props.title}</Text>
        {props.conceptType ? <ConceptTypeChip type={props.conceptType} size="md" /> : null}
      </View>
      {props.state ? <StateChip state={props.state} /> : null}
      <SourceBreadcrumb
        filePath={props.snippetSourcePath}
        startLine={props.snippetStartLine}
        endLine={props.snippetEndLine}
        relativeTime={props.relativeTime ?? undefined}
        sessionLabel={props.sessionLabel}
      />
      <Text style={styles.sectionTitle}>What clicked</Text>
      <Text style={styles.bodyText}>{props.whatClicked}</Text>
      {props.whyItMattered ? (
        <>
          <Text style={styles.sectionTitle}>Why it mattered</Text>
          <Text style={styles.bodyText}>{props.whyItMattered}</Text>
        </>
      ) : null}
      <Text style={styles.sectionTitle}>Snippet</Text>
      <ScrollView style={styles.snippetBox}>
        <Text style={styles.snippet}>{props.rawSnippet}</Text>
      </ScrollView>
      {props.linkedConcept ? (
        <View style={styles.linkedBox}>
          <Text style={styles.linkedTitle}>{props.linkedConcept.name}</Text>
          {props.linkedConcept.summary ? (
            <Text style={styles.linkedSummary}>{props.linkedConcept.summary}</Text>
          ) : null}
        </View>
      ) : null}
      {props.derivedFromCaptureId || props.derivedChildrenCount ? (
        <Text style={styles.chainText}>
          {props.derivedFromCaptureId ? 'Continues another capture' : ''}
          {props.derivedChildrenCount ? ` · ${props.derivedChildrenCount} follow-ups` : ''}
        </Text>
      ) : null}
      <View style={styles.actions}>
        {props.onContinue ? <Action label="Continue" onPress={props.onContinue} /> : null}
        {canEdit && props.onEdit ? <Action label="Edit" onPress={props.onEdit} /> : null}
        {props.onLinkConcept ? <Action label="Link" onPress={props.onLinkConcept} /> : null}
        {props.onUnlinkConcept ? <Action label="Unlink" onPress={props.onUnlinkConcept} /> : null}
        {props.onDelete ? <Action label="Delete" onPress={props.onDelete} danger /> : null}
      </View>
    </View>
  );
}

function Action(props: { label: string; onPress: () => void; danger?: boolean }) {
  return (
    <Pressable style={styles.action} onPress={props.onPress}>
      <Text style={[styles.actionText, props.danger && styles.dangerText]}>{props.label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  title: {
    color: colors.text,
    flex: 1,
    fontSize: fontSize.xl,
    fontWeight: '800',
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: spacing.md,
    textTransform: 'uppercase',
  },
  bodyText: {
    color: colors.text,
    fontSize: fontSize.md,
    lineHeight: 21,
  },
  snippetBox: {
    maxHeight: 220,
    borderRadius: 8,
    backgroundColor: colors.background,
    padding: spacing.md,
  },
  snippet: {
    color: colors.text,
    fontFamily: 'monospace',
    fontSize: fontSize.sm,
    lineHeight: 19,
  },
  linkedBox: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  linkedTitle: {
    color: colors.primaryLight,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  linkedSummary: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  chainText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  action: {
    minHeight: 40,
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: spacing.md,
  },
  actionText: {
    color: colors.text,
    fontSize: fontSize.md,
  },
  dangerText: {
    color: colors.red,
  },
});
