import { afterEach, describe, expect, it, vi } from 'vitest';
import { makeSiliconflowClient } from '../siliconflow-client';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('makeSiliconflowClient', () => {
  it('uses the OpenAI-compatible chat completions endpoint and trims the key', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ choices: [{ message: { content: 'pong' } }] }),
        { status: 200 },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const client = makeSiliconflowClient(async () => '  test-key  ');
    const result = await client.complete({
      provider: 'siliconflow',
      model: 'Qwen/Qwen2.5-7B-Instruct',
      messages: [{ role: 'user', content: 'ping' }],
    });

    expect(result).toBe('pong');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.siliconflow.cn/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-key',
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({
          model: 'Qwen/Qwen2.5-7B-Instruct',
          messages: [{ role: 'user', content: 'ping' }],
        }),
      }),
    );
  });

  it('falls back to the .com endpoint when the .cn endpoint rejects the key', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('unauthorized', { status: 401 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ choices: [{ message: { content: 'ok' } }] }),
          { status: 200 },
        ),
      );
    vi.stubGlobal('fetch', fetchMock);

    const client = makeSiliconflowClient(async () => 'test-key');
    await expect(
      client.complete({
        provider: 'siliconflow',
        model: 'Qwen/Qwen2.5-7B-Instruct',
        messages: [{ role: 'user', content: 'hello' }],
      }),
    ).resolves.toBe('ok');

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://api.siliconflow.com/v1/chat/completions',
      expect.any(Object),
    );
  });

  it('parses embedding vectors from SiliconFlow responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ data: [{ embedding: [0.1, 0.2, 0.3] }] }),
          { status: 200 },
        ),
      ),
    );

    const client = makeSiliconflowClient(async () => 'test-key');
    const embedding = await client.embed({
      api: 'siliconflow',
      model: 'BAAI/bge-small-en-v1.5',
      text: 'hello',
    });

    expect(embedding).toHaveLength(3);
    expect(embedding[0]).toBeCloseTo(0.1);
    expect(embedding[1]).toBeCloseTo(0.2);
    expect(embedding[2]).toBeCloseTo(0.3);
  });

  it('throws before calling fetch when the SiliconFlow key is missing', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const client = makeSiliconflowClient(async () => null);
    await expect(
      client.complete({
        provider: 'siliconflow',
        model: 'Qwen/Qwen2.5-7B-Instruct',
        messages: [{ role: 'user', content: 'hello' }],
      }),
    ).rejects.toThrow('SiliconFlow API key not set');

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
