import type { ChatId, ConceptId, SessionId } from '../../../domain/types';
import { conceptId, sessionId } from '../../../domain/types';
import type { ExtractedConcept } from './extract';
import { insertSession } from '../data/learning-sessions';
import { insertConcept, updateConcept, getConceptById } from '../data/concepts';
import { ensureEmbedded } from './sync';
import { getRawDb } from '../../../db/client';
import { uid } from '../../../lib/uid';

interface CommitInput {
  sourceChatId: ChatId;
  snippet: string;
  title: string;
  newConcepts: ExtractedConcept[];
  mergedConceptIds: ConceptId[];
}

export async function commitLearningSession(input: CommitInput): Promise<SessionId> {
  const rawDb = getRawDb();
  const sId = sessionId(uid());
  const now = new Date().toISOString();
  const allConceptIds: ConceptId[] = [];

  await rawDb.execute('BEGIN');
  try {
    for (const extracted of input.newConcepts) {
      const cId = conceptId(uid());
      allConceptIds.push(cId);

      await insertConcept({
        id: cId,
        name: extracted.name,
        summary: extracted.summary,
        taxonomy: extracted.taxonomy,
        sessionIds: [sId],
        strength: 0.5,
        createdAt: now,
        updatedAt: now,
      });
    }

    const uniqueMergedIds = [...new Set(input.mergedConceptIds)];
    for (const mergedId of uniqueMergedIds) {
      allConceptIds.push(mergedId);
      const existing = await getConceptById(mergedId);
      if (!existing) continue;

      await updateConcept(mergedId, {
        strength: Math.min(existing.strength + 0.1, 1),
        sessionIds: [...existing.sessionIds, sId],
        updatedAt: now,
      });
    }

    await insertSession({
      id: sId,
      title: input.title,
      source: 'bubble',
      sourceChatId: input.sourceChatId,
      conceptIds: allConceptIds,
      createdAt: now,
      rawSnippet: input.snippet,
    });

    await rawDb.execute('COMMIT');
  } catch (e) {
    await rawDb.execute('ROLLBACK');
    throw e;
  }

  for (const cId of allConceptIds) {
    ensureEmbedded(cId).catch(() => undefined);
  }

  return sId;
}
