import { describe, expect, it } from 'vitest';
import {
  buildCompletionAttempts,
  buildCompletionRouting,
  defaultFallbackModels,
  isLikelyFreeTierModel,
} from '../fallback';
import type { ScopeModelConfig } from '../../domain/types';

const BASE_SCOPE: ScopeModelConfig = {
  provider: 'openrouter',
  models: {
    openrouter: 'google/gemini-2.0-flash-exp:free',
    siliconflow: 'tencent/Hunyuan-MT-7B',
    google: 'gemini-2.5-flash',
    opencodego: 'kimi-k2.5',
  },
  fallbackModels: {
    openrouter: ['meta-llama/llama-3.3-70b-instruct:free', 'qwen/qwen-2.5-72b-instruct:free'],
    siliconflow: ['THUDM/GLM-4-9B-Chat'],
    google: ['gemini-2.5-flash-lite'],
    opencodego: ['glm-5'],
  },
  allowCrossProviderFallback: true,
  freeTierFallbacksOnly: true,
};

describe('fallback routing', () => {
  it('builds same-provider then cross-provider attempt order', () => {
    const attempts = buildCompletionAttempts(buildCompletionRouting(BASE_SCOPE));

    expect(attempts[0]).toEqual({
      provider: 'openrouter',
      model: 'google/gemini-2.0-flash-exp:free',
    });
    expect(attempts[1]).toEqual({
      provider: 'openrouter',
      model: 'meta-llama/llama-3.3-70b-instruct:free',
    });
    expect(attempts[2]).toEqual({
      provider: 'openrouter',
      model: 'qwen/qwen-2.5-72b-instruct:free',
    });
    expect(attempts.some((a) => a.provider === 'siliconflow')).toBe(true);
    expect(attempts.some((a) => a.provider === 'google')).toBe(true);
    expect(attempts.some((a) => a.provider === 'opencodego')).toBe(false);
  });

  it('applies per-chat override provider/model first', () => {
    const attempts = buildCompletionAttempts(
      buildCompletionRouting(BASE_SCOPE, {
        provider: 'siliconflow',
        model: 'Qwen/Qwen2.5-14B-Instruct',
      }),
    );

    expect(attempts[0]).toEqual({
      provider: 'siliconflow',
      model: 'Qwen/Qwen2.5-14B-Instruct',
    });
  });

  it('filters fallback attempts to free-tier models when enabled', () => {
    const attempts = buildCompletionAttempts(
      buildCompletionRouting(
        {
          ...BASE_SCOPE,
          fallbackModels: {
            openrouter: ['openai/gpt-4o-mini', 'meta-llama/llama-3.3-70b-instruct:free'],
            siliconflow: ['Qwen/Qwen2.5-7B-Instruct', 'tencent/Hunyuan-MT-7B'],
            google: ['gemini-2.5-pro', 'gemini-2.5-flash'],
            opencodego: ['kimi-k2.5'],
          },
          allowCrossProviderFallback: true,
          freeTierFallbacksOnly: true,
        },
        {
          provider: 'openrouter',
          model: 'openai/gpt-4o-mini',
        },
      ),
    );

    expect(attempts[0]).toEqual({
      provider: 'openrouter',
      model: 'openai/gpt-4o-mini',
    });
    expect(
      attempts.filter((a) => a.provider === 'openrouter' && a.model === 'openai/gpt-4o-mini')
        .length,
    ).toBe(1);
    expect(
      attempts.some((a) => a.provider === 'siliconflow' && a.model === 'Qwen/Qwen2.5-7B-Instruct'),
    ).toBe(false);
    expect(
      attempts.some((a) => a.provider === 'siliconflow' && a.model === 'tencent/Hunyuan-MT-7B'),
    ).toBe(true);
    expect(
      attempts.some((a) => a.provider === 'google' && a.model === 'gemini-2.5-pro'),
    ).toBe(false);
    expect(
      attempts.some((a) => a.provider === 'google' && a.model === 'gemini-2.5-flash'),
    ).toBe(true);
  });

  it('disables cross-provider attempts when toggle is off', () => {
    const attempts = buildCompletionAttempts(
      buildCompletionRouting({
        ...BASE_SCOPE,
        allowCrossProviderFallback: false,
      }),
    );

    expect(attempts.every((a) => a.provider === 'openrouter')).toBe(true);
  });

  it('detects likely free-tier models per provider rules', () => {
    expect(isLikelyFreeTierModel('openrouter', 'meta-llama/llama-3.3-70b-instruct:free')).toBe(true);
    expect(isLikelyFreeTierModel('openrouter', 'openai/gpt-4o-mini')).toBe(false);
    expect(isLikelyFreeTierModel('siliconflow', 'tencent/Hunyuan-MT-7B')).toBe(true);
    expect(isLikelyFreeTierModel('siliconflow', 'Qwen/Qwen2.5-7B-Instruct')).toBe(false);
    expect(isLikelyFreeTierModel('google', 'gemini-2.5-flash')).toBe(true);
    expect(isLikelyFreeTierModel('google', 'gemini-2.5-pro')).toBe(false);
    expect(isLikelyFreeTierModel('opencodego', 'kimi-k2.5')).toBe(false);
  });

  it('keeps paid SiliconFlow models available when free-tier filtering is disabled', () => {
    const attempts = buildCompletionAttempts(
      buildCompletionRouting({
        ...BASE_SCOPE,
        fallbackModels: defaultFallbackModels(),
        freeTierFallbacksOnly: false,
      }),
    );

    expect(
      attempts.some((a) => a.provider === 'siliconflow' && a.model === 'Qwen/Qwen3-32B'),
    ).toBe(true);
    expect(
      attempts.some((a) => a.provider === 'siliconflow' && a.model === 'Qwen/Qwen2.5-7B-Instruct'),
    ).toBe(true);
    expect(
      attempts.some((a) => a.provider === 'google' && a.model === 'gemini-2.5-pro'),
    ).toBe(true);
    expect(
      attempts.some((a) => a.provider === 'opencodego' && a.model === 'glm-5'),
    ).toBe(true);
  });
});
