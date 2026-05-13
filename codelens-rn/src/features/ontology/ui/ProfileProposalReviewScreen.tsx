import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, spacing } from '../../../ui/theme';
import { useApplyProfileChangeProposal } from '../hooks/useApplyProfileChangeProposal';
import { usePendingProfileChangeProposals } from '../hooks/useProfileChangeProposals';
import { useReviewProfileChangeProposal } from '../hooks/useReviewProfileChangeProposal';
import type { ProfileChangeProposal } from '../types';
import {
  formatConfidence,
  formatProposalReviewError,
  formatRiskDescription,
  formatTarget,
  summarizePatch,
} from './profileProposalReviewPresentation';

type ReviewMessage = {
  tone: 'notice' | 'error';
  text: string;
};

export function ProfileProposalReviewScreen() {
  const { data: proposals = [], isLoading } = usePendingProfileChangeProposals();
  const applyMutation = useApplyProfileChangeProposal();
  const reviewMutation = useReviewProfileChangeProposal();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showReason, setShowReason] = useState(false);
  const [message, setMessage] = useState<ReviewMessage | null>(null);

  const selectedProposal = useMemo(
    () => proposals.find((proposal) => proposal.id === selectedId) ?? proposals[0],
    [proposals, selectedId],
  );
  const busy = applyMutation.isPending || reviewMutation.isPending;
  const canApplySelected = selectedProposal?.target.kind === 'profile_branch';

  async function apply(proposal: ProfileChangeProposal) {
    setMessage(null);
    setShowReason(false);
    if (proposal.target.kind !== 'profile_branch') {
      setMessage({ tone: 'error', text: formatProposalReviewError({ code: 'proposal_not_branch_target' }) });
      return;
    }
    try {
      await applyMutation.mutateAsync(proposal);
      setMessage({ tone: 'notice', text: 'Applied to branch.' });
      setSelectedId(null);
    } catch (error) {
      setMessage({ tone: 'error', text: formatProposalReviewError(error) });
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

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Profile Suggestions</Text>
        <Text style={styles.muted}>Loading suggestions...</Text>
      </View>
    );
  }

  if (!selectedProposal) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Profile Suggestions</Text>
        <Text style={styles.muted}>No pending suggestions.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile Suggestions</Text>
      <Text style={styles.subtitle}>Apply branch-local changes only after review.</Text>
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
          <Text style={styles.sectionLabel}>Patch</Text>
          {summarizePatch(selectedProposal.patch).map((line) => (
            <Text key={line} style={styles.patchLine}>{line}</Text>
          ))}
          <Pressable style={styles.whyButton} onPress={() => setShowReason((value) => !value)}>
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
          {!canApplySelected ? (
            <Text style={styles.error}>Only branch-local proposals can be applied in this review surface.</Text>
          ) : null}
          {message ? <Text style={message.tone === 'error' ? styles.error : styles.notice}>{message.text}</Text> : null}
          <View style={styles.actions}>
            <Pressable
              style={[styles.primaryAction, (busy || !canApplySelected) && styles.disabledAction]}
              onPress={() => void apply(selectedProposal)}
              disabled={busy || !canApplySelected}
            >
              <Text style={styles.primaryActionText}>{canApplySelected ? 'Apply' : 'Apply unavailable'}</Text>
            </Pressable>
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
  evidenceText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: spacing.sm,
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
