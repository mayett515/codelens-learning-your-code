import { useState, useEffect } from 'react';
import { getChatByConceptId, insertChat } from '../../../db/queries/chats';
import { useConcept, useRelatedConcepts } from './queries';
import { findOrCreateLearningChat } from './find-or-create-chat';
import type { ChatId, ConceptId, Concept } from '../../../domain/types';
import type { RetrievalResult } from '../application/retrieve';

interface UseLearningChatResult {
  chatId: ChatId | null;
  concept: Concept | undefined;
  related: RetrievalResult[];
}

export function useLearningChat(conceptId: ConceptId): UseLearningChatResult {
  const [chatId, setChatId] = useState<ChatId | null>(null);

  const { data: concept } = useConcept(conceptId);
  const { data: related = [] } = useRelatedConcepts(conceptId, concept);

  useEffect(() => {
    if (!concept) return;
    let cancelled = false;

    findOrCreateLearningChat({
      concept,
      getChatByConceptId,
      insertChat,
    })
      .then((id) => {
        if (!cancelled) setChatId(id);
      })
      .catch((e) => {
        if (!cancelled) console.error('Failed to create learning chat:', e);
      });

    return () => {
      cancelled = true;
    };
  }, [concept]);

  return { chatId, concept, related };
}
