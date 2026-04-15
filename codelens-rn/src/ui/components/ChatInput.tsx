import { useState } from 'react';
import {
  View,
  TextInput,
  Pressable,
  Text,
  StyleSheet,
  Platform,
} from 'react-native';
import { colors, fontSize, spacing } from '../theme';

interface Props {
  onSend: (text: string) => void;
  disabled?: boolean | undefined;
}

export function ChatInput({ onSend, disabled }: Props) {
  const [text, setText] = useState('');

  function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
  }

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        value={text}
        onChangeText={setText}
        placeholder="Type a message..."
        placeholderTextColor={colors.textSecondary}
        multiline
        maxLength={4000}
        editable={!disabled}
      />
      <Pressable
        style={[styles.sendBtn, disabled && styles.sendBtnDisabled]}
        onPress={handleSend}
        disabled={disabled}
      >
        <Text style={styles.sendBtnText}>Send</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    color: colors.text,
    fontSize: fontSize.md,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? spacing.sm + 2 : spacing.sm,
    maxHeight: 100,
  },
  sendBtn: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
  sendBtnText: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
});
