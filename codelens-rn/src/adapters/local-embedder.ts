import { ALL_MINILM_L6_V2, TextEmbeddingsModule } from 'react-native-executorch';
import type { AiEmbedInput } from '../ports/ai-client';

const EXPECTED_EMBED_DIM = 384;
export const LOCAL_EMBED_MODEL_ID = 'local/all-minilm-l6-v2';

let modelPromise: Promise<TextEmbeddingsModule> | null = null;

export function isLocalEmbedModel(model: string): boolean {
  return model.trim().toLowerCase() === LOCAL_EMBED_MODEL_ID;
}

export async function getLocalEmbedding(input: AiEmbedInput): Promise<Float32Array> {
  if (!isLocalEmbedModel(input.model)) {
    throw new Error(
      `Local embedder requires model "${LOCAL_EMBED_MODEL_ID}", received "${input.model}".`,
    );
  }

  const module = await getOrCreateModel();

  let embedding: Float32Array;
  try {
    embedding = await module.forward(input.text);
  } catch (error) {
    throw new Error(`Local embedding inference failed: ${toErrorMessage(error)}`);
  }

  if (!(embedding instanceof Float32Array)) {
    throw new Error('Local embedding inference returned a non-Float32Array result.');
  }

  if (embedding.length !== EXPECTED_EMBED_DIM) {
    throw new Error(
      `Local embedding dimension mismatch: expected ${EXPECTED_EMBED_DIM}, received ${embedding.length}.`,
    );
  }

  return embedding;
}

async function getOrCreateModel(): Promise<TextEmbeddingsModule> {
  if (!modelPromise) {
    modelPromise = TextEmbeddingsModule.fromModelName(ALL_MINILM_L6_V2).catch((error) => {
      modelPromise = null;
      throw new Error(
        `Failed to initialize local embedding model. Ensure ExecuTorch resource fetcher is initialized. Reason: ${toErrorMessage(error)}`,
      );
    });
  }
  return modelPromise;
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

export function resetLocalEmbedderForTests(): void {
  modelPromise = null;
}
