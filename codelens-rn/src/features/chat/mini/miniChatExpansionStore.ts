import type { ChatId } from '../../../domain/types';
import type { ChatCodeContext } from '../promptComposition/types';

const expansionContextByChatId = new Map<ChatId, ChatCodeContext>();

export function setMiniChatExpansionContext(chatId: ChatId, codeContext: ChatCodeContext): void {
  expansionContextByChatId.set(chatId, codeContext);
}

export function consumeMiniChatExpansionContext(chatId: ChatId): ChatCodeContext | null {
  const context = expansionContextByChatId.get(chatId) ?? null;
  expansionContextByChatId.delete(chatId);
  return context;
}
