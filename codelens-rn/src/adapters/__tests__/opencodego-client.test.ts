import { afterEach, describe, expect, it, vi } from 'vitest';
import { makeOpenCodeGoClient } from '../opencodego-client';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('makeOpenCodeGoClient', () => {
  it('uses the OpenCode Go OpenAI-compatible chat completions endpoint and trims the key', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ choices: [{ message: { content: 'pong' } }] }),
        { status: 200 },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const client = makeOpenCodeGoClient(async () => '  test-key  ');
    const result = await client.complete({
      provider: 'opencodego',
      model: 'kimi-k2.5',
      messages: [{ role: 'user', content: 'ping' }],
    });

    expect(result).toBe('pong');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://opencode.ai/zen/go/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-key',
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({
          model: 'kimi-k2.5',
          messages: [{ role: 'user', content: 'ping' }],
        }),
      }),
    );
  });

  it('throws before calling fetch when the OpenCode Go key is missing', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const client = makeOpenCodeGoClient(async () => null);
    await expect(
      client.complete({
        provider: 'opencodego',
        model: 'kimi-k2.5',
        messages: [{ role: 'user', content: 'hello' }],
      }),
    ).rejects.toThrow('OpenCode Go API key not set');

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
