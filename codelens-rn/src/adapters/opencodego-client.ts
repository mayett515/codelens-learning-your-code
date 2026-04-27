import type { AiClientPort, AiCompleteInput, AiEmbedInput } from '../ports/ai-client';

const BASE_URL = 'https://opencode.ai/zen/go/v1';

export function makeOpenCodeGoClient(getApiKey: () => Promise<string | null>): AiClientPort {
  return {
    async complete(input: AiCompleteInput): Promise<string> {
      const apiKey = await getApiKey();
      if (!apiKey) throw new Error('OpenCode Go API key not set');
      const cleanKey = apiKey.trim();

      const res = await fetch(`${BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cleanKey}`,
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
        throw new Error(`OpenCode Go ${res.status}: ${body}`);
      }

      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content;
      if (typeof content !== 'string') {
        throw new Error('No content in OpenCode Go response');
      }
      return content;
    },

    async embed(_input: AiEmbedInput): Promise<Float32Array> {
      throw new Error('OpenCode Go embeddings are not configured');
    },
  };
}
