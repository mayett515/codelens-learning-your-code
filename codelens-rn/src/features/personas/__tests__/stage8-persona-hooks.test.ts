import { describe, expect, it, vi } from 'vitest';
import { chatKeys } from '../../../hooks/query-keys';
import { personaKeys } from '../data/queryKeys';
import type { ChatId } from '../../../domain/types';
import type { PersonaId } from '../types/ids';

const invalidateQueries = vi.fn();
const useQuery = vi.fn((options: { queryFn: () => unknown }) => ({
  data: options.queryFn(),
  queryKey: options,
}));
const useMutation = vi.fn((options: unknown) => options);

vi.mock('@tanstack/react-query', () => ({
  useQuery: (options: unknown) => useQuery(options as { queryFn: () => unknown }),
  useMutation: (options: unknown) => useMutation(options),
  useQueryClient: () => ({ invalidateQueries }),
}));

vi.mock('../data/personaRepo', () => ({
  getPersonas: vi.fn(async () => [{ id: 'p_persona123456789012' }]),
  getChatPersonaId: vi.fn(async (chatId: ChatId) =>
    String(chatId).includes('empty') ? null : 'p_persona123456789012',
  ),
  getPersonaById: vi.fn(async (id: PersonaId) => ({ id, name: 'Deep Diver' })),
  setChatPersona: vi.fn(async () => undefined),
}));

import { getChatPersonaId, getPersonaById, getPersonas, setChatPersona } from '../data/personaRepo';
import { useChatPersona } from '../hooks/useChatPersona';
import { usePersonas } from '../hooks/usePersonas';
import { useSetChatPersona } from '../hooks/useSetChatPersona';

describe('Stage 8 persona hooks', () => {
  it('usePersonas wraps getPersonas with a factory-owned query key', async () => {
    const result = usePersonas();

    await expect(result.data).resolves.toEqual([{ id: 'p_persona123456789012' }]);
    expect(getPersonas).toHaveBeenCalled();
    expect(useQuery).toHaveBeenCalledWith(expect.objectContaining({
      queryKey: personaKeys.list(),
    }));
  });

  it('useChatPersona returns null when a chat has no persona id', async () => {
    const result = useChatPersona('empty-chat' as ChatId);

    await expect(result.data).resolves.toBeNull();
    expect(getChatPersonaId).toHaveBeenCalledWith('empty-chat');
    expect(getPersonaById).not.toHaveBeenCalled();
  });

  it('useChatPersona resolves a chat persona when present', async () => {
    const result = useChatPersona('chat-1' as ChatId);

    await expect(result.data).resolves.toEqual({
      id: 'p_persona123456789012',
      name: 'Deep Diver',
    });
  });

  it('useSetChatPersona calls repo and invalidates chat/persona queries', async () => {
    const mutation = useSetChatPersona('chat-2' as ChatId) as unknown as {
      mutationFn: (personaId: PersonaId | null) => Promise<void>;
      onSuccess: () => void;
    };

    await mutation.mutationFn('p_persona123456789012' as PersonaId);
    mutation.onSuccess();

    expect(setChatPersona).toHaveBeenCalledWith('chat-2', 'p_persona123456789012');
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: personaKeys.chat('chat-2') });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: chatKeys.detail('chat-2' as ChatId) });
  });
});
