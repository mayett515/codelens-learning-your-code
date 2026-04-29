import {
  CHAT_PROMPT_LAYER_SEPARATOR,
  MINI_CHAT_SYSTEM_PROMPT,
} from '../promptComposition/constants';
import { buildCodeContextLayer } from '../promptComposition/buildCodeContextLayer';
import type { ChatCodeContext } from '../promptComposition/types';

export function buildMiniChatSystemPrompt(lineRef: ChatCodeContext): string {
  return [MINI_CHAT_SYSTEM_PROMPT, buildCodeContextLayer(lineRef)]
    .filter(Boolean)
    .join(CHAT_PROMPT_LAYER_SEPARATOR);
}
