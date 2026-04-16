import { describe, it, expect, vi } from 'vitest';
import { findOrCreateLearningChat } from '../find-or-create-chat';
import type { ChatId, ConceptId } from '../../../../domain/types';

const CONCEPT = { id: 'concept-1' as ConceptId, name: 'Closures' };

function makeDeps(overrides: Partial<Parameters<typeof findOrCreateLearningChat>[0]> = {}) {
  return {
    concept: CONCEPT,
    getChatByConceptId: vi.fn().mockResolvedValue(undefined),
    insertChat: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('findOrCreateLearningChat', () => {
  it('returns existing chat when found', async () => {
    const deps = makeDeps({
      getChatByConceptId: vi.fn().mockResolvedValue({ id: 'existing' as ChatId }),
    });

    const result = await findOrCreateLearningChat(deps);

    expect(result).toBe('existing');
    expect(deps.insertChat).not.toHaveBeenCalled();
  });

  it('creates new chat when none exists', async () => {
    const deps = makeDeps();

    const result = await findOrCreateLearningChat(deps);

    expect(result).toBeTruthy();
    expect(deps.insertChat).toHaveBeenCalledTimes(1);
    expect(deps.insertChat).toHaveBeenCalledWith(
      expect.objectContaining({ scope: 'learning', conceptId: CONCEPT.id }),
    );
  });

  it('falls back to lookup on UNIQUE constraint error', async () => {
    const getChatByConceptId = vi.fn()
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ id: 'raced' as ChatId });

    const deps = makeDeps({
      getChatByConceptId,
      insertChat: vi.fn().mockRejectedValue(new Error('UNIQUE constraint failed: chats.concept_id')),
    });

    const result = await findOrCreateLearningChat(deps);

    expect(result).toBe('raced');
    expect(getChatByConceptId).toHaveBeenCalledTimes(2);
  });

  it('throws non-unique errors without fallback lookup', async () => {
    const getChatByConceptId = vi.fn().mockResolvedValue(undefined);

    const deps = makeDeps({
      getChatByConceptId,
      insertChat: vi.fn().mockRejectedValue(new Error('I/O error')),
    });

    await expect(findOrCreateLearningChat(deps)).rejects.toThrow('I/O error');
    expect(getChatByConceptId).toHaveBeenCalledTimes(1);
  });
});
