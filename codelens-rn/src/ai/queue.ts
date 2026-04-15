import type { Provider, ChatScope } from '../domain/types';
import type { AiCompleteInput } from '../ports/ai-client';
import { getActiveModel } from './scopes';

interface QueueItem {
  scope: ChatScope;
  messages: AiCompleteInput['messages'];
  signal?: AbortSignal | undefined;
  resolve: (value: string) => void;
  reject: (error: Error) => void;
}

const COOLDOWNS: Record<Provider, number> = {
  openrouter: 1100,
  siliconflow: 1500,
};

const MAX_RETRIES = 3;

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
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    queue.push({ scope, messages, signal, resolve, reject });
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
      const result = await executeWithRetry(item);
      item.resolve(result);
    } catch (e) {
      item.reject(e instanceof Error ? e : new Error(String(e)));
    }
  }

  processing = false;
}

async function executeWithRetry(item: QueueItem): Promise<string> {
  if (!completeImpl) throw new Error('AI client not initialized — set API key in settings');

  const { provider, model } = getActiveModel(item.scope);
  let currentModel = model;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const cooldown = COOLDOWNS[provider];
    const elapsed = Date.now() - lastCallTime[provider];
    if (elapsed < cooldown) {
      await sleep(cooldown - elapsed);
    }

    if (item.signal?.aborted) throw new Error('Aborted');

    try {
      lastCallTime[provider] = Date.now();
      const result = await completeImpl({
        messages: item.messages,
        model: currentModel,
        provider,
        signal: item.signal,
      });
      return result;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));

      if (isModelNotFound(lastError)) {
        const fallback = getFallbackModel(provider);
        if (fallback && fallback !== currentModel) {
          currentModel = fallback;
          continue;
        }
        throw lastError;
      }

      if (isRetriable(lastError) && attempt < MAX_RETRIES - 1) {
        const backoff = Math.min(1000 * Math.pow(2, attempt), 8000);
        await sleep(backoff);
        continue;
      }

      throw lastError;
    }
  }

  throw lastError ?? new Error('Max retries exceeded');
}

function isRetriable(error: Error): boolean {
  const msg = error.message.toLowerCase();
  return msg.includes('429') || msg.includes('rate') ||
    msg.includes('500') || msg.includes('502') ||
    msg.includes('503') || msg.includes('504') ||
    msg.includes('timeout') || msg.includes('network');
}

function isModelNotFound(error: Error): boolean {
  return error.message.includes('404') || error.message.toLowerCase().includes('not found');
}

function getFallbackModel(provider: Provider): string {
  if (provider === 'openrouter') return 'google/gemini-2.0-flash-exp:free';
  if (provider === 'siliconflow') return 'Qwen/Qwen2.5-7B-Instruct';
  return '';
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
