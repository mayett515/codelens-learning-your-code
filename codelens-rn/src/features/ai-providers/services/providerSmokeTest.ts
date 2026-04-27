import type { DiscoveryResult } from '../domain/types';

export interface ProviderSmokeTestResult {
  model: string;
  content: string;
}

export async function testDiscoveredProvider(
  result: DiscoveryResult,
  apiKey: string,
): Promise<ProviderSmokeTestResult> {
  const cleanKey = apiKey.trim();
  if (!cleanKey) throw new Error('API key is required');

  const model = result.models[0]?.id?.trim();
  if (!model) throw new Error('No discovered model available to test');

  const baseUrl = result.baseUrl.replace(/\/+$/, '');
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${cleanKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: 'Reply with exactly: ok' }],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Provider smoke test failed ${res.status}: ${body}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') {
    throw new Error('Provider smoke test returned no assistant content');
  }

  return { model, content };
}
