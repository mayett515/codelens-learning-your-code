import { makeExpoSecureStore } from './adapters/secure-store-expo';
import { makeMmkvStore } from './adapters/kv-mmkv';
import { makeSqliteVectorStore } from './adapters/sqlite-vector-store';
import { makeOpenRouterClient } from './adapters/openrouter-client';
import { makeSiliconflowClient } from './adapters/siliconflow-client';
import { makeGoogleClient } from './adapters/google-client';
import { makeOpenCodeGoClient } from './adapters/opencodego-client';
import { getLocalEmbedding, isLocalEmbedModel } from './adapters/local-embedder';
import { getRawDb } from './db/client';
import { setCompleteImpl } from './ai/queue';
import { setEmbedImpl } from './ai/embed';
import type { VectorStorePort } from './ports/vector-store';
import type { SecureStorePort } from './ports/secure-store';
import type { KvStorePort } from './ports/kv-store';
import type { AiClientPort, AiCompleteInput, AiEmbedInput } from './ports/ai-client';

export const secureStore: SecureStorePort = makeExpoSecureStore();
export const kv: KvStorePort = makeMmkvStore();
export const vectorStore: VectorStorePort = makeSqliteVectorStore(getRawDb());

export const openRouterClient: AiClientPort = makeOpenRouterClient(
  () => secureStore.getApiKey('openrouter'),
);
export const siliconFlowClient: AiClientPort = makeSiliconflowClient(
  () => secureStore.getApiKey('siliconflow'),
);
export const googleClient: AiClientPort = makeGoogleClient(
  () => secureStore.getApiKey('google'),
);
export const openCodeGoClient: AiClientPort = makeOpenCodeGoClient(
  () => secureStore.getApiKey('opencodego'),
);

const clients: Record<string, AiClientPort> = {
  openrouter: openRouterClient,
  siliconflow: siliconFlowClient,
  google: googleClient,
  opencodego: openCodeGoClient,
};

function routedComplete(input: AiCompleteInput): Promise<string> {
  const client = clients[input.provider];
  if (!client) throw new Error(`Unknown provider: ${input.provider}`);
  return client.complete(input);
}

setCompleteImpl(routedComplete);

function routedEmbed(input: AiEmbedInput): Promise<Float32Array> {
  if (isLocalEmbedModel(input.model)) {
    return getLocalEmbedding(input);
  }

  const client = clients[input.api];
  if (!client) throw new Error(`Unknown provider: ${input.api}`);
  return client.embed(input);
}

setEmbedImpl(routedEmbed);
