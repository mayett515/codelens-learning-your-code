import type {
  ChatConfig,
  ChatScope,
  Provider,
  ScopeModelConfig,
} from '../domain/types';
import {
  defaultFallbackModels,
  normalizeModelList,
  OPENROUTER_DEFAULT_MODEL,
  SILICONFLOW_DEFAULT_MODEL,
} from './fallback';
import { makeMmkvStore } from '../adapters/kv-mmkv';

const kv = makeMmkvStore();
const KV_KEY = 'chat_config';

function defaultScopeModelConfig(): ScopeModelConfig {
  return {
    provider: 'openrouter',
    models: {
      openrouter: OPENROUTER_DEFAULT_MODEL,
      siliconflow: SILICONFLOW_DEFAULT_MODEL,
    },
    fallbackModels: defaultFallbackModels(),
    allowCrossProviderFallback: true,
    freeTierFallbacksOnly: true,
  };
}

const DEFAULT_CONFIG: ChatConfig = {
  section: defaultScopeModelConfig(),
  general: defaultScopeModelConfig(),
  learning: defaultScopeModelConfig(),
};

export function getChatConfig(): ChatConfig {
  const raw = kv.get<unknown>(KV_KEY);
  if (!raw || typeof raw !== 'object') return normalizeChatConfig(DEFAULT_CONFIG);
  return normalizeChatConfig(raw as Partial<Record<ChatScope, unknown>>);
}

function normalizeChatConfig(raw: Partial<Record<ChatScope, unknown>>): ChatConfig {
  return {
    section: normalizeScopeConfig(raw.section),
    general: normalizeScopeConfig(raw.general),
    learning: normalizeScopeConfig(raw.learning),
  };
}

function normalizeScopeConfig(raw: unknown): ScopeModelConfig {
  const defaults = defaultScopeModelConfig();
  if (!raw || typeof raw !== 'object') return defaults;

  const value = raw as Partial<ScopeModelConfig>;
  const provider = value.provider === 'siliconflow' ? 'siliconflow' : 'openrouter';

  const openrouterModel = value.models?.openrouter?.trim() || defaults.models.openrouter;
  const siliconflowModel = value.models?.siliconflow?.trim() || defaults.models.siliconflow;

  return {
    provider,
    models: {
      openrouter: openrouterModel,
      siliconflow: siliconflowModel,
    },
    fallbackModels: {
      openrouter: normalizeModelList(
        value.fallbackModels?.openrouter ?? defaults.fallbackModels.openrouter,
      ),
      siliconflow: normalizeModelList(
        value.fallbackModels?.siliconflow ?? defaults.fallbackModels.siliconflow,
      ),
    },
    allowCrossProviderFallback:
      typeof value.allowCrossProviderFallback === 'boolean'
        ? value.allowCrossProviderFallback
        : defaults.allowCrossProviderFallback,
    freeTierFallbacksOnly:
      typeof value.freeTierFallbacksOnly === 'boolean'
        ? value.freeTierFallbacksOnly
        : defaults.freeTierFallbacksOnly,
  };
}

export function getScopeConfig(scope: ChatScope): ScopeModelConfig {
  const config = getChatConfig();
  return config[scope];
}

export function getActiveModel(scope: ChatScope): { provider: Provider; model: string } {
  const scopeConfig = getScopeConfig(scope);
  return {
    provider: scopeConfig.provider,
    model: scopeConfig.models[scopeConfig.provider],
  };
}

export function updateScopeProvider(scope: ChatScope, provider: Provider): void {
  const config = getChatConfig();
  config[scope] = { ...config[scope], provider };
  kv.set(KV_KEY, config);
}

export function updateScopeModel(scope: ChatScope, provider: Provider, model: string): void {
  const config = getChatConfig();
  config[scope] = {
    ...config[scope],
    models: { ...config[scope].models, [provider]: model.trim() },
  };
  kv.set(KV_KEY, config);
}

export function updateScopeFallbackModels(
  scope: ChatScope,
  provider: Provider,
  models: string[],
): void {
  const config = getChatConfig();
  config[scope] = {
    ...config[scope],
    fallbackModels: {
      ...config[scope].fallbackModels,
      [provider]: normalizeModelList(models),
    },
  };
  kv.set(KV_KEY, config);
}

export function updateScopeCrossProviderFallback(scope: ChatScope, enabled: boolean): void {
  const config = getChatConfig();
  config[scope] = { ...config[scope], allowCrossProviderFallback: enabled };
  kv.set(KV_KEY, config);
}

export function updateScopeFreeTierFallbacksOnly(scope: ChatScope, enabled: boolean): void {
  const config = getChatConfig();
  config[scope] = { ...config[scope], freeTierFallbacksOnly: enabled };
  kv.set(KV_KEY, config);
}

export function setChatConfig(config: ChatConfig): void {
  kv.set(KV_KEY, normalizeChatConfig(config));
}

export interface EmbedConfig {
  provider: Provider;
  model: string;
}

const EMBED_KV_KEY = 'embed_config';

const DEFAULT_EMBED_CONFIG: EmbedConfig = {
  provider: 'siliconflow',
  model: 'BAAI/bge-small-en-v1.5',
};

export function getEmbedConfig(): EmbedConfig {
  return kv.get<EmbedConfig>(EMBED_KV_KEY) ?? DEFAULT_EMBED_CONFIG;
}

export function updateEmbedProvider(provider: Provider): void {
  const config = getEmbedConfig();
  kv.set(EMBED_KV_KEY, { ...config, provider });
}

export function updateEmbedModel(model: string): void {
  const config = getEmbedConfig();
  kv.set(EMBED_KV_KEY, { ...config, model });
}
