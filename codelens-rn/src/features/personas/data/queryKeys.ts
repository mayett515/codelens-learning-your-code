import type { PersonaId } from '../types/ids';

export const personaKeys = {
  all: () => ['personas'] as const,
  list: () => [...personaKeys.all(), 'list'] as const,
  byId: (id: PersonaId | null) => [...personaKeys.all(), 'detail', id ?? 'none'] as const,
  chat: (chatId: string) => [...personaKeys.all(), 'chat', chatId] as const,
} as const;
