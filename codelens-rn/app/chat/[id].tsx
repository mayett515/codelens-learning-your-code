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
import { chatKeys, fileKeys } from '@/src/hooks/query-keys';
import {
  getChatById,
  deleteMessage,
  updateChatModelOverride,
  updateChatRange,
} from '@/src/db/queries/chats';
import { getFileById } from '@/src/db/queries/files';
import { getScopeConfig } from '@/src/ai/scopes';
import { useSendMessage } from '@/src/hooks/use-send-message';
import { ChatBubble } from '@/src/ui/components/ChatBubble';
import { ChatInput } from '@/src/ui/components/ChatInput';
import { BubbleMenu } from '@/src/ui/components/BubbleMenu';
import { ChatModelPickerModal } from '@/src/ui/components/ChatModelPickerModal';
import {
  ChatModelPickerSheet,
  SelectedCodeAdjuster,
  SelectedCodePreview,
  chatModelOptionToOverride,
  inferLanguageFromPath,
  sliceCodeFromLines,
  useChatModelOverride,
  useChatPromptContext,
} from '@/src/features/chat';
import { SaveAsLearningModal, useSaveLearningStore } from '@/src/features/learning';
import { ChatPersonaPickerSheet, useChatPersona } from '@/src/features/personas';
import type { ChatCodeContext } from '@/src/features/chat';
import type { ChatId, ChatMessage, ChatModelOverride } from '@/src/domain/types';
import type { RetrievedMemory } from '@/src/features/learning/retrieval/types/retrieval';

interface CodeContextOverride {
  value: ChatCodeContext | null;
  truncated: boolean;
}

export default function SectionChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const chatId = id as ChatId;
  const queryClient = useQueryClient();
  const openLearning = useSaveLearningStore((s) => s.open);
  const [menuMessage, setMenuMessage] = useState<ChatMessage | null>(null);
  const [legacyModelPickerVisible, setLegacyModelPickerVisible] = useState(false);
  const [modelPickerVisible, setModelPickerVisible] = useState(false);
  const [personaPickerVisible, setPersonaPickerVisible] = useState(false);
  const [personaHint, setPersonaHint] = useState('');
  const [contextOverride, setContextOverride] = useState<CodeContextOverride | null>(null);
  const [adjustVisible, setAdjustVisible] = useState(false);
  const personaHintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const memoriesRef = useRef<RetrievedMemory[]>([]);
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
  const personaQuery = useChatPersona(chatId);
  const modelOverrideQuery = useChatModelOverride(chatId);

  const fileLines = useMemo(() => file?.content?.split('\n') ?? [], [file?.content]);

  const initialCodeContext = useMemo<{ value: ChatCodeContext; truncated: boolean } | null>(() => {
    if (!file || chat?.startLine == null || chat?.endLine == null) return null;
    const slice = sliceCodeFromLines({
      fileLines: file.content.split('\n'),
      startLine: chat.startLine,
      endLine: chat.endLine,
    });
    return {
      value: {
        kind: 'selected_code',
        text: slice.text,
        filePath: file.path,
        language: inferLanguageFromPath(file.path),
        startLine: slice.startLine,
        endLine: slice.endLine,
      },
      truncated: slice.truncated,
    };
  }, [file, chat?.startLine, chat?.endLine]);

  const codeContext = useMemo<ChatCodeContext | null>(
    () => (contextOverride ? contextOverride.value : initialCodeContext?.value ?? null),
    [contextOverride, initialCodeContext],
  );

  const codeContextTruncated = contextOverride
    ? contextOverride.truncated
    : Boolean(initialCodeContext?.truncated);

  const buildPrompt = useChatPromptContext({
    persona: personaQuery.data ?? null,
    memoriesRef,
    codeContext,
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
    'section',
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

  const headerContext =
    file && chat?.startLine != null && chat?.endLine != null
      ? `${file.path}:${chat.startLine}-${chat.endLine}`
      : null;
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

  const handleRemoveCodeContext = useCallback(() => {
    setContextOverride({ value: null, truncated: false });
    setAdjustVisible(false);
  }, []);

  const handleAdjustOpen = useCallback(() => {
    if (codeContext) setAdjustVisible(true);
  }, [codeContext]);

  const handleAdjustCancel = useCallback(() => {
    setAdjustVisible(false);
  }, []);

  const handleAdjustConfirm = useCallback(
    async (next: { startLine: number; endLine: number; text: string; truncated: boolean }) => {
      if (!codeContext) {
        setAdjustVisible(false);
        return;
      }
      const updated: ChatCodeContext = {
        ...codeContext,
        text: next.text,
        startLine: next.startLine,
        endLine: next.endLine,
      };
      setContextOverride({ value: updated, truncated: next.truncated });
      setAdjustVisible(false);
      try {
        await updateChatRange(chatId, next.startLine, next.endLine);
      } catch {
        // Persistence failure leaves the in-memory adjust intact for the next send.
      } finally {
        queryClient.invalidateQueries({ queryKey: chatKeys.detail(chatId) });
      }
    },
    [chatId, codeContext, queryClient],
  );

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
            <Text style={styles.title} numberOfLines={1}>
              {chat?.title ?? 'Chat'}
            </Text>
            {headerContext ? (
              <Text style={styles.context} numberOfLines={1}>{headerContext}</Text>
            ) : null}
          </View>
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

        <FlatList
          data={reversedMessages}
          inverted
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ChatBubble message={item} onLongPress={setMenuMessage} />
          )}
          contentContainerStyle={styles.messageList}
        />

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

        {adjustVisible && codeContext && fileLines.length > 0 ? (
          <SelectedCodeAdjuster
            fileLines={fileLines}
            startLine={codeContext.startLine ?? 1}
            endLine={codeContext.endLine ?? 1}
            onConfirm={handleAdjustConfirm}
            onCancel={handleAdjustCancel}
          />
        ) : codeContext ? (
          <SelectedCodePreview
            codeContext={codeContext}
            truncated={codeContextTruncated}
            onAdjust={handleAdjustOpen}
            onRemove={handleRemoveCodeContext}
          />
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
          scope="section"
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
});
