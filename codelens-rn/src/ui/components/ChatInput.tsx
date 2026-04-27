import { useEffect, useMemo, useState } from 'react';
import {
  View,
  TextInput,
  Pressable,
  Text,
  StyleSheet,
  Platform,
} from 'react-native';
import { colors, fontSize, spacing } from '../theme';
import {
  DotConnectorIndicator,
  MemoryPreviewSheet,
  getInjectionModeConfig,
  useDotConnectorRetrieve,
  useDotConnectorSettings,
  useSendWithInjection,
  withoutRemoved,
} from '../../features/learning/dot-connector';
import { formatMemoriesForInjection } from '../../features/learning/retrieval';
import type { DotConnectorIndicatorStatus } from '../../features/learning/dot-connector';

interface Props {
  onSend: (text: string, opts?: { outboundText?: string }) => void;
  disabled?: boolean | undefined;
}

export function ChatInput({ onSend, disabled }: Props) {
  const [text, setText] = useState('');
  const settings = useDotConnectorSettings();
  const [perTurnEnabled, setPerTurnEnabled] = useState(
    settings.enableDotConnector && settings.dotConnectorPerTurnDefault === 'on',
  );
  const [previewVisible, setPreviewVisible] = useState(false);
  const [removedMemoryIds, setRemovedMemoryIds] = useState<string[]>([]);
  const retrieval = useDotConnectorRetrieve(text, settings, perTurnEnabled);
  const { prepareSend } = useSendWithInjection(settings);
  const config = getInjectionModeConfig(settings.injectionMode);
  const activeMemories = useMemo(
    () => withoutRemoved(retrieval.snapshot?.result.memories ?? [], removedMemoryIds),
    [retrieval.snapshot, removedMemoryIds],
  );
  const activeInjection = useMemo(
    () => formatMemoriesForInjection(activeMemories, {
      tokenBudget: config.tokenBudget,
      maxItems: config.limit,
    }),
    [activeMemories, config.limit, config.tokenBudget],
  );
  const indicatorStatus: DotConnectorIndicatorStatus = useMemo(() => {
    if (!settings.enableDotConnector || !perTurnEnabled) return 'disabled';
    if (retrieval.isLoading) return 'loading';
    if (retrieval.error) return 'unavailable';
    const status = retrieval.result?.diagnostics.status;
    if (status === 'partial') return 'partial';
    if (status === 'unavailable') return 'unavailable';
    if (status === 'ok') return 'ok';
    return 'idle';
  }, [settings.enableDotConnector, perTurnEnabled, retrieval.error, retrieval.isLoading, retrieval.result]);

  useEffect(() => {
    setPerTurnEnabled(settings.enableDotConnector && settings.dotConnectorPerTurnDefault === 'on');
  }, [settings.enableDotConnector, settings.dotConnectorPerTurnDefault]);

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    const sendResult = await prepareSend({
      query: trimmed,
      perTurnEnabled,
      typingSnapshot: retrieval.snapshot,
      removedMemoryIds,
    });
    onSend(trimmed, { outboundText: sendResult.outboundText });
    setText('');
    setRemovedMemoryIds([]);
    setPerTurnEnabled(settings.enableDotConnector && settings.dotConnectorPerTurnDefault === 'on');
  }

  const previewState = retrieval.snapshot
    ? {
      memories: activeMemories,
      diagnostics: retrieval.snapshot.result.diagnostics,
      injection: activeInjection,
      maxItems: config.limit,
    }
    : null;

  return (
    <>
      <View style={styles.container}>
        <View style={styles.inputColumn}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Type a message..."
            placeholderTextColor={colors.textSecondary}
            multiline
            maxLength={4000}
            editable={!disabled}
          />
          <DotConnectorIndicator
            status={indicatorStatus}
            count={activeInjection.includedCount}
            maxItems={config.limit}
            onTapPreview={() => {
              if (previewState) setPreviewVisible(true);
            }}
            onTogglePerTurn={setPerTurnEnabled}
            perTurnEnabled={perTurnEnabled}
            partialReason={retrieval.result?.diagnostics.partialReason}
          />
          {retrieval.partialNotice ? (
            <Text style={styles.diagnosticsNotice} numberOfLines={2}>{retrieval.partialNotice}</Text>
          ) : null}
        </View>
        <Pressable
          style={[styles.sendBtn, disabled && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={disabled}
        >
          <Text style={styles.sendBtnText}>Send</Text>
        </Pressable>
      </View>
      {previewState ? (
        <MemoryPreviewSheet
          visible={previewVisible}
          {...previewState}
          removedMemoryIds={removedMemoryIds}
          onRemoveMemory={(id) => setRemovedMemoryIds((current) => [...new Set([...current, id])])}
          onUseThese={() => setPreviewVisible(false)}
          onDisableTurn={() => {
            setPerTurnEnabled(false);
            setPreviewVisible(false);
          }}
          onClose={() => setPreviewVisible(false)}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    color: colors.text,
    fontSize: fontSize.md,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? spacing.sm + 2 : spacing.sm,
    maxHeight: 100,
  },
  inputColumn: {
    flex: 1,
    gap: spacing.xs,
  },
  diagnosticsNotice: {
    color: colors.yellow,
    fontSize: fontSize.sm,
  },
  sendBtn: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
  sendBtnText: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
});
