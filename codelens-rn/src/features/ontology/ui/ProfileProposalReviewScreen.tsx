import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, fontSize, spacing } from '../../../ui/theme';
import { useApplyProfileChangeProposal } from '../hooks/useApplyProfileChangeProposal';
import { useEditProfileChangeProposal } from '../hooks/useEditProfileChangeProposal';
import { usePendingProfileChangeProposals } from '../hooks/useProfileChangeProposals';
import { useProfileProposalFreshness } from '../hooks/useProfileProposalFreshness';
import { useProfileProposalEventsForProposal } from '../hooks/useProfileProposalEvents';
import { useRefreshProfileChangeProposal } from '../hooks/useRefreshProfileChangeProposal';
import {
  useAskWhyProfileChangeProposal,
  useReviewProfileChangeProposal,
} from '../hooks/useReviewProfileChangeProposal';
import type { ProfileChangeProposal, ProfileProposalEvent } from '../types';
import {
  buildEditedProposalDraft,
  createProposalEditorModel,
  formatApplyActionLabel,
  formatApplySuccessMessage,
  formatConfidence,
  formatProposalFreshnessDescription,
  formatProposalFreshnessLabel,
  formatProposalEventSummary,
  formatProposalEventTimestamp,
  formatProposalReviewError,
  formatRefreshSuccessMessage,
  formatRiskDescription,
  formatTarget,
  type ProposalEditorDraftState,
  summarizePatch,
} from './profileProposalReviewPresentation';

type ReviewMessage = {
  tone: 'notice' | 'error';
  text: string;
};

interface ProfileProposalReviewScreenProps {
  initialProposalId?: string | null;
  onClose?: (() => void) | undefined;
}

