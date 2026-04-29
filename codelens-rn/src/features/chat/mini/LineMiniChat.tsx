import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { colors, fontSize, spacing } from '../../../ui/theme';
import { StopGeneratingButton } from '../ui/StopGeneratingButton';
import { MINI_CHAT_MAX_EXCHANGES } from '../promptComposition/constants';
import { useMiniChat } from './useMiniChat';
import type { ChatCodeContext } from '../promptComposition/types';
import type { MiniChatMessage, MiniChatSaveContext } from './types';

interface Props {
  visible: boolean;
  lineRef: ChatCodeContext | null;
  onExpandToChat: (history: MiniChatMessage[], lineRef: ChatCodeContext) => void;
  onSaveCapture: (context: MiniChatSaveContext) => void;
  onClose: () => void;
}

export function LineMiniChat({
  visible,
  lineRef,
  onExpandToChat,
  onSaveCapture,
  onClose,
}: Props) {
  if (!visible || !lineRef) return null;
  return (
    <LineMiniChatContent
      lineRef={lineRef}
      onExpandToChat={onExpandToChat}
      onSaveCapture={onSaveCapture}
      onClose={onClose}
    />
  );
}

function LineMiniChatContent({
  lineRef,
  onExpandToChat,
  onSaveCapture,
  onClose,
}: Omit<Props, 'visible'> & { lineRef: ChatCodeContext }) {
  const [draft, setDraft] = useState('');
  const miniChat = useMiniChat(lineRef);
  const fileName = lineRef.filePath?.split('/').pop() ?? 'Code';
  const lineLabel = lineRef.startLine ? `Line ${lineRef.startLine}` : 'Line';

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [onClose]);

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    void miniChat.send(text);
  };

  const expand = () => {
    onExpandToChat(miniChat.messages, lineRef);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.overlay}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.fileChip} numberOfLines={1}>{fileName}</Text>
              <Text style={styles.lineText}>{lineLabel}</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8}>
              <Text style={styles.closeText}>x</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
            <View style={styles.anchorBox}>
              <Text style={styles.anchorLabel}>Anchored code</Text>
              <Text style={styles.anchorCode}>{lineRef.text || ' '}</Text>
            </View>
            {miniChat.messages.map((message) => (
              <View
                key={message.id}
                style={[
                  styles.messageBubble,
                  message.role === 'user' ? styles.userBubble : styles.assistantBubble,
                ]}
              >
                <Text style={styles.messageText}>{message.content}</Text>
                {message.role === 'assistant' ? (
                  <Pressable
                    style={styles.saveBtn}
                    onPress={() =>
                      onSaveCapture({
                        lineRef,
                        history: miniChat.messages,
                        selectedMessageId: message.id,
                      })
                    }
                  >
                    <Text style={styles.saveText}>Save what clicked</Text>
                  </Pressable>
                ) : null}
              </View>
            ))}
            {miniChat.sending ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadingText}>Thinking...</Text>
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.footerActions}>
            <Pressable style={styles.expandBtn} onPress={expand}>
              <Text style={styles.expandText}>Expand to full chat -&gt;</Text>
            </Pressable>
            <Text style={styles.counterText}>
              {miniChat.exchangeCount}/{MINI_CHAT_MAX_EXCHANGES}
            </Text>
          </View>

          {miniChat.isAtLimit ? (
            <Pressable style={styles.limitBtn} onPress={expand}>
              <Text style={styles.limitText}>Continue this in the full chat -&gt;</Text>
            </Pressable>
          ) : (
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={draft}
                onChangeText={setDraft}
                editable={!miniChat.sending}
                placeholder="Ask a quick question..."
                placeholderTextColor={colors.textSecondary}
                multiline
              />
              {miniChat.isGenerationInFlight ? (
                <StopGeneratingButton onPress={miniChat.stopGenerating} />
              ) : (
                <Pressable
                  style={[
                    styles.sendBtn,
                    (!draft.trim() || miniChat.sending) && styles.sendBtnDisabled,
                  ]}
                  onPress={send}
                  disabled={!draft.trim() || miniChat.sending}
                >
                  <Text style={styles.sendText}>Send</Text>
                </Pressable>
              )}
            </View>
          )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    flex: 1,
    justifyContent: 'flex-end',
    zIndex: 30,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    minHeight: '30%',
    maxHeight: '60%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerText: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  fileChip: {
    maxWidth: 180,
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '700',
    backgroundColor: colors.surfaceLight,
    borderRadius: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  lineText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  closeText: {
    color: colors.textSecondary,
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  anchorBox: {
    backgroundColor: colors.background,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.sm,
  },
  anchorLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginBottom: spacing.xs,
  },
  anchorCode: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  messageBubble: {
    maxWidth: '86%',
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceLight,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  messageText: {
    color: colors.text,
    fontSize: fontSize.md,
    lineHeight: 20,
  },
  saveBtn: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
    borderRadius: 4,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  saveText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  footerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  expandBtn: {
    paddingVertical: spacing.xs,
  },
  expandText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  counterText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    padding: spacing.md,
  },
  input: {
    flex: 1,
    maxHeight: 88,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    color: colors.text,
    fontSize: fontSize.md,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? spacing.sm + 2 : spacing.sm,
  },
  sendBtn: {
    borderRadius: 18,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  sendBtnDisabled: {
    opacity: 0.45,
  },
  sendText: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  limitBtn: {
    margin: spacing.md,
    minHeight: 44,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  limitText: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
});
