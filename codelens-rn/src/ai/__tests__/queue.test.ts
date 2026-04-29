import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearQueue, enqueue, setCompleteImpl } from '../queue';

vi.mock('../scopes', () => ({
  getScopeConfig: () => ({
    provider: 'openrouter',
    models: {
      openrouter: 'openrouter/test-model',
      siliconflow: 'siliconflow/test-model',
    },
    fallbackModels: {
      openrouter: [],
      siliconflow: [],
    },
    allowCrossProviderFallback: false,
    freeTierFallbacksOnly: false,
  }),
}));

afterEach(() => {
  clearQueue();
  vi.useRealTimers();
});

describe('AI queue cancellation', () => {
  it('aborts while waiting for provider cooldown without advancing the cooldown timer', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(10_000);
    const complete = vi.fn(async () => 'ok');
    setCompleteImpl(complete);

    await enqueue('general', []);

    const controller = new AbortController();
    const pending = enqueue('general', [], controller.signal);
    controller.abort();

    await expect(pending).rejects.toThrow(/aborted/i);
    expect(complete).toHaveBeenCalledTimes(1);
  });

  it('aborts retry backoff and surfaces abort instead of the retriable provider error', async () => {
    const controller = new AbortController();
    const complete = vi.fn(async () => {
      controller.abort();
      throw new Error('500 network');
    });
    setCompleteImpl(complete);

    await expect(enqueue('general', [], controller.signal)).rejects.toThrow(/aborted/i);
    expect(complete).toHaveBeenCalledTimes(1);
  });
});
