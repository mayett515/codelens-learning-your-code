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
import { chatKeys } from '@/src/hooks/query-keys';
import { getChatById, deleteMessage } from '@/src/db/queries/chats';
import { buildGeneralSystemPrompt } from '@/src/domain/prompts';
import { useSendMessage } from '@/src/hooks/use-send-message';
import { ChatBubble } from '@/src/ui/components/ChatBubble';
import { ChatInput } from '@/src/ui/components/ChatInput';
import { BubbleMenu } from '@/src/ui/components/BubbleMenu';
import { SaveAsLearningModal, useSaveLearningStore } from '@/src/features/learning';
import type { ChatId, ChatMessage } from '@/src/domain/types';

const BUILD_GENERAL_PROMPT = () => buildGeneralSystemPrompt();

export default function GeneralChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const chatId = id as ChatId;
  const queryClient = useQueryClient();
  const openLearning = useSaveLearningStore((s) => s.open);
  const [menuMessage, setMenuMessage] = useState<ChatMessage | null>(null);

  const { data: chat } = useQuery({
    queryKey: chatKeys.detail(chatId),
    queryFn: () => getChatById(chatId),
  });

  const messages = chat?.messages ?? [];
  const reversedMessages = useMemo(() => [...messages].reverse(), [messages]);

  const { send, sending, error, clearError } = useSendMessage(chatId, 'general', BUILD_GENERAL_PROMPT, messages);

  const handleDeleteMessage = useCallback(
    async (msg: ChatMessage) => {
      await deleteMessage(msg.id);
      queryClient.invalidateQueries({ queryKey: chatKeys.detail(chatId) });
    },
    [chatId, queryClient],
  );

  const handleSaveAsLearning = useCallback(
    (msg: ChatMessage) => openLearning(msg, chatId),
    [openLearning, chatId],
  );

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
          <Text style={styles.title} numberOfLines={1}>
            {chat?.title ?? 'General Chat'}
          </Text>
        </View>

        {messages.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Ask anything</Text>
            <Text style={styles.emptyHint}>
              A general-purpose chat — no code context attached.
            </Text>
          </View>
        ) : (
          <FlatList
            data={reversedMessages}
            inverted
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ChatBubble message={item} onLongPress={setMenuMessage} />
            )}
            contentContainerStyle={styles.messageList}
          />
        )}

        {sending ? (
          <View style={styles.typingBar}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.typingText}>Thinking...</Text>
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorBar}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={clearError}>
              <Text style={styles.errorDismiss}>X</Text>
            </Pressable>
          </View>
        ) : null}

        <ChatInput onSend={send} disabled={sending} />
      </KeyboardAvoidingView>

      <BubbleMenu
        visible={!!menuMessage}
        message={menuMessage}
        onClose={() => setMenuMessage(null)}
        onDelete={handleDeleteMessage}
        onSaveAsLearning={handleSaveAsLearning}
      />
      <SaveAsLearningModal />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  keyboardAvoiding: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    gap: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
  backBtn: { color: colors.primary, fontSize: fontSize.xl, fontWeight: '600', paddingHorizontal: spacing.xs },
  title: { color: colors.text, fontSize: fontSize.lg, fontWeight: '600', flex: 1 },
  messageList: { paddingVertical: spacing.md },
  typingBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.xs },
  typingText: { color: colors.textSecondary, fontSize: fontSize.sm },
  errorBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(224, 108, 117, 0.15)', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
  },
  errorText: { color: colors.red, fontSize: fontSize.sm, flex: 1 },
  errorDismiss: { color: colors.red, fontSize: fontSize.md, fontWeight: '600', paddingLeft: spacing.md },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xl },
  emptyText: { color: colors.textSecondary, fontSize: fontSize.lg, fontWeight: '600' },
  emptyHint: { color: colors.textSecondary, fontSize: fontSize.md, textAlign: 'center', marginTop: spacing.sm, opacity: 0.7 },
});
