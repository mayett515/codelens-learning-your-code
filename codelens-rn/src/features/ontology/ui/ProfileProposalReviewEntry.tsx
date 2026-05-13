import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, spacing } from '../../../ui/theme';
import { usePendingProfileChangeProposals } from '../hooks/useProfileChangeProposals';

interface ProfileProposalReviewEntryProps {
  onOpen: () => void;
}

export function ProfileProposalReviewEntry({ onOpen }: ProfileProposalReviewEntryProps) {
  const { data: proposals = [] } = usePendingProfileChangeProposals();

  if (proposals.length === 0) return null;

  return (
    <Pressable style={styles.entry} onPress={onOpen}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Profile Suggestions</Text>
        <Text style={styles.count}>{proposals.length}</Text>
      </View>
      <Text style={styles.body}>
        Review branch-local ontology changes before they become part of the active profile.
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  entry: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '800',
  },
  count: {
    minWidth: 28,
    textAlign: 'center',
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '800',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  body: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
});
