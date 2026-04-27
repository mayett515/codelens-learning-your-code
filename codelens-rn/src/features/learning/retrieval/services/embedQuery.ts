import { enqueueEmbed } from '../../../../ai/embed';
import { getEmbedConfig } from '../../../../ai/scopes';
import { l2Normalize } from '../../lib/l2';

const EMBED_TIMEOUT_MS = 1500;

export async function embedQuery(query: string): Promise<Float32Array> {
  const config = getEmbedConfig();
  const raw = await withTimeout(
    enqueueEmbed(query, config.provider, config.model),
    EMBED_TIMEOUT_MS,
  );
  return l2Normalize(raw);
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('Embedding query timed out')), ms);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });
}
