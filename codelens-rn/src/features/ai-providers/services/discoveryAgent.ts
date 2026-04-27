import { enqueue } from '../../../ai/queue';
import { DiscoveryResultSchema, type DiscoveryResult } from '../domain/types';

const DISCOVERY_SYSTEM_PROMPT = `You are an expert AI integrations engineer with comprehensive knowledge of AI API providers.
Your task is to return the OpenAI-compatible API configuration for the requested provider.

Respond ONLY with a valid JSON object matching this exact schema. No markdown, no extra text, no explanation:
{
  "providerName": "Exact canonical name of the provider",
  "baseUrl": "https://api.example.com/v1",
  "sourceUrl": "https://docs.example.com/api",
  "models": [
    { "id": "model-id-string", "name": "Human readable name", "isFreeTier": false }
  ]
}

Rules:
- baseUrl must be the OpenAI-compatible base path, not the full /chat/completions URL
- Include publicly documented OpenAI-compatible chat models only
- Set isFreeTier: true only for models explicitly offered free by the provider
- If docs mention a full endpoint like /chat/completions, strip that suffix for baseUrl
- Include sourceUrl when source docs were provided
- If the provider is unknown or not OpenAI-compatible, still return your best estimate`;

export async function runProviderDiscovery(
  providerQuery: string,
  docsUrl?: string,
): Promise<DiscoveryResult> {
  try {
    const cleanDocsUrl = docsUrl?.trim();
    const docsSnippet = cleanDocsUrl ? await fetchDocsSnippet(cleanDocsUrl) : '';

    const raw = await enqueue('general', [
      { role: 'system', content: DISCOVERY_SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          `Provide the API configuration for: ${providerQuery}`,
          cleanDocsUrl ? `Source URL: ${cleanDocsUrl}` : '',
          docsSnippet ? `Source docs excerpt:\n${docsSnippet}` : '',
        ].filter(Boolean).join('\n\n'),
      },
    ]);

    let jsonStr = raw.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/^```json\n?/, '');
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```\n?/, '');
    }
    if (jsonStr.endsWith('```')) {
      jsonStr = jsonStr.replace(/\n?```$/, '');
    }

    const parsed = JSON.parse(jsonStr.trim());
    const result = DiscoveryResultSchema.parse(parsed);
    return {
      ...result,
      baseUrl: normalizeOpenAiBaseUrl(result.baseUrl),
      sourceUrl: result.sourceUrl ?? cleanDocsUrl ?? undefined,
    };
  } catch (error) {
    throw new Error(`Failed to discover provider: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function fetchDocsSnippet(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Could not fetch docs ${res.status}`);
  }

  const raw = await res.text();
  return htmlToText(raw).slice(0, 12_000);
}

function htmlToText(raw: string): string {
  return raw
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeOpenAiBaseUrl(url: string): string {
  return url.replace(/\/+$/, '').replace(/\/chat\/completions$/i, '');
}
