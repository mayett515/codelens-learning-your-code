import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors, fontSize, spacing } from '@/src/ui/theme';
import { secureStore } from '@/src/composition';
import {
  getChatConfig,
  updateScopeProvider,
  updateScopeModel,
  updateScopeFallbackModels,
  updateScopeCrossProviderFallback,
  updateScopeFreeTierFallbacksOnly,
  getEmbedConfig,
  updateEmbedProvider,
  updateEmbedModel,
} from '@/src/ai/scopes';
import { formatModelListInput, parseModelListInput } from '@/src/ai/fallback';
import {
  reEmbedAll,
  useDotConnectorSettings,
  useReviewSettings,
  useUpdateDotConnectorSettings,
  useUpdateReviewSettings,
} from '@/src/features/learning';
import { BackupSection } from '@/src/features/backup';
import type { ChatScope, Provider } from '@/src/domain/types';

const SCOPES: ChatScope[] = ['section', 'general', 'learning'];
const PROVIDERS: Provider[] = ['openrouter', 'siliconflow'];

const PROVIDER_LABELS: Record<Provider, string> = {
  openrouter: 'OpenRouter',
  siliconflow: 'SiliconFlow',
};

export default function SettingsScreen() {
  const [orKey, setOrKey] = useState('');
  const [sfKey, setSfKey] = useState('');
  const [orKeySet, setOrKeySet] = useState(false);
  const [sfKeySet, setSfKeySet] = useState(false);
  const [config, setConfig] = useState(getChatConfig());
  const [embedCfg, setEmbedCfg] = useState(getEmbedConfig());
  const dotConnectorSettings = useDotConnectorSettings();
  const updateDotConnectorSettings = useUpdateDotConnectorSettings();
  const reviewSettings = useReviewSettings();
  const updateReviewSettings = useUpdateReviewSettings();
  const [reEmbedding, setReEmbedding] = useState(false);
  const [saved, setSaved] = useState('');

  useEffect(() => {
    (async () => {
      const or = await secureStore.getApiKey('openrouter');
      const sf = await secureStore.getApiKey('siliconflow');
      if (or) { setOrKeySet(true); setOrKey(''); }
      if (sf) { setSfKeySet(true); setSfKey(''); }
    })();
  }, []);

  async function saveOrKey() {
    if (!orKey.trim()) return;
    await secureStore.setApiKey('openrouter', orKey.trim());
    setOrKeySet(true);
    setOrKey('');
    flash('OpenRouter key saved');
  }

  async function saveSfKey() {
    if (!sfKey.trim()) return;
    await secureStore.setApiKey('siliconflow', sfKey.trim());
    setSfKeySet(true);
    setSfKey('');
    flash('SiliconFlow key saved');
  }

  async function clearOrKey() {
    await secureStore.deleteApiKey('openrouter');
    setOrKeySet(false);
    flash('OpenRouter key cleared');
  }

  async function clearSfKey() {
    await secureStore.deleteApiKey('siliconflow');
    setSfKeySet(false);
    flash('SiliconFlow key cleared');
  }

  function handleProviderChange(scope: ChatScope, provider: Provider) {
    updateScopeProvider(scope, provider);
    setConfig(getChatConfig());
    flash(`${scope} → ${PROVIDER_LABELS[provider]}`);
  }

  function handleModelChange(scope: ChatScope, provider: Provider, model: string) {
    updateScopeModel(scope, provider, model);
    setConfig(getChatConfig());
  }

  function handleFallbackModelsChange(scope: ChatScope, provider: Provider, text: string) {
    updateScopeFallbackModels(scope, provider, parseModelListInput(text));
    setConfig(getChatConfig());
  }

  function handleCrossProviderFallbackToggle(scope: ChatScope, enabled: boolean) {
    updateScopeCrossProviderFallback(scope, enabled);
    setConfig(getChatConfig());
    flash(`${scope} cross-provider fallback ${enabled ? 'enabled' : 'disabled'}`);
  }

  function handleFreeTierFallbacksOnlyToggle(scope: ChatScope, enabled: boolean) {
    updateScopeFreeTierFallbacksOnly(scope, enabled);
    setConfig(getChatConfig());
    flash(`${scope} free-tier fallbacks ${enabled ? 'enabled' : 'disabled'}`);
  }

  function handleEmbedProviderChange(provider: Provider) {
    updateEmbedProvider(provider);
    setEmbedCfg(getEmbedConfig());
    flash(`Embed → ${PROVIDER_LABELS[provider]}`);
  }

  function handleEmbedModelChange(model: string) {
    updateEmbedModel(model);
    setEmbedCfg(getEmbedConfig());
  }

  async function handleReEmbed() {
    setReEmbedding(true);
    try {
      const result = await reEmbedAll(true);
      flash(`Re-embedded: ${result.succeeded} ok, ${result.failed} failed`);
    } catch (e) {
      flash(`Re-embed error: ${e instanceof Error ? e.message : 'unknown'}`);
    } finally {
      setReEmbedding(false);
    }
  }

  function flash(msg: string) {
    setSaved(msg);
    setTimeout(() => setSaved(''), 2000);
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.backBtn}>{'<'}</Text>
        </Pressable>
        <Text style={styles.title}>Settings</Text>
      </View>

      {saved ? (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{saved}</Text>
        </View>
      ) : null}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
      <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionTitle}>API Keys</Text>

        <View style={styles.keySection}>
          <Text style={styles.label}>OpenRouter</Text>
          {orKeySet ? (
            <View style={styles.keyRow}>
              <Text style={styles.keySet}>Key set</Text>
              <Pressable style={styles.clearBtn} onPress={clearOrKey}>
                <Text style={styles.clearBtnText}>Clear</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.keyRow}>
              <TextInput
                style={styles.keyInput}
                placeholder="sk-or-..."
                placeholderTextColor={colors.textSecondary}
                value={orKey}
                onChangeText={setOrKey}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
              />
              <Pressable style={styles.saveBtn} onPress={saveOrKey}>
                <Text style={styles.saveBtnText}>Save</Text>
              </Pressable>
            </View>
          )}
        </View>

        <View style={styles.keySection}>
          <Text style={styles.label}>SiliconFlow</Text>
          {sfKeySet ? (
            <View style={styles.keyRow}>
              <Text style={styles.keySet}>Key set</Text>
              <Pressable style={styles.clearBtn} onPress={clearSfKey}>
                <Text style={styles.clearBtnText}>Clear</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.keyRow}>
              <TextInput
                style={styles.keyInput}
                placeholder="sk-..."
                placeholderTextColor={colors.textSecondary}
                value={sfKey}
                onChangeText={setSfKey}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
              />
              <Pressable style={styles.saveBtn} onPress={saveSfKey}>
                <Text style={styles.saveBtnText}>Save</Text>
              </Pressable>
            </View>
          )}
        </View>

        <Text style={styles.sectionTitle}>Model Config</Text>
        <Text style={styles.hint}>
          Each scope has its own primary model and fallback hierarchy.
        </Text>

        {SCOPES.map((scope) => {
          const scopeConfig = config[scope];
          return (
            <View key={scope} style={styles.scopeSection}>
              <Text style={styles.scopeTitle}>{scope.toUpperCase()}</Text>

              <View style={styles.providerRow}>
                {PROVIDERS.map((p) => (
                  <Pressable
                    key={p}
                    style={[
                      styles.providerBtn,
                      scopeConfig.provider === p && styles.providerBtnActive,
                    ]}
                    onPress={() => handleProviderChange(scope, p)}
                  >
                    <Text
                      style={[
                        styles.providerBtnText,
                        scopeConfig.provider === p && styles.providerBtnTextActive,
                      ]}
                    >
                      {PROVIDER_LABELS[p]}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.modelLabel}>
                Model ({PROVIDER_LABELS[scopeConfig.provider]})
              </Text>
              <TextInput
                style={styles.modelInput}
                value={scopeConfig.models[scopeConfig.provider]}
                onChangeText={(text) =>
                  handleModelChange(scope, scopeConfig.provider, text)
                }
                placeholder="model-id"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>Cross-provider fallback</Text>
                <Pressable
                  style={[
                    styles.toggleBtn,
                    scopeConfig.allowCrossProviderFallback && styles.toggleBtnActive,
                  ]}
                  onPress={() =>
                    handleCrossProviderFallbackToggle(
                      scope,
                      !scopeConfig.allowCrossProviderFallback,
                    )
                  }
                >
                  <Text
                    style={[
                      styles.toggleBtnText,
                      scopeConfig.allowCrossProviderFallback && styles.toggleBtnTextActive,
                    ]}
                  >
                    {scopeConfig.allowCrossProviderFallback ? 'ON' : 'OFF'}
                  </Text>
                </Pressable>
              </View>

              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>Free-tier fallback models only</Text>
                <Pressable
                  style={[
                    styles.toggleBtn,
                    scopeConfig.freeTierFallbacksOnly && styles.toggleBtnActive,
                  ]}
                  onPress={() =>
                    handleFreeTierFallbacksOnlyToggle(
                      scope,
                      !scopeConfig.freeTierFallbacksOnly,
                    )
                  }
                >
                  <Text
                    style={[
                      styles.toggleBtnText,
                      scopeConfig.freeTierFallbacksOnly && styles.toggleBtnTextActive,
                    ]}
                  >
                    {scopeConfig.freeTierFallbacksOnly ? 'ON' : 'OFF'}
                  </Text>
                </Pressable>
              </View>

              <Text style={styles.modelLabel}>Fallback hierarchy (OpenRouter)</Text>
              <TextInput
                style={styles.fallbackInput}
                multiline
                value={formatModelListInput(scopeConfig.fallbackModels.openrouter)}
                onChangeText={(text) =>
                  handleFallbackModelsChange(scope, 'openrouter', text)
                }
                placeholder="one model per line"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <Text style={styles.modelLabel}>Fallback hierarchy (SiliconFlow)</Text>
              <TextInput
                style={styles.fallbackInput}
                multiline
                value={formatModelListInput(scopeConfig.fallbackModels.siliconflow)}
                onChangeText={(text) =>
                  handleFallbackModelsChange(scope, 'siliconflow', text)
                }
                placeholder="one model per line"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          );
        })}

        <Text style={styles.sectionTitle}>Embedding</Text>
        <Text style={styles.hint}>
          Used for concept similarity search. Model must output 384-dim vectors.
        </Text>

        <View style={styles.scopeSection}>
          <Text style={styles.scopeTitle}>PROVIDER</Text>
          <View style={styles.providerRow}>
            {PROVIDERS.map((p) => (
              <Pressable
                key={p}
                style={[
                  styles.providerBtn,
                  embedCfg.provider === p && styles.providerBtnActive,
                ]}
                onPress={() => handleEmbedProviderChange(p)}
              >
                <Text
                  style={[
                    styles.providerBtnText,
                    embedCfg.provider === p && styles.providerBtnTextActive,
                  ]}
                >
                  {PROVIDER_LABELS[p]}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.modelLabel}>
            Model ({PROVIDER_LABELS[embedCfg.provider]})
          </Text>
          <TextInput
            style={styles.modelInput}
            value={embedCfg.model}
            onChangeText={handleEmbedModelChange}
            placeholder="model-id"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Pressable
            style={[styles.reEmbedBtn, reEmbedding && styles.reEmbedBtnDisabled]}
            onPress={handleReEmbed}
            disabled={reEmbedding}
          >
            <Text style={styles.reEmbedBtnText}>
              {reEmbedding ? 'Re-embedding...' : 'Re-embed All'}
            </Text>
          </Pressable>
        </View>

        <BackupSection onFlash={flash} />

        <Text style={styles.sectionTitle}>Memory & Review</Text>
        <View style={styles.scopeSection}>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Dot Connector</Text>
            <Pressable
              style={[styles.toggleBtn, dotConnectorSettings.enableDotConnector && styles.toggleBtnActive]}
              onPress={() => {
                updateDotConnectorSettings({ enableDotConnector: !dotConnectorSettings.enableDotConnector });
                flash(`Dot Connector ${dotConnectorSettings.enableDotConnector ? 'off' : 'on'}`);
              }}
            >
              <Text style={[styles.toggleBtnText, dotConnectorSettings.enableDotConnector && styles.toggleBtnTextActive]}>
                {dotConnectorSettings.enableDotConnector ? 'ON' : 'OFF'}
              </Text>
            </Pressable>
          </View>
          <View style={styles.providerRow}>
            {(['conservative', 'standard', 'aggressive'] as const).map((mode) => (
              <Pressable
                key={mode}
                style={[styles.providerBtn, dotConnectorSettings.injectionMode === mode && styles.providerBtnActive]}
                onPress={() => updateDotConnectorSettings({ injectionMode: mode })}
              >
                <Text style={[styles.providerBtnText, dotConnectorSettings.injectionMode === mode && styles.providerBtnTextActive]}>
                  {mode}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Review Mode</Text>
            <Pressable
              style={[styles.toggleBtn, reviewSettings.enableReviewMode && styles.toggleBtnActive]}
              onPress={() => {
                updateReviewSettings({ enableReviewMode: !reviewSettings.enableReviewMode });
                flash(`Review Mode ${reviewSettings.enableReviewMode ? 'off' : 'on'}`);
              }}
            >
              <Text style={[styles.toggleBtnText, reviewSettings.enableReviewMode && styles.toggleBtnTextActive]}>
                {reviewSettings.enableReviewMode ? 'ON' : 'OFF'}
              </Text>
            </Pressable>
          </View>
          <Text style={styles.modelLabel}>Show concepts with strength below</Text>
          <TextInput
            style={styles.modelInput}
            value={String(reviewSettings.weakConceptThreshold)}
            onChangeText={(value) => {
              const next = Number(value);
              if (!Number.isNaN(next)) updateReviewSettings({ weakConceptThreshold: Math.max(0, Math.min(1, next)) });
            }}
            keyboardType="decimal-pad"
          />
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Save my reflection notes with each review</Text>
            <Pressable
              style={[styles.toggleBtn, reviewSettings.recordRecallText && styles.toggleBtnActive]}
              onPress={() => updateReviewSettings({ recordRecallText: !reviewSettings.recordRecallText })}
            >
              <Text style={[styles.toggleBtnText, reviewSettings.recordRecallText && styles.toggleBtnTextActive]}>
                {reviewSettings.recordRecallText ? 'ON' : 'OFF'}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  title: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: '700',
  },
  toast: {
    backgroundColor: colors.green,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  toastText: {
    color: colors.background,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  body: {
    flex: 1,
    padding: spacing.lg,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '700',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  label: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  keySection: {
    marginBottom: spacing.md,
  },
  keyRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  keyInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    color: colors.text,
    fontSize: fontSize.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  saveBtnText: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  keySet: {
    color: colors.green,
    fontSize: fontSize.md,
    flex: 1,
  },
  clearBtn: {
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  clearBtnText: {
    color: colors.red,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  hint: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginBottom: spacing.md,
  },
  scopeSection: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  scopeTitle: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  providerRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  providerBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: 6,
    backgroundColor: colors.background,
  },
  providerBtnActive: {
    backgroundColor: 'rgba(96, 139, 219, 0.2)',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  providerBtnText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  providerBtnTextActive: {
    color: colors.primary,
  },
  modelLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginBottom: spacing.xs,
  },
  modelInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    color: colors.text,
    fontSize: fontSize.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontFamily: 'monospace',
  },
  fallbackInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    color: colors.text,
    fontSize: fontSize.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontFamily: 'monospace',
    minHeight: 72,
    textAlignVertical: 'top',
    marginBottom: spacing.sm,
  },
  toggleRow: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  toggleLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    flex: 1,
  },
  toggleBtn: {
    minWidth: 54,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center',
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm,
  },
  toggleBtnActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(96, 139, 219, 0.2)',
  },
  toggleBtnText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  toggleBtnTextActive: {
    color: colors.primary,
  },
  reEmbedBtn: {
    marginTop: spacing.md,
    backgroundColor: colors.surfaceLight,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reEmbedBtnDisabled: {
    opacity: 0.5,
  },
  reEmbedBtnText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
});
