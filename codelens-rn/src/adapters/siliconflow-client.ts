import type { AiClientPort, AiCompleteInput, AiEmbedInput } from '../ports/ai-client';

const BASE_URL = 'https://api.siliconflow.cn/v1';

export function makeSiliconflowClient(getApiKey: () => Promise<string | null>): AiClientPort {
  return {
    async complete(input: AiCompleteInput): Promise<string> {
      const apiKey = await getApiKey();
      if (!apiKey) throw new Error('SiliconFlow API key not set');

      const res = await fetch(`${BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: input.model,
          messages: input.messages,
        }),
        signal: input.signal ?? null,
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`SiliconFlow ${res.status}: ${body}`);
      }

      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content;
      if (typeof content !== 'string') {
        throw new Error('No content in SiliconFlow response');
      }
      return content;
    },

    async embed(input: AiEmbedInput): Promise<Float32Array> {
      const apiKey = await getApiKey();
      if (!apiKey) throw new Error('SiliconFlow API key not set');

      const res = await fetch(`${BASE_URL}/embeddings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: input.model,
          input: input.text,
        }),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`SiliconFlow embed ${res.status}: ${body}`);
      }

      const data = await res.json();
      const vec = data?.data?.[0]?.embedding;
      if (!Array.isArray(vec)) {
        throw new Error('No embedding in SiliconFlow response');
      }
      return new Float32Array(vec);
    },
  };
}
