import type { ChatConfig, ChatScope, Provider, ScopeModelConfig } from '../domain/types';
import { kv } from '../composition';

const KV_KEY = 'chat_config';

const DEFAULT_CONFIG: ChatConfig = {
  section: {
    provider: 'openrouter',
    models: {
      openrouter: 'google/gemini-2.0-flash-exp:free',
      siliconflow: 'Qwen/Qwen2.5-7B-Instruct',
    },
  },
  general: {
    provider: 'openrouter',
    models: {
      openrouter: 'google/gemini-2.0-flash-exp:free',
      siliconflow: 'Qwen/Qwen2.5-7B-Instruct',
    },
  },
  learning: {
    provider: 'openrouter',
    models: {
      openrouter: 'google/gemini-2.0-flash-exp:free',
      siliconflow: 'Qwen/Qwen2.5-7B-Instruct',
    },
  },
};

export function getChatConfig(): ChatConfig {
  return kv.get<ChatConfig>(KV_KEY) ?? DEFAULT_CONFIG;
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
    models: { ...config[scope].models, [provider]: model },
  };
  kv.set(KV_KEY, config);
}

export function setChatConfig(config: ChatConfig): void {
  kv.set(KV_KEY, config);
}
