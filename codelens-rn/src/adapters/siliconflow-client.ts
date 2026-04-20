import type { AiClientPort, AiCompleteInput, AiEmbedInput } from '../ports/ai-client';

const BASE_URLS = ['https://api.siliconflow.cn/v1', 'https://api.siliconflow.com/v1'] as const;

async function postWithEndpointFallback(
  path: '/chat/completions' | '/embeddings',
  cleanKey: string,
  payload: Record<string, unknown>,
  signal?: AbortSignal | null,
): Promise<any> {
  let lastError: Error | null = null;

  for (let i = 0; i < BASE_URLS.length; i += 1) {
    const baseUrl = BASE_URLS[i];
    const res = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cleanKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: signal ?? null,
    });

    if (res.ok) {
      return res.json();
    }

    const body = await res.text().catch(() => '');
    const isLastEndpoint = i === BASE_URLS.length - 1;
    const shouldTryNext = res.status === 401 && !isLastEndpoint;

    if (shouldTryNext) {
      continue;
    }

    lastError = new Error(`SiliconFlow ${res.status} (${baseUrl}): ${body}`);
    break;
  }

  if (lastError) throw lastError;
  throw new Error('SiliconFlow request failed');
}

export function makeSiliconflowClient(getApiKey: () => Promise<string | null>): AiClientPort {
  return {
    async complete(input: AiCompleteInput): Promise<string> {
      const apiKey = await getApiKey();
      if (!apiKey) throw new Error('SiliconFlow API key not set');
      const cleanKey = apiKey.trim();

      const data = await postWithEndpointFallback(
        '/chat/completions',
        cleanKey,
        {
          model: input.model,
          messages: input.messages,
        },
        input.signal ?? null,
      );
      const content = data?.choices?.[0]?.message?.content;
      if (typeof content !== 'string') {
        throw new Error('No content in SiliconFlow response');
      }
      return content;
    },

    async embed(input: AiEmbedInput): Promise<Float32Array> {
      const apiKey = await getApiKey();
      if (!apiKey) throw new Error('SiliconFlow API key not set');
      const cleanKey = apiKey.trim();

      const data = await postWithEndpointFallback(
        '/embeddings',
        cleanKey,
        {
          model: input.model,
          input: input.text,
        },
      );
      const vec = data?.data?.[0]?.embedding;
      if (!Array.isArray(vec)) {
        throw new Error('No embedding in SiliconFlow response');
      }
      return new Float32Array(vec);
    },
  };
}
