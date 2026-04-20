import type { ChatModelOverride, ChatScope, Provider } from '../domain/types';
import type { AiCompleteInput } from '../ports/ai-client';
import {
  buildCompletionAttempts,
  buildCompletionRouting,
  isRetriableCompletionError,
  shouldTryNextAttempt,
} from './fallback';
import { getScopeConfig } from './scopes';

interface QueueItem {
  scope: ChatScope;
  messages: AiCompleteInput['messages'];
  signal?: AbortSignal | undefined;
  routingOverride?: ChatModelOverride | undefined;
  resolve: (value: string) => void;
  reject: (error: Error) => void;
}

interface EnqueueOptions {
  routingOverride?: ChatModelOverride | undefined;
}

const COOLDOWNS: Record<Provider, number> = {
  openrouter: 1100,
  siliconflow: 1500,
};

const MAX_RETRIES_PER_ATTEMPT = 2;

let queue: QueueItem[] = [];
let processing = false;
let lastCallTime: Record<Provider, number> = {
  openrouter: 0,
  siliconflow: 0,
};

let completeImpl: ((input: AiCompleteInput) => Promise<string>) | null = null;

export function setCompleteImpl(fn: (input: AiCompleteInput) => Promise<string>): void {
  completeImpl = fn;
}

export function enqueue(
  scope: ChatScope,
  messages: AiCompleteInput['messages'],
  signal?: AbortSignal,
  options?: EnqueueOptions,
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    queue.push({
      scope,
      messages,
      signal,
      routingOverride: options?.routingOverride,
      resolve,
      reject,
    });
    processQueue();
  });
}

async function processQueue(): Promise<void> {
  if (processing || queue.length === 0) return;
  processing = true;

  while (queue.length > 0) {
    const item = queue.shift()!;

    if (item.signal?.aborted) {
      item.reject(new Error('Aborted'));
      continue;
    }

    try {
      const result = await executeWithFallbacks(item);
      item.resolve(result);
    } catch (e) {
      item.reject(e instanceof Error ? e : new Error(String(e)));
    }
  }

  processing = false;
}

async function executeWithFallbacks(item: QueueItem): Promise<string> {
  if (!completeImpl) throw new Error('AI client not initialized - set API key in settings');

  const scopeConfig = getScopeConfig(item.scope);
  const routing = buildCompletionRouting(scopeConfig, item.routingOverride);
  const attempts = buildCompletionAttempts(routing);
  if (attempts.length === 0) {
    throw new Error('No chat model attempts configured. Check settings model hierarchy.');
  }

  let lastError: Error | null = null;

  for (const attempt of attempts) {
    let attemptError: Error | null = null;

    for (let retry = 0; retry < MAX_RETRIES_PER_ATTEMPT; retry++) {
      await waitForProviderCooldown(attempt.provider);
      if (item.signal?.aborted) throw new Error('Aborted');

      try {
        lastCallTime[attempt.provider] = Date.now();
        return await completeImpl({
          messages: item.messages,
          model: attempt.model,
          provider: attempt.provider,
          signal: item.signal,
        });
      } catch (e) {
        attemptError = e instanceof Error ? e : new Error(String(e));

        if (isRetriableCompletionError(attemptError) && retry < MAX_RETRIES_PER_ATTEMPT - 1) {
          const backoff = Math.min(1000 * Math.pow(2, retry), 5000);
          await sleep(backoff);
          continue;
        }

        break;
      }
    }

    if (!attemptError) continue;
    lastError = attemptError;

    if (!shouldTryNextAttempt(attemptError)) {
      throw attemptError;
    }
  }

  throw lastError ?? new Error('Chat completion failed');
}

async function waitForProviderCooldown(provider: Provider): Promise<void> {
  const cooldown = COOLDOWNS[provider];
  const elapsed = Date.now() - lastCallTime[provider];
  if (elapsed < cooldown) {
    await sleep(cooldown - elapsed);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getQueueLength(): number {
  return queue.length;
}

export function clearQueue(): void {
  const items = queue.splice(0);
  for (const item of items) {
    item.reject(new Error('Queue cleared'));
  }
}
