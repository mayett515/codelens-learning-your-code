import type { Provider } from '../domain/types';

export interface AiCompleteInput {
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  model: string;
  provider: Provider;
  signal?: AbortSignal | undefined;
}

export interface AiEmbedInput {
  text: string;
  model: string;
  api: Provider;
}

export interface AiClientPort {
  complete(input: AiCompleteInput): Promise<string>;
  embed(input: AiEmbedInput): Promise<Float32Array>;
}
