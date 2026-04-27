import { afterEach, describe, expect, it, vi } from 'vitest';
import { makeGoogleClient } from '../google-client';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('makeGoogleClient', () => {
  it('uses the Gemini OpenAI-compatible chat completions endpoint and trims the key', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ choices: [{ message: { content: 'pong' } }] }),
        { status: 200 },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const client = makeGoogleClient(async () => '  test-key  ');
    const result = await client.complete({
      provider: 'google',
      model: 'gemini-2.5-flash',
      messages: [{ role: 'user', content: 'ping' }],
    });

    expect(result).toBe('pong');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-key',
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({
          model: 'gemini-2.5-flash',
          messages: [{ role: 'user', content: 'ping' }],
        }),
      }),
    );
  });

  it('parses embedding vectors from Gemini OpenAI-compatible responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ data: [{ embedding: [0.1, 0.2, 0.3] }] }),
          { status: 200 },
        ),
      ),
    );

    const client = makeGoogleClient(async () => 'test-key');
    const embedding = await client.embed({
      api: 'google',
      model: 'gemini-embedding-001',
      text: 'hello',
    });

    expect(embedding).toHaveLength(3);
    expect(embedding[0]).toBeCloseTo(0.1);
    expect(embedding[1]).toBeCloseTo(0.2);
    expect(embedding[2]).toBeCloseTo(0.3);
  });

  it('throws before calling fetch when the Google key is missing', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const client = makeGoogleClient(async () => null);
    await expect(
      client.complete({
        provider: 'google',
        model: 'gemini-2.5-flash',
        messages: [{ role: 'user', content: 'hello' }],
      }),
    ).rejects.toThrow('Google AI Studio API key not set');

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
