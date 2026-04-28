import { useQuery } from '@tanstack/react-query';
import { getChatPersonaId, getPersonaById } from '../data/personaRepo';
import { personaKeys } from '../data/queryKeys';
import type { ChatId } from '../../../domain/types';
import type { Persona } from '../types/persona';

export function useChatPersona(chatId: ChatId | null | undefined) {
  return useQuery<Persona | null>({
    queryKey: personaKeys.chat(chatId ?? 'none'),
    queryFn: async () => {
      if (!chatId) return null;
      const personaId = await getChatPersonaId(chatId);
      if (!personaId) return null;
      return (await getPersonaById(personaId)) ?? null;
    },
    enabled: Boolean(chatId),
  });
}
