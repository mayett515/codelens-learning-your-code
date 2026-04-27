import { afterEach, describe, expect, it, vi } from 'vitest';
import { testDiscoveredProvider } from '../providerSmokeTest';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('testDiscoveredProvider', () => {
  it('calls the discovered OpenAI-compatible chat completions endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ choices: [{ message: { content: 'ok' } }] }),
        { status: 200 },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await testDiscoveredProvider(
      {
        providerName: 'Example',
        baseUrl: 'https://api.example.com/v1/',
        models: [{ id: 'example-chat', isFreeTier: false }],
      },
      '  test-key  ',
    );

    expect(result).toEqual({ model: 'example-chat', content: 'ok' });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-key',
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({
          model: 'example-chat',
          messages: [{ role: 'user', content: 'Reply with exactly: ok' }],
        }),
      }),
    );
  });

  it('throws before fetch when the new provider key is empty', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      testDiscoveredProvider(
        {
          providerName: 'Example',
          baseUrl: 'https://api.example.com/v1',
          models: [{ id: 'example-chat', isFreeTier: false }],
        },
        '  ',
      ),
    ).rejects.toThrow('API key is required');

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
