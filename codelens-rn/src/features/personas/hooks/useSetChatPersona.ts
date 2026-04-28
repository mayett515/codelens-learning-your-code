import { useMutation, useQueryClient } from '@tanstack/react-query';
import { chatKeys } from '../../../hooks/query-keys';
import { setChatPersona } from '../data/personaRepo';
import { personaKeys } from '../data/queryKeys';
import type { ChatId } from '../../../domain/types';
import type { PersonaId } from '../types/ids';

export function useSetChatPersona(chatId: ChatId | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (personaId: PersonaId | null) => {
      if (!chatId) throw new Error('Cannot set persona without an active chat');
      await setChatPersona(chatId, personaId);
    },
    onSuccess: () => {
      if (!chatId) return;
      queryClient.invalidateQueries({ queryKey: personaKeys.chat(chatId) });
      queryClient.invalidateQueries({ queryKey: chatKeys.detail(chatId) });
    },
  });
}
