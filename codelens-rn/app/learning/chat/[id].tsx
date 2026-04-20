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
import { getChatById, deleteMessage, updateChatModelOverride } from '@/src/db/queries/chats';
import { getScopeConfig } from '@/src/ai/scopes';
import { SaveAsLearningModal, useSaveLearningStore, useLearningChat, buildLearningSystemPrompt } from '@/src/features/learning';
import { useSendMessage } from '@/src/hooks/use-send-message';
import { chatKeys } from '@/src/hooks/query-keys';
import { ChatBubble } from '@/src/ui/components/ChatBubble';
import { ChatInput } from '@/src/ui/components/ChatInput';
import { BubbleMenu } from '@/src/ui/components/BubbleMenu';
import { ChatModelPickerModal } from '@/src/ui/components/ChatModelPickerModal';
import type { ChatMessage, ChatModelOverride, ConceptId } from '@/src/domain/types';

export default function LearningChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const conceptId = id as ConceptId;
  const queryClient = useQueryClient();
  const openLearning = useSaveLearningStore((s) => s.open);
  const [menuMessage, setMenuMessage] = useState<ChatMessage | null>(null);
  const [modelPickerVisible, setModelPickerVisible] = useState(false);
  const scopeConfig = getScopeConfig('learning');

  const { chatId, concept, related } = useLearningChat(conceptId);

  const { data: chat } = useQuery({
    queryKey: chatKeys.detail(chatId!),
    queryFn: () => getChatById(chatId!),
    enabled: !!chatId,
  });

  const messages = chat?.messages ?? [];
  const reversedMessages = useMemo(() => [...messages].reverse(), [messages]);

  const buildPrompt = useCallback(() => {
    if (!concept) return '';
    return buildLearningSystemPrompt(
      concept.name,
      concept.summary,
      related.map((r) => ({ name: r.concept.name, summary: r.concept.summary })),
    );
  }, [concept, related]);

  const { send, sending, error, clearError } = useSendMessage(
    chatId,
    'learning',
    buildPrompt,
    messages,
    chat?.modelOverride,
  );

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
        behavior="padding"
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
            style={[styles.modelBtn, chat?.modelOverride && styles.modelBtnActive]}
            onPress={() => setModelPickerVisible(true)}
            disabled={!chatId}
          >
            <Text
              style={[styles.modelBtnText, chat?.modelOverride && styles.modelBtnTextActive]}
            >
              {chat?.modelOverride ? 'Model*' : 'Model'}
            </Text>
          </Pressable>
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
          scope="learning"
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
});
