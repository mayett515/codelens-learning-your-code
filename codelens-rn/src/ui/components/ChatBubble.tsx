import React, { memo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, fontSize, spacing } from '../theme';
import { STOP_LABEL } from '../../features/chat/types/messageStatus';
import type { ChatMessage } from '@/src/domain/types';

interface Props {
  message: ChatMessage;
  onLongPress: (message: ChatMessage) => void;
}

interface StoppedSplit {
  prefix: string;
  hasStopMarker: boolean;
}

function splitStopped(content: string): StoppedSplit {
  if (content === STOP_LABEL) {
    return { prefix: '', hasStopMarker: true };
  }
  const suffix = `\n\n${STOP_LABEL}`;
  if (content.endsWith(suffix)) {
    return { prefix: content.slice(0, -suffix.length), hasStopMarker: true };
  }
  return { prefix: content, hasStopMarker: false };
}

export const ChatBubble = memo(({ message, onLongPress }: Props) => {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  if (isSystem) return null;

  const split = !isUser ? splitStopped(message.content) : { prefix: message.content, hasStopMarker: false };

  return (
    <Pressable
      onLongPress={() => onLongPress(message)}
      style={[
        styles.bubble,
        isUser ? styles.userBubble : styles.assistantBubble,
        split.hasStopMarker && !split.prefix && styles.stoppedOnlyBubble,
      ]}
    >
      <View>
        {split.prefix.length > 0 ? (
          <Text
            style={[
              styles.bubbleText,
              isUser ? styles.userText : styles.assistantText,
            ]}
            selectable
          >
            {split.prefix}
          </Text>
        ) : null}
        {split.hasStopMarker ? (
          <Text
            style={[
              styles.stopMarker,
              split.prefix.length > 0 && styles.stopMarkerWithPrefix,
            ]}
            selectable={false}
          >
            {STOP_LABEL}
          </Text>
        ) : null}
      </View>
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
  stoppedOnlyBubble: {
    backgroundColor: 'transparent',
    borderColor: colors.border,
    borderStyle: 'dashed',
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
  stopMarker: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontStyle: 'italic',
    opacity: 0.75,
  },
  stopMarkerWithPrefix: {
    marginTop: spacing.xs,
  },
});
