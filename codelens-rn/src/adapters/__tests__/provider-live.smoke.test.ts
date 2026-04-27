import { describe, expect, it } from 'vitest';
import { makeGoogleClient } from '../google-client';
import { makeOpenCodeGoClient } from '../opencodego-client';
import { makeOpenRouterClient } from '../openrouter-client';
import { makeSiliconflowClient } from '../siliconflow-client';

const liveIt = process.env.RUN_LIVE_AI_TESTS === '1' ? it : it.skip;

const MESSAGE = [{ role: 'user' as const, content: 'Reply with exactly: ok' }];

describe('live provider smoke tests', () => {
  liveIt('completes through OpenRouter like the app does', async () => {
    const key = process.env.OPENROUTER_API_KEY?.trim() ?? '';
    expect(key).not.toBe('');

    const client = makeOpenRouterClient(async () => key);
    const response = await client.complete({
      provider: 'openrouter',
      model: process.env.OPENROUTER_TEST_MODEL?.trim() || 'meta-llama/llama-3.3-70b-instruct:free',
      messages: MESSAGE,
    });

    expect(response.trim().toLowerCase()).toContain('ok');
  }, 30_000);

  liveIt('completes through SiliconFlow like the app does', async () => {
    const key = process.env.SILICONFLOW_API_KEY?.trim() ?? '';
    expect(key).not.toBe('');

    const client = makeSiliconflowClient(async () => key);
    const response = await client.complete({
      provider: 'siliconflow',
      model: process.env.SILICONFLOW_TEST_MODEL?.trim() || 'Qwen/Qwen2.5-7B-Instruct',
      messages: MESSAGE,
    });

    expect(response.trim().toLowerCase()).toContain('ok');
  }, 30_000);

  liveIt('completes through Google AI Studio like the app does', async () => {
    const key =
      process.env.GOOGLE_AI_STUDIO_API_KEY?.trim() ||
      process.env.GOOGLE_API_KEY?.trim() ||
      '';
    expect(key).not.toBe('');

    const client = makeGoogleClient(async () => key);
    const response = await client.complete({
      provider: 'google',
      model: process.env.GOOGLE_TEST_MODEL?.trim() || 'gemini-2.5-flash',
      messages: MESSAGE,
    });

    expect(response.trim().toLowerCase()).toContain('ok');
  }, 30_000);

  liveIt('completes through OpenCode Go like the app does', async () => {
    const key = process.env.OPENCODE_GO_API_KEY?.trim() ?? '';
    expect(key).not.toBe('');

    const client = makeOpenCodeGoClient(async () => key);
    const response = await client.complete({
      provider: 'opencodego',
      model: process.env.OPENCODE_GO_TEST_MODEL?.trim() || 'kimi-k2.5',
      messages: MESSAGE,
    });

    expect(response.trim().toLowerCase()).toContain('ok');
  }, 30_000);
});
