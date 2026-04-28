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
import { getChatById, deleteMessage, updateChatModelOverride } from '@/src/db/queries/chats';
import { getScopeConfig } from '@/src/ai/scopes';
import { SaveAsLearningModal, useSaveLearningStore, useLearningChat } from '@/src/features/learning';
import {
  ChatModelPickerSheet,
  chatModelOptionToOverride,
  useChatModelOverride,
  useChatPromptContext,
} from '@/src/features/chat';
import { ChatPersonaPickerSheet, useChatPersona } from '@/src/features/personas';
import { useSendMessage } from '@/src/hooks/use-send-message';
import { chatKeys } from '@/src/hooks/query-keys';
import { ChatBubble } from '@/src/ui/components/ChatBubble';
import { ChatInput } from '@/src/ui/components/ChatInput';
import { BubbleMenu } from '@/src/ui/components/BubbleMenu';
import { ChatModelPickerModal } from '@/src/ui/components/ChatModelPickerModal';
import type { ChatMessage, ChatModelOverride, ConceptId } from '@/src/domain/types';
import type { RetrievedMemory } from '@/src/features/learning/retrieval/types/retrieval';

export default function LearningChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const conceptId = id as ConceptId;
  const queryClient = useQueryClient();
  const openLearning = useSaveLearningStore((s) => s.open);
  const [menuMessage, setMenuMessage] = useState<ChatMessage | null>(null);
  const [legacyModelPickerVisible, setLegacyModelPickerVisible] = useState(false);
  const [modelPickerVisible, setModelPickerVisible] = useState(false);
  const [personaPickerVisible, setPersonaPickerVisible] = useState(false);
  const [personaHint, setPersonaHint] = useState('');
  const personaHintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const memoriesRef = useRef<RetrievedMemory[]>([]);
  const scopeConfig = getScopeConfig('learning');

  const { chatId, concept, related } = useLearningChat(conceptId);

  const { data: chat } = useQuery({
    queryKey: chatKeys.detail(chatId!),
    queryFn: () => getChatById(chatId!),
    enabled: !!chatId,
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

  const { send, sending, error, clearError } = useSendMessage(
    chatId,
    'learning',
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
      if (chatId) queryClient.invalidateQueries({ queryKey: chatKeys.detail(chatId) });
    },
    [chatId, queryClient],
  );

  const handleSaveAsLearning = useCallback(
    (msg: ChatMessage) => {
      if (chatId) openLearning(msg, chatId);
    },
    [openLearning, chatId],
  );

  const handleSaveModelOverride = useCallback(
    async (override: ChatModelOverride) => {
      if (!chatId) return;
      await updateChatModelOverride(chatId, override);
      queryClient.invalidateQueries({ queryKey: chatKeys.detail(chatId) });
      queryClient.invalidateQueries({ queryKey: chatKeys.recent });
    },
    [chatId, queryClient],
  );

  const handleClearModelOverride = useCallback(
    async () => {
      if (!chatId) return;
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

  if (!concept) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

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
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {concept.name}
            </Text>
          </View>
          <Pressable
            style={[styles.modelBtn, personaQuery.data && styles.modelBtnActive]}
            onPress={() => setPersonaPickerVisible(true)}
            disabled={!chatId}
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
            disabled={!chatId}
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
              disabled={!chatId}
            >
              <Text style={[styles.modelBtnText, styles.modelBtnTextActive]}>Legacy</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.banner}>
          <Text style={styles.bannerSummary} numberOfLines={3}>
            {concept.summary}
          </Text>
          {related.length > 0 && (
            <View style={styles.bannerRelated}>
              <Text style={styles.bannerLabel}>Related:</Text>
              {related.map((r) => (
                <Pressable
                  key={r.concept.id}
                  style={styles.bannerChip}
                  onPress={() => router.push(`/learning/chat/${r.concept.id}`)}
                >
                  <Text style={styles.bannerChipText} numberOfLines={1}>
                    {r.concept.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
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

        {personaHint ? (
          <View style={styles.hintBar}>
            <Text style={styles.hintText}>{personaHint}</Text>
          </View>
        ) : null}

        <ChatInput onSend={handleSend} disabled={sending || !chatId} />
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
          scope="learning"
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
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    gap: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
  backBtn: { color: colors.primary, fontSize: fontSize.xl, fontWeight: '600', paddingHorizontal: spacing.xs },
  headerInfo: { flex: 1 },
  headerTitle: { color: colors.text, fontSize: fontSize.lg, fontWeight: '600' },
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
  banner: {
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
  bannerSummary: { color: colors.textSecondary, fontSize: fontSize.sm },
  bannerRelated: {
    flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap',
    marginTop: spacing.sm, gap: spacing.xs,
  },
  bannerLabel: { color: colors.textSecondary, fontSize: fontSize.sm, marginRight: spacing.xs },
  bannerChip: { backgroundColor: `${colors.purple}20`, borderRadius: 10, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  bannerChipText: { color: colors.purple, fontSize: 11, fontWeight: '500' },
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
});
