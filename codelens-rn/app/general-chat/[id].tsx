import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
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
import { getChatById, deleteMessage, updateChatModelOverride } from '@/src/db/queries/chats';
import { getScopeConfig } from '@/src/ai/scopes';
import { useSendMessage } from '@/src/hooks/use-send-message';
import { ChatBubble } from '@/src/ui/components/ChatBubble';
import { ChatInput } from '@/src/ui/components/ChatInput';
import { BubbleMenu } from '@/src/ui/components/BubbleMenu';
import { ChatModelPickerModal } from '@/src/ui/components/ChatModelPickerModal';
import {
  ChatModelPickerSheet,
  chatModelOptionToOverride,
  useChatModelOverride,
  useChatPromptContext,
} from '@/src/features/chat';
import { SaveAsLearningModal, useSaveLearningStore } from '@/src/features/learning';
import { ChatPersonaPickerSheet, useChatPersona } from '@/src/features/personas';
import type { ChatId, ChatMessage, ChatModelOverride } from '@/src/domain/types';
import type { RetrievedMemory } from '@/src/features/learning/retrieval/types/retrieval';

export default function GeneralChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const chatId = id as ChatId;
  const queryClient = useQueryClient();
  const openLearning = useSaveLearningStore((s) => s.open);
  const [menuMessage, setMenuMessage] = useState<ChatMessage | null>(null);
  const [legacyModelPickerVisible, setLegacyModelPickerVisible] = useState(false);
  const [modelPickerVisible, setModelPickerVisible] = useState(false);
  const [personaPickerVisible, setPersonaPickerVisible] = useState(false);
  const [personaHint, setPersonaHint] = useState('');
  const personaHintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const memoriesRef = useRef<RetrievedMemory[]>([]);
  const scopeConfig = getScopeConfig('general');

  const { data: chat } = useQuery({
    queryKey: chatKeys.detail(chatId),
    queryFn: () => getChatById(chatId),
  });

  const messages = chat?.messages ?? [];
  const reversedMessages = useMemo(() => [...messages].reverse(), [messages]);
  const personaQuery = useChatPersona(chatId);
  const modelOverrideQuery = useChatModelOverride(chatId);
  const buildPrompt = useChatPromptContext({
    persona: personaQuery.data ?? null,
    memoriesRef,
    codeContext: null,
  });
  const routingOverride = useMemo(
    () => modelOverrideQuery.data
      ? chatModelOptionToOverride(modelOverrideQuery.data)
      : chat?.modelOverride,
    [chat?.modelOverride, modelOverrideQuery.data],
  );

  const {
    send,
    sending,
    isGenerationInFlight,
    stopGenerating,
    error,
    clearError,
  } = useSendMessage(
    chatId,
    'general',
    buildPrompt,
    messages,
    routingOverride,
  );

  useEffect(() => () => {
    if (personaHintTimer.current) clearTimeout(personaHintTimer.current);
  }, []);

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
  const personaLabel = personaQuery.data?.name ?? 'Default';
  const modelLabel = modelOverrideQuery.data?.displayName
    ?? (chat?.modelOverrideId ? 'Model unavailable' : 'Default');

  const handleSend = useCallback(
    (text: string, context?: { memories: RetrievedMemory[] }) => {
      memoriesRef.current = context?.memories ?? [];
      void send(text);
    },
    [send],
  );

  const handlePersonaPicked = useCallback((persona: typeof personaQuery.data | null) => {
    setPersonaHint(
      persona
        ? `Responses will now follow ${persona.name}.`
        : 'Responses will use the default assistant style.',
    );
    if (personaHintTimer.current) clearTimeout(personaHintTimer.current);
    personaHintTimer.current = setTimeout(() => setPersonaHint(''), 3_000);
  }, []);

  const handleUserTyping = useCallback(() => {
    if (personaHintTimer.current) {
      clearTimeout(personaHintTimer.current);
      personaHintTimer.current = null;
    }
    setPersonaHint('');
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoiding}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={styles.backBtn}>{'<'}</Text>
          </Pressable>
          <Text style={styles.title} numberOfLines={1}>
            {chat?.title ?? 'General Chat'}
          </Text>
          <Pressable
            style={[styles.modelBtn, personaQuery.data && styles.modelBtnActive]}
            onPress={() => setPersonaPickerVisible(true)}
          >
            <Text
              style={[styles.modelBtnText, personaQuery.data && styles.modelBtnTextActive]}
              numberOfLines={1}
            >
              {personaLabel}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.modelBtn, chat?.modelOverrideId && styles.modelBtnActive]}
            onPress={() => setModelPickerVisible(true)}
          >
            <Text
              style={[styles.modelBtnText, chat?.modelOverrideId && styles.modelBtnTextActive]}
              numberOfLines={1}
            >
              {modelLabel}
            </Text>
          </Pressable>
          {chat?.modelOverride ? (
            <Pressable
              style={[styles.modelBtn, styles.modelBtnActive]}
              onPress={() => setLegacyModelPickerVisible(true)}
            >
              <Text style={[styles.modelBtnText, styles.modelBtnTextActive]}>Legacy</Text>
            </Pressable>
          ) : null}
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

        {sending && isGenerationInFlight ? (
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

        {personaHint ? (
          <View style={styles.hintBar}>
            <Text style={styles.hintText}>{personaHint}</Text>
          </View>
        ) : null}

        <ChatInput
          onSend={handleSend}
          disabled={sending}
          isGenerationInFlight={isGenerationInFlight}
          onStop={stopGenerating}
          onUserTyping={handleUserTyping}
        />
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
        <ChatModelPickerSheet
          visible={modelPickerVisible}
          chatId={chatId}
          currentModelId={chat.modelOverrideId}
          onClose={() => setModelPickerVisible(false)}
        />
      ) : null}
      {chat ? (
        <ChatPersonaPickerSheet
          visible={personaPickerVisible}
          chatId={chatId}
          currentPersona={personaQuery.data ?? null}
          onPicked={handlePersonaPicked}
          onClose={() => setPersonaPickerVisible(false)}
        />
      ) : null}
      {chat?.modelOverride ? (
        <ChatModelPickerModal
          visible={legacyModelPickerVisible}
          scope="general"
          scopeConfig={scopeConfig}
          currentOverride={chat.modelOverride}
          onClose={() => setLegacyModelPickerVisible(false)}
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
  title: { color: colors.text, fontSize: fontSize.lg, fontWeight: '600', flex: 1 },
  modelBtn: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 1,
    borderWidth: 1,
    borderColor: colors.border,
    maxWidth: 112,
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
  hintBar: {
    backgroundColor: 'rgba(96, 139, 219, 0.14)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
  hintText: { color: colors.primary, fontSize: fontSize.sm, fontWeight: '600' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xl },
  emptyText: { color: colors.textSecondary, fontSize: fontSize.lg, fontWeight: '600' },
  emptyHint: { color: colors.textSecondary, fontSize: fontSize.md, textAlign: 'center', marginTop: spacing.sm, opacity: 0.7 },
});
