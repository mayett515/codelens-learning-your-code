import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { colors, fontSize, spacing } from '../theme';
import type { ChatMessage } from '@/src/domain/types';

interface Props {
  visible: boolean;
  message: ChatMessage | null;
  onClose: () => void;
  onDelete: (message: ChatMessage) => void;
  onSaveAsLearning?: ((message: ChatMessage) => void) | undefined;
}

export function BubbleMenu({
  visible,
  message,
  onClose,
  onDelete,
  onSaveAsLearning,
}: Props) {
  if (!message) return null;

  async function handleCopy() {
    await Clipboard.setStringAsync(message!.content);
    onClose();
  }

  function handleDelete() {
    onDelete(message!);
    onClose();
  }

  function handleSave() {
    onSaveAsLearning?.(message!);
    onClose();
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.menu}>
          <Pressable style={styles.menuItem} onPress={handleCopy}>
            <Text style={styles.menuItemText}>Copy</Text>
          </Pressable>
          {onSaveAsLearning ? (
            <Pressable style={styles.menuItem} onPress={handleSave}>
              <Text style={styles.menuItemText}>Save as Learning</Text>
            </Pressable>
          ) : null}
          <Pressable style={styles.menuItem} onPress={handleDelete}>
            <Text style={[styles.menuItemText, styles.deleteText]}>Delete</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menu: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    minWidth: 200,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  menuItem: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  menuItemText: {
    color: colors.text,
    fontSize: fontSize.md,
  },
  deleteText: {
    color: colors.red,
  },
});
