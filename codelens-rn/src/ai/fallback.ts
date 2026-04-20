import type { ChatModelOverride, Provider, ScopeModelConfig } from '../domain/types';

const PROVIDERS: Provider[] = ['openrouter', 'siliconflow'];

export const OPENROUTER_DEFAULT_MODEL = 'google/gemini-2.0-flash-exp:free';
export const SILICONFLOW_DEFAULT_MODEL = 'Qwen/Qwen2.5-7B-Instruct';

export const OPENROUTER_FREE_FALLBACKS: string[] = [
  'meta-llama/llama-3.3-70b-instruct:free',
  'qwen/qwen-2.5-72b-instruct:free',
  'deepseek/deepseek-chat-v3-0324:free',
];

export const SILICONFLOW_FREE_FALLBACKS: string[] = [
  'Qwen/Qwen2.5-14B-Instruct',
  'THUDM/GLM-4-9B-Chat',
  'Qwen/Qwen2.5-7B-Instruct',
];

export interface CompletionAttempt {
  provider: Provider;
  model: string;
}

export interface CompletionRouting {
  provider: Provider;
  model: string;
  models: Record<Provider, string>;
  fallbackModels: Record<Provider, string[]>;
  allowCrossProviderFallback: boolean;
  freeTierFallbacksOnly: boolean;
}

export function defaultFallbackModels(): Record<Provider, string[]> {
  return {
    openrouter: [...OPENROUTER_FREE_FALLBACKS],
    siliconflow: [...SILICONFLOW_FREE_FALLBACKS],
  };
}

export function normalizeModelList(models: readonly string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const model of models) {
    const trimmed = model.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

export function parseModelListInput(input: string): string[] {
  return normalizeModelList(input.split(/[\n,]/g));
}

export function formatModelListInput(models: readonly string[]): string {
  return normalizeModelList(models).join('\n');
}

export function isLikelyFreeTierModel(provider: Provider, model: string): boolean {
  const m = model.trim().toLowerCase();
  if (!m) return false;

  if (provider === 'openrouter') {
    return m.includes(':free') || m.startsWith('openrouter/free');
  }

  // SiliconFlow documents "Pro/*" as paid family naming.
  return !m.startsWith('pro/');
}

export function buildCompletionRouting(
  scopeConfig: ScopeModelConfig,
  override?: ChatModelOverride,
): CompletionRouting {
  const provider = override?.provider ?? scopeConfig.provider;
  const model = (override?.model ?? scopeConfig.models[provider]).trim();

  const fallbackModels = {
    openrouter: normalizeModelList(
      override?.fallbackModels?.openrouter ?? scopeConfig.fallbackModels.openrouter,
    ),
    siliconflow: normalizeModelList(
      override?.fallbackModels?.siliconflow ?? scopeConfig.fallbackModels.siliconflow,
    ),
  };

  const models = {
    openrouter: scopeConfig.models.openrouter.trim(),
    siliconflow: scopeConfig.models.siliconflow.trim(),
  };

  return {
    provider,
    model,
    models,
    fallbackModels,
    allowCrossProviderFallback:
      override?.allowCrossProviderFallback ?? scopeConfig.allowCrossProviderFallback,
    freeTierFallbacksOnly:
      override?.freeTierFallbacksOnly ?? scopeConfig.freeTierFallbacksOnly,
  };
}

export function buildCompletionAttempts(routing: CompletionRouting): CompletionAttempt[] {
  const attempts: CompletionAttempt[] = [];

  pushAttempt(attempts, routing.provider, routing.model);
  pushProviderFallbacks(attempts, routing, routing.provider, true);

  if (routing.allowCrossProviderFallback) {
    for (const provider of PROVIDERS) {
      if (provider === routing.provider) continue;
      const crossPrimary = routing.models[provider];
      if (
        !routing.freeTierFallbacksOnly ||
        isLikelyFreeTierModel(provider, crossPrimary)
      ) {
        pushAttempt(attempts, provider, crossPrimary);
      }
      pushProviderFallbacks(attempts, routing, provider, false);
    }
  }

  return attempts;
}

function pushProviderFallbacks(
  attempts: CompletionAttempt[],
  routing: CompletionRouting,
  provider: Provider,
  includePrimaryProvider: boolean,
): void {
  for (const model of routing.fallbackModels[provider]) {
    if (includePrimaryProvider && model === routing.model) continue;
    if (routing.freeTierFallbacksOnly && !isLikelyFreeTierModel(provider, model)) {
      continue;
    }
    pushAttempt(attempts, provider, model);
  }
}

function pushAttempt(
  attempts: CompletionAttempt[],
  provider: Provider,
  model: string,
): void {
  const trimmed = model.trim();
  if (!trimmed) return;
  if (
    attempts.some(
      (a) => a.provider === provider && a.model.toLowerCase() === trimmed.toLowerCase(),
    )
  ) {
    return;
  }
  attempts.push({ provider, model: trimmed });
}

export function isRetriableCompletionError(error: Error): boolean {
  const msg = error.message.toLowerCase();
  return (
    msg.includes('429') ||
    msg.includes('rate') ||
    msg.includes('500') ||
    msg.includes('502') ||
    msg.includes('503') ||
    msg.includes('504') ||
    msg.includes('timeout') ||
    msg.includes('network')
  );
}

export function shouldTryNextAttempt(error: Error): boolean {
  const msg = error.message.toLowerCase();
  if (msg.includes('aborted')) return false;
  return (
    isRetriableCompletionError(error) ||
    msg.includes('404') ||
    msg.includes('not found') ||
    msg.includes('api key') ||
    msg.includes('unauthorized') ||
    msg.includes('forbidden') ||
    msg.includes('quota') ||
    msg.includes('insufficient')
  );
}
