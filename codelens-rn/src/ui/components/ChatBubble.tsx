import React, { memo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, fontSize, spacing } from '../theme';
import type { ChatMessage } from '@/src/domain/types';

interface Props {
  message: ChatMessage;
  onLongPress: (message: ChatMessage) => void;
}

export const ChatBubble = memo(({ message, onLongPress }: Props) => {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  if (isSystem) return null;

  return (
    <Pressable
      onLongPress={() => onLongPress(message)}
      style={[
        styles.bubble,
        isUser ? styles.userBubble : styles.assistantBubble,
      ]}
    >
      <Text
        style={[
          styles.bubbleText,
          isUser ? styles.userText : styles.assistantText,
        ]}
        selectable
      >
        {message.content}
      </Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  bubble: {
    maxWidth: '85%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: 12,
    marginVertical: spacing.xs,
    marginHorizontal: spacing.md,
  },
  userBubble: {
    backgroundColor: colors.primary,
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: colors.surface,
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bubbleText: {
    fontSize: fontSize.md,
    lineHeight: 20,
  },
  userText: {
    color: colors.text,
  },
  assistantText: {
    color: colors.text,
  },
});
