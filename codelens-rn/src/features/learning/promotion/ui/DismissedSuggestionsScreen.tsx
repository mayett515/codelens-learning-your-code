import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, spacing } from '../../../../ui/theme';
import { useDismissedSuggestions } from '../hooks/useDismissedSuggestions';
import { useRestoreDismissal } from '../hooks/useRestoreDismissal';

export function DismissedSuggestionsScreen() {
  const { data: dismissals = [] } = useDismissedSuggestions();
  const restore = useRestoreDismissal();
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Dismissed Suggestions</Text>
      {dismissals.map((dismissal) => (
        <View key={dismissal.fingerprint} style={styles.row}>
          <Text style={styles.rowText}>{dismissal.captureCount} captures</Text>
          <Pressable onPress={() => restore.mutate(dismissal.fingerprint)}>
            <Text style={styles.restoreText}>Restore</Text>
          </Pressable>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.xxl,
    fontWeight: '800',
  },
  row: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.md,
  },
  rowText: {
    color: colors.text,
    fontSize: fontSize.md,
  },
  restoreText: {
    color: colors.primaryLight,
    fontSize: fontSize.md,
    marginTop: spacing.xs,
  },
});
