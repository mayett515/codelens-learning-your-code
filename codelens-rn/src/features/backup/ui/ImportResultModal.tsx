import { Modal, View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { colors, fontSize, spacing } from '../../../ui/theme';
import type { ImportResult } from '../import';

export interface ImportResultModalProps {
  visible: boolean;
  result: ImportResult | null;
  onClose: () => void;
}

const LABELS: Record<string, string> = {
  projects:          'Projects',
  files:             'Files',
  chats:             'Chats',
  chat_messages:     'Chat messages',
  learning_sessions: 'Learning sessions',
  concepts:          'Concepts',
  concept_links:     'Concept links',
  embeddings:        'Embeddings',
};

/**
 * Shown after a successful restore. Lists restored counts + any warnings
 * (partial skip list + API-key providers that need re-entry).
 */
export function ImportResultModal({ visible, result, onClose }: ImportResultModalProps) {
  if (!result) return null;

  const entries = Object.entries(result.imported).filter(([, n]) => n > 0);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Restore complete</Text>

          <ScrollView style={styles.list}>
            {entries.length === 0 ? (
              <Text style={styles.body}>Nothing to restore — the archive was empty.</Text>
            ) : (
              entries.map(([k, n]) => (
                <View key={k} style={styles.row}>
                  <Text style={styles.rowLabel}>{LABELS[k] ?? k}</Text>
                  <Text style={styles.rowValue}>{n}</Text>
                </View>
              ))
            )}

            {result.skipped.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Skipped</Text>
                {result.skipped.map((s) => (
                  <Text key={s} style={styles.warn}>• {s}</Text>
                ))}
              </View>
            ) : null}

            {result.missingKeys.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Re-enter API keys</Text>
                <Text style={styles.body}>
                  The source device had keys for: {result.missingKeys.join(', ')}. Keys are never exported for security — re-enter them in Settings.
                </Text>
              </View>
            ) : null}
          </ScrollView>

          <Pressable style={styles.ok} onPress={onClose}>
            <Text style={styles.okText}>Done</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: '80%',
  },
  title: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  list: {
    marginBottom: spacing.md,
  },
  body: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 18,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  rowLabel: {
    color: colors.text,
    fontSize: fontSize.md,
  },
  rowValue: {
    color: colors.green,
    fontSize: fontSize.md,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  section: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  warn: {
    color: colors.yellow,
    fontSize: fontSize.sm,
    marginBottom: spacing.xs,
  },
  ok: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: 8,
  },
  okText: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
});
