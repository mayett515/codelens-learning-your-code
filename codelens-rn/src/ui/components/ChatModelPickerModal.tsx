import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  StyleSheet,
} from 'react-native';
import {
  buildCompletionAttempts,
  buildCompletionRouting,
} from '@/src/ai/fallback';
import { colors, fontSize, spacing } from '../theme';
import type {
  ChatModelOverride,
  ChatScope,
  Provider,
  ScopeModelConfig,
} from '@/src/domain/types';

const PROVIDERS: Provider[] = ['openrouter', 'siliconflow', 'google', 'opencodego'];

const PROVIDER_LABELS: Record<Provider, string> = {
  openrouter: 'OpenRouter',
  siliconflow: 'SiliconFlow',
  google: 'Google AI Studio',
  opencodego: 'OpenCode Go',
};

interface Props {
  visible: boolean;
  scope: ChatScope;
  scopeConfig: ScopeModelConfig;
  currentOverride?: ChatModelOverride | undefined;
  onClose: () => void;
  onSave: (override: ChatModelOverride) => void | Promise<void>;
  onClear: () => void | Promise<void>;
}

export function ChatModelPickerModal({
  visible,
  scope,
  scopeConfig,
  currentOverride,
  onClose,
  onSave,
  onClear,
}: Props) {
  const [provider, setProvider] = useState<Provider>(scopeConfig.provider);
  const [model, setModel] = useState(scopeConfig.models[scopeConfig.provider]);

  useEffect(() => {
    if (!visible) return;
    const initialProvider = currentOverride?.provider ?? scopeConfig.provider;
    const initialModel = currentOverride?.model ?? scopeConfig.models[initialProvider];
    setProvider(initialProvider);
    setModel(initialModel);
  }, [visible, currentOverride, scopeConfig]);

  const attemptPreview = useMemo(() => {
    const routing = buildCompletionRouting(scopeConfig, {
      provider,
      model,
    });
    return buildCompletionAttempts(routing).slice(0, 8);
  }, [scopeConfig, provider, model]);

  async function handleSave() {
    const trimmed = model.trim();
    if (!trimmed) return;
    await onSave({ provider, model: trimmed });
    onClose();
  }

  async function handleClear() {
    await onClear();
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>Chat Model</Text>
          <Text style={styles.subtitle}>
            Scope: {scope.toUpperCase()} {currentOverride ? '(override active)' : '(using scope default)'}
          </Text>

          <View style={styles.providerRow}>
            {PROVIDERS.map((p) => (
              <Pressable
                key={p}
                style={[styles.providerBtn, provider === p && styles.providerBtnActive]}
                onPress={() => {
                  setProvider(p);
                  if (!model.trim()) {
                    setModel(scopeConfig.models[p]);
                  }
                }}
              >
                <Text
                  style={[
                    styles.providerBtnText,
                    provider === p && styles.providerBtnTextActive,
                  ]}
                >
                  {PROVIDER_LABELS[p]}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Model ID</Text>
          <TextInput
            style={styles.input}
            value={model}
            onChangeText={setModel}
            placeholder="model-id"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>Attempt Order Preview</Text>
          <ScrollView style={styles.previewBox} contentContainerStyle={styles.previewContent}>
            {attemptPreview.map((attempt, index) => (
              <Text key={`${attempt.provider}:${attempt.model}`} style={styles.previewLine}>
                {index + 1}. {PROVIDER_LABELS[attempt.provider]} - {attempt.model}
              </Text>
            ))}
          </ScrollView>

          <View style={styles.actions}>
            <Pressable style={styles.clearBtn} onPress={handleClear}>
              <Text style={styles.clearBtnText}>Use Scope Default</Text>
            </Pressable>
            <Pressable style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>Save Override</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  sheet: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  providerRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  providerBtn: {
    flex: 1,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  providerBtnActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(96, 139, 219, 0.2)',
  },
  providerBtnText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  providerBtnTextActive: {
    color: colors.primary,
  },
  label: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  input: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    color: colors.text,
    fontSize: fontSize.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontFamily: 'monospace',
  },
  previewBox: {
    maxHeight: 150,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  previewContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  previewLine: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  clearBtn: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  clearBtnText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  saveBtn: {
    flex: 1,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  saveBtnText: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
});
