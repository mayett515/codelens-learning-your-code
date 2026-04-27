import type { Provider } from '../domain/types';
import type { AiEmbedInput } from '../ports/ai-client';

interface EmbedQueueItem {
  text: string;
  provider: Provider;
  model: string;
  resolve: (value: Float32Array) => void;
  reject: (error: Error) => void;
}

const COOLDOWNS: Record<Provider, number> = {
  openrouter: 1100,
  siliconflow: 1500,
  google: 1100,
  opencodego: 1100,
};

const MAX_RETRIES = 3;

let queue: EmbedQueueItem[] = [];
let processing = false;
let lastCallTime: Record<Provider, number> = {
  openrouter: 0,
  siliconflow: 0,
  google: 0,
  opencodego: 0,
};

let embedImpl: ((input: AiEmbedInput) => Promise<Float32Array>) | null = null;

export function setEmbedImpl(fn: (input: AiEmbedInput) => Promise<Float32Array>): void {
  embedImpl = fn;
}

export function enqueueEmbed(
  text: string,
  provider: Provider,
  model: string,
): Promise<Float32Array> {
  return new Promise<Float32Array>((resolve, reject) => {
    queue.push({ text, provider, model, resolve, reject });
    processQueue();
  });
}

async function processQueue(): Promise<void> {
  if (processing || queue.length === 0) return;
  processing = true;

  while (queue.length > 0) {
    const item = queue.shift()!;
    try {
      const result = await executeWithRetry(item);
      item.resolve(result);
    } catch (e) {
      item.reject(e instanceof Error ? e : new Error(String(e)));
    }
  }

  processing = false;
}

async function executeWithRetry(item: EmbedQueueItem): Promise<Float32Array> {
  if (!embedImpl) throw new Error('Embed client not initialized — set API key in settings');

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const cooldown = COOLDOWNS[item.provider];
    const elapsed = Date.now() - lastCallTime[item.provider];
    if (elapsed < cooldown) {
      await sleep(cooldown - elapsed);
    }

    try {
      lastCallTime[item.provider] = Date.now();
      const result = await embedImpl({
        text: item.text,
        model: item.model,
        api: item.provider,
      });
      return result;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));

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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getEmbedQueueLength(): number {
  return queue.length;
}

export function clearEmbedQueue(): void {
  const items = queue.splice(0);
  for (const item of items) {
    item.reject(new Error('Queue cleared'));
  }
}
