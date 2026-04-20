import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getLocalEmbedding,
  isLocalEmbedModel,
  LOCAL_EMBED_MODEL_ID,
  resetLocalEmbedderForTests,
} from '../local-embedder';

const { forwardMock, fromModelNameMock } = vi.hoisted(() => ({
  forwardMock: vi.fn(),
  fromModelNameMock: vi.fn(),
}));

vi.mock('react-native-executorch', () => ({
  ALL_MINILM_L6_V2: {
    modelName: 'all-minilm-l6-v2',
    modelSource: 'mock://model',
    tokenizerSource: 'mock://tokenizer',
  },
  TextEmbeddingsModule: {
    fromModelName: fromModelNameMock,
  },
}));

describe('local-embedder', () => {
  beforeEach(() => {
    resetLocalEmbedderForTests();
    vi.clearAllMocks();
    fromModelNameMock.mockResolvedValue({
      forward: forwardMock,
    });
  });

  it('returns a 384-dim Float32Array for the explicit local model id', async () => {
    forwardMock.mockResolvedValue(new Float32Array(384).fill(0.125));

    const result = await getLocalEmbedding({
      text: 'hello local world',
      api: 'siliconflow',
      model: LOCAL_EMBED_MODEL_ID,
    });

    expect(result).toBeInstanceOf(Float32Array);
    expect(result.length).toBe(384);
    expect(fromModelNameMock).toHaveBeenCalledTimes(1);
    expect(fromModelNameMock).toHaveBeenCalledWith(
      expect.objectContaining({ modelName: 'all-minilm-l6-v2' }),
    );
    expect(forwardMock).toHaveBeenCalledWith('hello local world');
  });

  it('throws for non-local model ids', async () => {
    await expect(
      getLocalEmbedding({
        text: 'hello',
        api: 'siliconflow',
        model: 'BAAI/bge-small-en-v1.5',
      }),
    ).rejects.toThrow(`Local embedder requires model "${LOCAL_EMBED_MODEL_ID}"`);
  });

  it('propagates model load failure instead of returning zero vectors', async () => {
    fromModelNameMock.mockRejectedValueOnce(new Error('native load failed'));

    await expect(
      getLocalEmbedding({
        text: 'hello',
        api: 'siliconflow',
        model: LOCAL_EMBED_MODEL_ID,
      }),
    ).rejects.toThrow('Failed to initialize local embedding model');
  });

  it('rejects unexpected embedding dimensions', async () => {
    forwardMock.mockResolvedValue(new Float32Array(32));

    await expect(
      getLocalEmbedding({
        text: 'hello',
        api: 'siliconflow',
        model: LOCAL_EMBED_MODEL_ID,
      }),
    ).rejects.toThrow('Local embedding dimension mismatch');
  });

  it('matches local model id predicate semantics', () => {
    expect(isLocalEmbedModel(LOCAL_EMBED_MODEL_ID)).toBe(true);
    expect(isLocalEmbedModel('local/other-model')).toBe(false);
    expect(isLocalEmbedModel('BAAI/bge-small-en-v1.5')).toBe(false);
  });
});