export function ProfileProposalReviewScreen({
  initialProposalId,
  onClose,
}: ProfileProposalReviewScreenProps = {}) {
  const { data: proposals = [], isLoading } = usePendingProfileChangeProposals();
  const applyMutation = useApplyProfileChangeProposal();
  const editMutation = useEditProfileChangeProposal();
  const refreshMutation = useRefreshProfileChangeProposal();
  const reviewMutation = useReviewProfileChangeProposal();
  const askWhyMutation = useAskWhyProfileChangeProposal();
  const [selectedId, setSelectedId] = useState<string | null>(initialProposalId ?? null);
  const [showReason, setShowReason] = useState(false);
  const [editDraft, setEditDraft] = useState<ProposalEditorDraftState | null>(null);
  const [askedWhyProposalIds, setAskedWhyProposalIds] = useState<ReadonlySet<string>>(() => new Set());
  const [message, setMessage] = useState<ReviewMessage | null>(null);

  useEffect(() => {
    setSelectedId(initialProposalId ?? null);
  }, [initialProposalId]);

  const selectedProposal = useMemo(() => {
    const selected = selectedId
      ? proposals.find((proposal) => proposal.id === selectedId)
      : undefined;
    if (selected) return selected;
    return selectedId ? undefined : proposals[0];
  }, [proposals, selectedId]);
  const { data: proposalEvents = [], isLoading: eventsLoading } = useProfileProposalEventsForProposal(
    selectedProposal?.id ?? null,
  );
  const {
    data: proposalFreshness,
    isLoading: freshnessLoading,
  } = useProfileProposalFreshness(selectedProposal);
  const editorModel = useMemo(
    () => selectedProposal ? createProposalEditorModel(selectedProposal) : null,
    [selectedProposal],
  );
  const busy = applyMutation.isPending ||
    editMutation.isPending ||
    refreshMutation.isPending ||
    reviewMutation.isPending ||
    askWhyMutation.isPending;
  const targetSupported = selectedProposal?.target.kind === 'profile_branch' || selectedProposal?.target.kind === 'base_profile';
  const canApplySelected = Boolean(targetSupported && proposalFreshness?.canApply);
  const canRefreshSelected = Boolean(targetSupported && proposalFreshness?.canRefresh);

  useEffect(() => {
    setEditDraft(null);
  }, [selectedProposal?.id, selectedProposal?.updatedAt]);

  async function apply(proposal: ProfileChangeProposal) {
    setMessage(null);
    setShowReason(false);
    if (proposal.target.kind !== 'profile_branch' && proposal.target.kind !== 'base_profile') {
      setMessage({ tone: 'error', text: formatProposalReviewError({ code: 'proposal_target_not_supported' }) });
      return;
    }
    if (!proposalFreshness?.canApply) {
      setMessage({ tone: 'error', text: formatProposalFreshnessDescription(proposalFreshness) });
      return;
    }
    try {
      await applyMutation.mutateAsync(proposal);
      setMessage({ tone: 'notice', text: formatApplySuccessMessage(proposal) });
      setSelectedId(null);
    } catch (error) {
      setMessage({ tone: 'error', text: formatProposalReviewError(error, proposal.target.kind) });
    }
  }

  async function refresh(proposal: ProfileChangeProposal) {
    setMessage(null);
    setShowReason(false);
    if (!proposalFreshness?.canRefresh) {
      setMessage({ tone: 'error', text: formatProposalFreshnessDescription(proposalFreshness) });
      return;
    }
    try {
      const result = await refreshMutation.mutateAsync({
        proposalId: proposal.id,
        reason: 'User refreshed a stale proposal from the review surface.',
      });
      setMessage({ tone: 'notice', text: formatRefreshSuccessMessage(result.proposal) });
      setSelectedId(result.proposal.id);
    } catch (error) {
      setMessage({ tone: 'error', text: formatProposalReviewError(error, proposal.target.kind) });
    }
  }

  async function saveEditedProposal(proposal: ProfileChangeProposal) {
    if (!editDraft) return;
    setMessage(null);
    const result = buildEditedProposalDraft(proposal, editDraft);
    if (!result.ok) {
      setMessage({ tone: 'error', text: result.message });
      return;
    }

    try {
      const editResult = await editMutation.mutateAsync({
        proposalId: proposal.id,
        draft: result.draft,
        supersedeReason: 'User edited the proposal from the review surface.',
      });
      setMessage({ tone: 'notice', text: `Created edited proposal ${editResult.proposal.id}. Review it before applying.` });
      setSelectedId(editResult.proposal.id);
      setEditDraft(null);
      setShowReason(false);
    } catch (error) {
      setMessage({ tone: 'error', text: formatProposalReviewError(error, proposal.target.kind) });
    }
  }

  async function mark(proposal: ProfileChangeProposal, status: 'rejected' | 'postponed') {
    setMessage(null);
    setShowReason(false);
    try {
      await reviewMutation.mutateAsync({ proposalId: proposal.id, status });
      setMessage({ tone: 'notice', text: status === 'rejected' ? 'Rejected.' : 'Postponed.' });
      setSelectedId(null);
    } catch (error) {
      setMessage({ tone: 'error', text: formatProposalReviewError(error) });
    }
  }

  async function toggleReason(proposal: ProfileChangeProposal) {
    setMessage(null);
    if (showReason) {
      setShowReason(false);
      return;
    }

    setShowReason(true);
    if (askedWhyProposalIds.has(proposal.id)) return;

    try {
      await askWhyMutation.mutateAsync({
        proposalId: proposal.id,
        reason: 'User opened the proposal reason from the review surface.',
      });
      setAskedWhyProposalIds((ids) => new Set(ids).add(proposal.id));
    } catch (error) {
      setMessage({ tone: 'error', text: formatProposalReviewError(error) });
    }
  }

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ReviewHeader onClose={onClose} />
        <Text style={styles.muted}>Loading suggestions...</Text>
      </View>
    );
  }

  if (!selectedProposal) {
    return (
      <View style={styles.container}>
        <ReviewHeader onClose={onClose} />
        <Text style={styles.muted}>
          {selectedId
            ? 'That proposal is no longer pending. Refresh the suggestion list and review the latest state.'
            : 'No pending suggestions.'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ReviewHeader onClose={onClose} />
      <Text style={styles.subtitle}>Review branch and base profile changes before applying them.</Text>
      <View style={styles.layout}>
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {proposals.map((proposal) => (
            <ProposalListItem
              key={proposal.id}
              proposal={proposal}
              selected={proposal.id === selectedProposal.id}
              disabled={busy}
              onPress={() => {
                setSelectedId(proposal.id);
                setShowReason(false);
                setEditDraft(null);
                setMessage(null);
              }}
            />
          ))}
        </ScrollView>
        <ScrollView style={styles.detail} contentContainerStyle={styles.detailContent}>
          <Text style={styles.detailTitle}>{selectedProposal.title}</Text>
          <Text style={styles.summary}>{selectedProposal.summary}</Text>
          <View style={styles.metaGrid}>
            <Meta label="Target" value={formatTarget(selectedProposal)} />
            <Meta label="Kind" value={selectedProposal.proposalKind.replace(/_/g, ' ')} />
            <Meta label="Risk" value={formatRiskDescription(selectedProposal)} />
            <Meta label="Semantic" value={formatConfidence(selectedProposal.semanticConfidence)} />
            <Meta label="User fit" value={formatConfidence(selectedProposal.userFitConfidence)} />
          </View>
          <View style={[
            styles.freshnessBox,
            proposalFreshness?.status === 'fresh' ? styles.freshnessBoxReady : styles.freshnessBoxBlocked,
          ]}>
            <Text style={styles.freshnessTitle}>
              {freshnessLoading ? 'Checking target' : formatProposalFreshnessLabel(proposalFreshness)}
            </Text>
            <Text style={styles.freshnessBody}>
              {freshnessLoading
                ? 'Kordex is checking whether this proposal still fits its target.'
                : formatProposalFreshnessDescription(proposalFreshness)}
            </Text>
          </View>
          <Text style={styles.sectionLabel}>Patch</Text>
          {summarizePatch(selectedProposal.patch).map((line) => (
            <Text key={line} style={styles.patchLine}>{line}</Text>
          ))}
          <Pressable
            style={[styles.whyButton, busy && styles.disabledAction]}
            onPress={() => void toggleReason(selectedProposal)}
            disabled={busy}
          >
            <Text style={styles.whyButtonText}>{showReason ? 'Hide reason' : 'Ask why / why not'}</Text>
          </Pressable>
          {showReason ? (
            <View style={styles.reasonBox}>
              <Text style={styles.reasonText}>{selectedProposal.reason || 'No reason recorded.'}</Text>
              {selectedProposal.evidenceIds.length > 0 ? (
                <Text style={styles.evidenceText}>
                  Evidence: {selectedProposal.evidenceIds.join(', ')}
                </Text>
              ) : null}
            </View>
          ) : null}
          <View style={styles.editorGate}>
            {editDraft ? (
              <ProposalEditor
                draft={editDraft}
                disabled={busy}
                onChange={(patch) => setEditDraft((current) => current ? { ...current, ...patch } : current)}
                onCancel={() => {
                  setEditDraft(null);
                  setMessage(null);
                }}
                onSave={() => void saveEditedProposal(selectedProposal)}
              />
            ) : editorModel?.canEdit ? (
              <Pressable
                style={[styles.secondaryAction, busy && styles.disabledAction]}
                onPress={() => {
                  setEditDraft(editorModel.draft);
                  setShowReason(false);
                  setMessage(null);
                }}
                disabled={busy}
              >
                <Text style={styles.secondaryActionText}>Edit proposal</Text>
              </Pressable>
            ) : editorModel ? (
              <Text style={styles.muted}>{editorModel.reason}</Text>
            ) : null}
          </View>
          <Text style={styles.sectionLabel}>History</Text>
          {eventsLoading ? (
            <Text style={styles.muted}>Loading history...</Text>
          ) : proposalEvents.length > 0 ? (
            <View style={styles.historyBox}>
              {proposalEvents.map((event) => (
                <ProposalEventHistoryItem key={event.id} event={event} />
              ))}
            </View>
          ) : (
            <Text style={styles.muted}>No review history yet.</Text>
          )}
          {selectedProposal.target.kind === 'base_profile' ? (
            <Text style={styles.coreWarning}>Core changes affect derived branches. Apply only after checking the patch and reason.</Text>
          ) : null}
          {!targetSupported ? (
            <Text style={styles.error}>This proposal target cannot be applied in this review surface yet.</Text>
          ) : null}
          {message ? <Text style={message.tone === 'error' ? styles.error : styles.notice}>{message.text}</Text> : null}
          <View style={styles.actions}>
            <Pressable
              style={[styles.primaryAction, (busy || !canApplySelected) && styles.disabledAction]}
              onPress={() => void apply(selectedProposal)}
              disabled={busy || !canApplySelected}
            >
              <Text style={styles.primaryActionText}>
                {canApplySelected ? formatApplyActionLabel(selectedProposal) : 'Apply unavailable'}
              </Text>
            </Pressable>
            {canRefreshSelected ? (
              <Pressable
                style={[styles.secondaryAction, busy && styles.disabledAction]}
                onPress={() => void refresh(selectedProposal)}
                disabled={busy}
              >
                <Text style={styles.secondaryActionText}>Refresh proposal</Text>
              </Pressable>
            ) : null}
            <Pressable
              style={[styles.secondaryAction, busy && styles.disabledAction]}
              onPress={() => void mark(selectedProposal, 'postponed')}
              disabled={busy}
            >
              <Text style={styles.secondaryActionText}>Postpone</Text>
            </Pressable>
            <Pressable
              style={[styles.secondaryAction, styles.rejectAction, busy && styles.disabledAction]}
              onPress={() => void mark(selectedProposal, 'rejected')}
              disabled={busy}
            >
              <Text style={styles.rejectActionText}>Reject</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

function ProposalEditor({
  draft,
  disabled,
  onChange,
  onCancel,
  onSave,
}: {
  draft: ProposalEditorDraftState;
  disabled: boolean;
  onChange: (patch: Partial<ProposalEditorDraftState>) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <View style={styles.editorBox}>
      <Text style={styles.editorTitle}>Edit proposal</Text>
      <LabeledInput
        label="Label"
        value={draft.label}
        disabled={disabled}
        onChangeText={(value) => onChange({ label: value })}
      />
      <LabeledInput
        label="Parent id"
        value={draft.parentId}
        disabled={disabled}
        onChangeText={(value) => onChange({ parentId: value })}
      />
      <LabeledInput
        label="Meaning"
        value={draft.meaning}
        disabled={disabled}
        multiline
        onChangeText={(value) => onChange({ meaning: value })}
      />
      <LabeledInput
        label="Reason"
        value={draft.reason}
        disabled={disabled}
        multiline
        onChangeText={(value) => onChange({ reason: value })}
      />
      <LabeledInput
        label="Risk"
        value={draft.riskScore}
        disabled={disabled}
        keyboardType="numeric"
        onChangeText={(value) => onChange({ riskScore: value })}
      />
      <View style={styles.editorActions}>
        <Pressable
          style={[styles.primaryAction, disabled && styles.disabledAction]}
          onPress={onSave}
          disabled={disabled}
        >
          <Text style={styles.primaryActionText}>Save edited proposal</Text>
        </Pressable>
        <Pressable
          style={[styles.secondaryAction, disabled && styles.disabledAction]}
          onPress={onCancel}
          disabled={disabled}
        >
          <Text style={styles.secondaryActionText}>Cancel edit</Text>
        </Pressable>
      </View>
    </View>
  );
}

function LabeledInput({
  label,
  value,
  disabled,
  multiline,
  keyboardType,
  onChangeText,
}: {
  label: string;
  value: string;
  disabled: boolean;
  multiline?: boolean | undefined;
  keyboardType?: 'default' | 'numeric' | undefined;
  onChangeText: (value: string) => void;
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.multilineInput]}
        value={value}
        editable={!disabled}
        multiline={multiline}
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        placeholderTextColor={colors.textSecondary}
      />
    </View>
  );
}

function ReviewHeader({ onClose }: { onClose?: (() => void) | undefined }) {
  return (
    <View style={styles.headerRow}>
      <Text style={styles.title}>Profile Suggestions</Text>
      {onClose ? (
        <Pressable onPress={onClose} hitSlop={8}>
          <Text style={styles.closeText}>Close</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function ProposalListItem({
  proposal,
  selected,
  disabled,
  onPress,
}: {
  proposal: ProfileChangeProposal;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.listItem, selected && styles.listItemSelected, disabled && styles.disabledAction]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={styles.listTitle}>{proposal.title}</Text>
      <Text style={styles.listMeta}>{formatTarget(proposal)}</Text>
    </Pressable>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.meta}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

function ProposalEventHistoryItem({ event }: { event: ProfileProposalEvent }) {
  return (
    <View style={styles.historyItem}>
      <Text style={styles.historySummary}>{formatProposalEventSummary(event)}</Text>
      <Text style={styles.historyMeta}>{formatProposalEventTimestamp(event)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.xxl,
    fontWeight: '800',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  closeText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  muted: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    marginTop: spacing.md,
  },
  layout: {
    flex: 1,
    gap: spacing.md,
  },
  list: {
    maxHeight: 220,
  },
  listContent: {
    gap: spacing.sm,
  },
  listItem: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  listItemSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceLight,
  },
  listTitle: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  listMeta: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  detail: {
    flex: 1,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  detailContent: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  detailTitle: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: '800',
  },
  summary: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    marginTop: spacing.sm,
  },
  metaGrid: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  meta: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.sm,
    backgroundColor: colors.surface,
  },
  metaLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginBottom: 2,
  },
  metaValue: {
    color: colors.text,
    fontSize: fontSize.md,
  },
  freshnessBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  freshnessBoxReady: {
    borderColor: colors.green,
    backgroundColor: colors.surface,
  },
  freshnessBoxBlocked: {
    borderColor: colors.yellow,
    backgroundColor: colors.surface,
  },
  freshnessTitle: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '800',
  },
  freshnessBody: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  sectionLabel: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '800',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  patchLine: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    marginBottom: spacing.xs,
  },
  whyButton: {
    minHeight: 44,
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  whyButtonText: {
    color: colors.primaryLight,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  reasonBox: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  reasonText: {
    color: colors.text,
    fontSize: fontSize.md,
  },
  editorGate: {
    marginTop: spacing.md,
  },
  editorBox: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
    backgroundColor: colors.surface,
    gap: spacing.sm,
  },
  editorTitle: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '800',
  },
  inputGroup: {
    gap: spacing.xs,
  },
  inputLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    color: colors.text,
    backgroundColor: colors.background,
    fontSize: fontSize.md,
  },
  multilineInput: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  editorActions: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  evidenceText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: spacing.sm,
  },
  historyBox: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  historyItem: {
    padding: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  historySummary: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  historyMeta: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  notice: {
    color: colors.green,
    fontSize: fontSize.md,
    marginTop: spacing.md,
  },
  error: {
    color: colors.red,
    fontSize: fontSize.md,
    marginTop: spacing.md,
  },
  coreWarning: {
    color: colors.yellow,
    fontSize: fontSize.md,
    fontWeight: '700',
    marginTop: spacing.md,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  primaryAction: {
    minHeight: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  primaryActionText: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '800',
  },
  secondaryAction: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryActionText: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  rejectAction: {
    borderColor: colors.red,
  },
  rejectActionText: {
    color: colors.red,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  disabledAction: {
    opacity: 0.5,
  },
});
