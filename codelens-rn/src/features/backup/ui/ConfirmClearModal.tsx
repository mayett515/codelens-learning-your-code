import { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { colors, fontSize, spacing } from '../../../ui/theme';

export interface ConfirmClearModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (opts: { includeApiKeys: boolean }) => Promise<void> | void;
}

/**
 * Two-step destructive confirm:
 *   1. Copy explains what's about to happen.
 *   2. User must type DELETE (case-sensitive) to enable the final button.
 *   3. Optional checkbox for nuking API keys too (default off).
 */
export function ConfirmClearModal({ visible, onClose, onConfirm }: ConfirmClearModalProps) {
  const [typed, setTyped] = useState('');
  const [includeApiKeys, setIncludeApiKeys] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setTyped('');
    setIncludeApiKeys(false);
    setWorking(false);
    setError(null);
  }

  function handleClose() {
    if (working) return;
    reset();
    onClose();
  }

  async function handleConfirm() {
    if (typed !== 'DELETE' || working) return;
    setWorking(true);
    setError(null);
    try {
      await onConfirm({ includeApiKeys });
      reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to clear data');
    } finally {
      setWorking(false);
    }
  }

  const enabled = typed === 'DELETE' && !working;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Clear all data?</Text>
          <Text style={styles.body}>
            This will permanently delete all projects, chats, concepts, and
            preferences on this device. This cannot be undone.
          </Text>

          <Pressable
            style={styles.checkRow}
            onPress={() => setIncludeApiKeys((v) => !v)}
            disabled={working}
          >
            <View style={[styles.checkbox, includeApiKeys && styles.checkboxOn]}>
              {includeApiKeys ? <Text style={styles.checkboxMark}>×</Text> : null}
            </View>
            <Text style={styles.checkLabel}>
              Also delete saved API keys (OpenRouter, SiliconFlow, Google AI Studio, OpenCode Go)
            </Text>
          </Pressable>

          <Text style={styles.hint}>Type DELETE to confirm</Text>
          <TextInput
            value={typed}
            onChangeText={setTyped}
            autoCapitalize="characters"
            autoCorrect={false}
            style={styles.input}
            placeholder="DELETE"
            placeholderTextColor={colors.textSecondary}
            editable={!working}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.actions}>
            <Pressable
              style={[styles.btn, styles.cancel]}
              onPress={handleClose}
              disabled={working}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.btn, styles.destroy, !enabled && styles.destroyDisabled]}
              onPress={handleConfirm}
              disabled={!enabled}
            >
              {working ? (
                <ActivityIndicator color={colors.text} />
              ) : (
                <Text style={styles.destroyText}>Delete everything</Text>
              )}
            </Pressable>
          </View>
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
  },
  title: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  body: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: {
    backgroundColor: colors.red,
    borderColor: colors.red,
  },
  checkboxMark: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '700',
    lineHeight: 16,
  },
  checkLabel: {
    color: colors.text,
    fontSize: fontSize.sm,
    flex: 1,
  },
  hint: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    color: colors.text,
    fontSize: fontSize.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    fontFamily: 'monospace',
  },
  error: {
    color: colors.red,
    fontSize: fontSize.sm,
    marginBottom: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  btn: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: 8,
  },
  cancel: {
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelText: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  destroy: {
    backgroundColor: colors.red,
  },
  destroyDisabled: {
    opacity: 0.4,
  },
  destroyText: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
});
