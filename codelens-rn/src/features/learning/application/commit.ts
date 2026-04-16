import type { ChatId, ConceptId, SessionId } from '../../../domain/types';
import { conceptId, sessionId } from '../../../domain/types';
import type { ExtractedConcept } from './extract';
import { insertSession } from '../data/learning-sessions';
import { insertConcept, updateConcept, getConceptById } from '../data/concepts';
import { ensureEmbedded } from './sync';
import { db } from '../../../db/client';
import { uid } from '../../../lib/uid';

interface CommitInput {
  sourceChatId: ChatId;
  snippet: string;
  title: string;
  newConcepts: ExtractedConcept[];
  mergedConceptIds: ConceptId[];
}

export async function commitLearningSession(input: CommitInput): Promise<SessionId> {
  const sId = sessionId(uid());
  const now = new Date().toISOString();
  const allConceptIds: ConceptId[] = [];

  await db.transaction(async (tx) => {
    for (const extracted of input.newConcepts) {
      const cId = conceptId(uid());
      allConceptIds.push(cId);

      await insertConcept(
        {
          id: cId,
          name: extracted.name,
          summary: extracted.summary,
          taxonomy: extracted.taxonomy,
          sessionIds: [sId],
          strength: 0.5,
          createdAt: now,
          updatedAt: now,
        },
        tx,
      );
    }

    const uniqueMergedIds = [...new Set(input.mergedConceptIds)];
    for (const mergedId of uniqueMergedIds) {
      allConceptIds.push(mergedId);
      const existing = await getConceptById(mergedId, tx);
      if (!existing) continue;

      await updateConcept(
        mergedId,
        {
          strength: Math.min(existing.strength + 0.1, 1),
          sessionIds: [...existing.sessionIds, sId],
          updatedAt: now,
        },
        tx,
      );
    }

    await insertSession(
      {
        id: sId,
        title: input.title,
        source: 'bubble',
        sourceChatId: input.sourceChatId,
        conceptIds: allConceptIds,
        createdAt: now,
        rawSnippet: input.snippet,
      },
      tx,
    );
  });

  for (const cId of allConceptIds) {
    ensureEmbedded(cId).catch(() => undefined);
  }

  return sId;
}
