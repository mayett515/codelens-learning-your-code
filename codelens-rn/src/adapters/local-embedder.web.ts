import type { AiEmbedInput } from '../ports/ai-client';

export const LOCAL_EMBED_MODEL_ID = 'local/all-minilm-l6-v2';

export function isLocalEmbedModel(model: string): boolean {
  return model.trim().toLowerCase() === LOCAL_EMBED_MODEL_ID;
}

export async function getLocalEmbedding(input: AiEmbedInput): Promise<Float32Array> {
  throw new Error(
    `Local embedding model "${input.model}" is not available in Expo web.`,
  );
}

export function resetLocalEmbedderForTests(): void {
  return;
}
