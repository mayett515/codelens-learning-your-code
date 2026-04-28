import { useQuery } from '@tanstack/react-query';
import { getChatById } from '../../../db/queries/chats';
import { chatKeys } from '../../../hooks/query-keys';
import { getChatModelById } from '../modelCatalog/catalog';
import type { ChatId } from '../../../domain/types';
import type { ChatModelOption } from '../modelCatalog/catalog';

export function useChatModelOverride(chatId: ChatId | null | undefined) {
  return useQuery<ChatModelOption | null>({
    queryKey: chatKeys.modelOverride(chatId),
    queryFn: async () => {
      if (!chatId) return null;
      const chat = await getChatById(chatId);
      return getChatModelById(chat?.modelOverrideId ?? null);
    },
    enabled: Boolean(chatId),
  });
}
