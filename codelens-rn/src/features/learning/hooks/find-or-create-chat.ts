import { chatId as makeChatId } from '../../../domain/types';
import { uid } from '../../../lib/uid';
import type { ChatId, ConceptId } from '../../../domain/types';

export interface FindOrCreateDeps {
  concept: { id: ConceptId; name: string };
  getChatByConceptId: (id: ConceptId) => Promise<{ id: ChatId } | undefined>;
  insertChat: (chat: {
    id: ChatId;
    scope: 'learning';
    conceptId: ConceptId;
    title: string;
    createdAt: string;
    updatedAt: string;
  }) => Promise<void>;
}

export async function findOrCreateLearningChat(deps: FindOrCreateDeps): Promise<ChatId> {
  const existing = await deps.getChatByConceptId(deps.concept.id);
  if (existing) return existing.id;

  const newId = makeChatId(uid());
  const now = new Date().toISOString();
  try {
    await deps.insertChat({
      id: newId,
      scope: 'learning',
      conceptId: deps.concept.id,
      title: `Review: ${deps.concept.name}`,
      createdAt: now,
      updatedAt: now,
    });
    return newId;
  } catch (e) {
    if (e instanceof Error && /UNIQUE constraint/i.test(e.message)) {
      const raced = await deps.getChatByConceptId(deps.concept.id);
      if (raced) return raced.id;
    }
    throw e;
  }
}
