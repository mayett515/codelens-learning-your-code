import { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { colors, fontSize, spacing } from '@/src/ui/theme';
import { getChatById, insertMessage, deleteMessage } from '@/src/db/queries/chats';
import { getFileById } from '@/src/db/queries/files';
import { enqueue } from '@/src/ai/queue';
import { buildSectionSystemPrompt } from '@/src/domain/prompts';
import { messageId as makeMessageId } from '@/src/domain/types';
import { uid } from '@/src/lib/uid';
import { ChatBubble } from '@/src/ui/components/ChatBubble';
import { ChatInput } from '@/src/ui/components/ChatInput';
import { BubbleMenu } from '@/src/ui/components/BubbleMenu';
import type { ChatId, ChatMessage } from '@/src/domain/types';

export default function SectionChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const chatId = id as ChatId;
  const queryClient = useQueryClient();

  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [menuMessage, setMenuMessage] = useState<ChatMessage | null>(null);

  const { data: chat } = useQuery({
    queryKey: ['chat', chatId],
    queryFn: () => getChatById(chatId),
  });

  const { data: file } = useQuery({
    queryKey: ['file', chat?.fileId],
    queryFn: () => (chat?.fileId ? getFileById(chat.fileId) : null),
    enabled: !!chat?.fileId,
  });

  const messages = chat?.messages ?? [];
  const reversedMessages = useMemo(() => [...messages].reverse(), [messages]);

  const handleSend = useCallback(
    async (text: string) => {
      if (!chat) return;
      setSending(true);
      setError('');

      const userMsg: ChatMessage = {
        id: makeMessageId(uid()),
        role: 'user',
        content: text,
        createdAt: new Date().toISOString(),
      };
      await insertMessage(chatId, userMsg);
      queryClient.invalidateQueries({ queryKey: ['chat', chatId] });

      try {
        const systemPrompt =
          file && chat.startLine != null && chat.endLine != null
            ? buildSectionSystemPrompt(
                file.path,
                file.content
                  .split('\n')
                  .slice(chat.startLine - 1, chat.endLine)
                  .join('\n'),
                chat.startLine,
                chat.endLine,
                file.marks,
                file.ranges,
              )
            : 'You are a helpful coding assistant. Be concise.';

        const aiMessages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [
          { role: 'system', content: systemPrompt },
          ...messages.filter((m) => m.role !== 'system').map((m) => ({
            role: m.role,
            content: m.content,
          })),
          { role: 'user', content: text },
        ];

        const response = await enqueue('section', aiMessages);

        const assistantMsg: ChatMessage = {
          id: makeMessageId(uid()),
          role: 'assistant',
          content: response,
          createdAt: new Date().toISOString(),
        };
        await insertMessage(chatId, assistantMsg);
        queryClient.invalidateQueries({ queryKey: ['chat', chatId] });
        queryClient.invalidateQueries({ queryKey: ['recentChats'] });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to get response');
      } finally {
        setSending(false);
      }
    },
    [chat, file, messages, chatId, queryClient],
  );

  const handleDeleteMessage = useCallback(
    async (msg: ChatMessage) => {
      await deleteMessage(msg.id);
      queryClient.invalidateQueries({ queryKey: ['chat', chatId] });
    },
    [chatId, queryClient],
  );

  const codeContext =
    file && chat?.startLine != null && chat?.endLine != null
      ? `${file.path}:${chat.startLine}-${chat.endLine}`
      : null;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardAvoiding} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={styles.backBtn}>{'<'}</Text>
          </Pressable>
          <View style={styles.headerInfo}>
            <Text style={styles.title} numberOfLines={1}>
              {chat?.title ?? 'Chat'}
            </Text>
            {codeContext ? (
              <Text style={styles.context} numberOfLines={1}>
                {codeContext}
              </Text>
            ) : null}
          </View>
        </View>

        <FlatList
          data={reversedMessages}
          inverted
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ChatBubble
              message={item}
              onLongPress={setMenuMessage}
            />
          )}
          contentContainerStyle={styles.messageList}
        />

        {sending ? (
          <View style={styles.typingBar}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.typingText}>Thinking...</Text>
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorBar}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={() => setError('')}>
              <Text style={styles.errorDismiss}>X</Text>
            </Pressable>
          </View>
        ) : null}

        <ChatInput onSend={handleSend} disabled={sending} />
      </KeyboardAvoidingView>

      <BubbleMenu
        visible={!!menuMessage}
        message={menuMessage}
        onClose={() => setMenuMessage(null)}
        onDelete={handleDeleteMessage}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardAvoiding: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  backBtn: {
    color: colors.primary,
    fontSize: fontSize.xl,
    fontWeight: '600',
    paddingHorizontal: spacing.xs,
  },
  headerInfo: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  context: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  messageList: {
    paddingVertical: spacing.md,
  },
  typingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
  typingText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  errorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(224, 108, 117, 0.15)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  errorText: {
    color: colors.red,
    fontSize: fontSize.sm,
    flex: 1,
  },
  errorDismiss: {
    color: colors.red,
    fontSize: fontSize.md,
    fontWeight: '600',
    paddingLeft: spacing.md,
  },
});
