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
import { chatKeys, fileKeys } from '@/src/hooks/query-keys';
import { getChatById, deleteMessage, updateChatModelOverride } from '@/src/db/queries/chats';
import { getFileById } from '@/src/db/queries/files';
import { buildSectionSystemPrompt } from '@/src/domain/prompts';
import { getScopeConfig } from '@/src/ai/scopes';
import { useSendMessage } from '@/src/hooks/use-send-message';
import { ChatBubble } from '@/src/ui/components/ChatBubble';
import { ChatInput } from '@/src/ui/components/ChatInput';
import { BubbleMenu } from '@/src/ui/components/BubbleMenu';
import { ChatModelPickerModal } from '@/src/ui/components/ChatModelPickerModal';
import { SaveAsLearningModal, useSaveLearningStore } from '@/src/features/learning';
import type { ChatId, ChatMessage, ChatModelOverride } from '@/src/domain/types';

export default function SectionChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const chatId = id as ChatId;
  const queryClient = useQueryClient();
  const openLearning = useSaveLearningStore((s) => s.open);
  const [menuMessage, setMenuMessage] = useState<ChatMessage | null>(null);
  const [modelPickerVisible, setModelPickerVisible] = useState(false);
  const scopeConfig = getScopeConfig('section');

  const { data: chat } = useQuery({
    queryKey: chatKeys.detail(chatId),
    queryFn: () => getChatById(chatId),
  });

  const { data: file } = useQuery({
    queryKey: chat?.fileId ? fileKeys.detail(chat.fileId) : fileKeys.root,
    queryFn: () => (chat?.fileId ? getFileById(chat.fileId) : null),
    enabled: !!chat?.fileId,
  });

  const messages = chat?.messages ?? [];
  const reversedMessages = useMemo(() => [...messages].reverse(), [messages]);

  const buildPrompt = useCallback(() => {
    if (file && chat?.startLine != null && chat?.endLine != null) {
      return buildSectionSystemPrompt(
        file.path,
        file.content.split('\n').slice(chat.startLine - 1, chat.endLine).join('\n'),
        chat.startLine, chat.endLine, file.marks, file.ranges,
      );
    }
    return 'You are a helpful coding assistant. Be concise.';
  }, [file, chat]);

  const { send, sending, error, clearError } = useSendMessage(
    chatId,
    'section',
    buildPrompt,
    messages,
    chat?.modelOverride,
  );

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

  const handleSaveModelOverride = useCallback(
    async (override: ChatModelOverride) => {
      await updateChatModelOverride(chatId, override);
      queryClient.invalidateQueries({ queryKey: chatKeys.detail(chatId) });
      queryClient.invalidateQueries({ queryKey: chatKeys.recent });
    },
    [chatId, queryClient],
  );

  const handleClearModelOverride = useCallback(
    async () => {
      await updateChatModelOverride(chatId, undefined);
      queryClient.invalidateQueries({ queryKey: chatKeys.detail(chatId) });
      queryClient.invalidateQueries({ queryKey: chatKeys.recent });
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
        behavior="padding"
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
              <Text style={styles.context} numberOfLines={1}>{codeContext}</Text>
            ) : null}
          </View>
          <Pressable
            style={[styles.modelBtn, chat?.modelOverride && styles.modelBtnActive]}
            onPress={() => setModelPickerVisible(true)}
          >
            <Text
              style={[styles.modelBtnText, chat?.modelOverride && styles.modelBtnTextActive]}
            >
              {chat?.modelOverride ? 'Model*' : 'Model'}
            </Text>
          </Pressable>
        </View>

        <FlatList
          data={reversedMessages}
          inverted
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ChatBubble message={item} onLongPress={setMenuMessage} />
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
      {chat ? (
        <ChatModelPickerModal
          visible={modelPickerVisible}
          scope="section"
          scopeConfig={scopeConfig}
          currentOverride={chat.modelOverride}
          onClose={() => setModelPickerVisible(false)}
          onSave={handleSaveModelOverride}
          onClear={handleClearModelOverride}
        />
      ) : null}
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
  headerInfo: { flex: 1 },
  title: { color: colors.text, fontSize: fontSize.lg, fontWeight: '600' },
  context: { color: colors.textSecondary, fontSize: fontSize.sm, marginTop: 2 },
  modelBtn: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 1,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modelBtnActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(96, 139, 219, 0.2)',
  },
  modelBtnText: { color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: '700' },
  modelBtnTextActive: { color: colors.primary },
  messageList: { paddingVertical: spacing.md },
  typingBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.xs },
  typingText: { color: colors.textSecondary, fontSize: fontSize.sm },
  errorBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(224, 108, 117, 0.15)', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
  },
  errorText: { color: colors.red, fontSize: fontSize.sm, flex: 1 },
  errorDismiss: { color: colors.red, fontSize: fontSize.md, fontWeight: '600', paddingLeft: spacing.md },
});
