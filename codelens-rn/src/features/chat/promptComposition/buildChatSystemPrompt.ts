import {
  BASE_CHAT_SYSTEM_PROMPT,
  CHAT_PROMPT_LAYER_SEPARATOR,
} from './constants';
import { buildCodeContextLayer } from './buildCodeContextLayer';
import { formatMemoriesForInjection } from '../../learning/retrieval/formatting/formatMemoriesForInjection';
import type { BuildChatSystemPromptInput } from './types';

export function buildChatSystemPrompt(input: BuildChatSystemPromptInput = {}): string {
  const layers = [
    BASE_CHAT_SYSTEM_PROMPT,
    input.persona?.systemPromptLayer.trim() ?? '',
    buildMemoryLayer(input),
    buildCodeContextLayer(input.codeContext),
  ].filter((layer) => layer.length > 0);

  return layers.join(CHAT_PROMPT_LAYER_SEPARATOR);
}

function buildMemoryLayer(input: BuildChatSystemPromptInput): string {
  if (!input.memories || input.memories.length === 0) return '';
  return formatMemoriesForInjection(input.memories, input.memoryInjectionOptions).text.trim();
}
