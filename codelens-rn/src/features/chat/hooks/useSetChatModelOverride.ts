import { useMutation, useQueryClient } from '@tanstack/react-query';
import { chatKeys } from '../../../hooks/query-keys';
import { setChatModelOverride } from '../modelCatalog/chatModelRepo';
import type { ChatId } from '../../../domain/types';
import type { ChatModelId } from '../modelCatalog/catalog';

export function useSetChatModelOverride(chatId: ChatId | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (modelId: ChatModelId | null) => {
      if (!chatId) throw new Error('Cannot set model without an active chat');
      await setChatModelOverride(chatId, modelId);
    },
    onSuccess: () => {
      if (!chatId) return;
      queryClient.invalidateQueries({ queryKey: chatKeys.modelOverride(chatId) });
      queryClient.invalidateQueries({ queryKey: chatKeys.detail(chatId) });
      queryClient.invalidateQueries({ queryKey: chatKeys.recent });
    },
  });
}
