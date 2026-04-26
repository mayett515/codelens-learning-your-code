import { eq, desc } from 'drizzle-orm';
import { db } from '../../../db/client';
import type { DbOrTx } from '../../../db/client';
import { learningSessions } from '../../../db/schema';
import { parseConceptIds } from './codecs';
import { sortSessionsForHub } from './hubOrdering';
import type { ConceptId as LegacyConceptId, LearningSession, SessionId, ChatId } from '../../../domain/types';
import type { ConceptId } from '../types/ids';

function rowToSession(
  row: typeof learningSessions.$inferSelect,
): LearningSession {
  return {
    id: row.id as SessionId,
    title: row.title,
    source: row.source as LearningSession['source'],
    sourceChatId: row.sourceChatId as ChatId,
    conceptIds: parseConceptIds(row.conceptIds),
    createdAt: row.createdAt,
    rawSnippet: row.rawSnippet,
  };
}

export async function getAllSessions(): Promise<LearningSession[]> {
  const rows = await db
    .select()
    .from(learningSessions)
    .orderBy(desc(learningSessions.createdAt));
  return rows.map(rowToSession);
}

export async function getRecentSessions(limit: number): Promise<LearningSession[]> {
  const rows = await db
    .select()
    .from(learningSessions)
    .orderBy(desc(learningSessions.createdAt))
    .limit(limit);
  return sortSessionsForHub(rows.map(rowToSession));
}

export async function ensureLearningSessionForCapture(
  input: {
    sessionId: string;
    sourceChatId: string;
    conceptId: ConceptId | null;
    title: string;
    rawSnippet: string;
    createdAt: number;
  },
  executor: DbOrTx = db,
): Promise<void> {
  const id = input.sessionId as SessionId;
  const rows = await executor.select().from(learningSessions).where(eq(learningSessions.id, id));
  const conceptId = input.conceptId as unknown as LegacyConceptId | null;

  if (rows[0]) {
    if (!conceptId) return;
    const conceptIds = parseConceptIds(rows[0].conceptIds);
    if (conceptIds.includes(conceptId)) return;
    await executor
      .update(learningSessions)
      .set({ conceptIds: [...conceptIds, conceptId] })
      .where(eq(learningSessions.id, id));
    return;
  }

  await executor.insert(learningSessions).values({
    id,
    title: input.title,
    source: 'bubble',
    sourceChatId: input.sourceChatId as ChatId,
    conceptIds: conceptId ? [conceptId] : [],
    createdAt: new Date(input.createdAt).toISOString(),
    rawSnippet: input.rawSnippet,
  });
}

export async function getSessionById(
  id: SessionId,
): Promise<LearningSession | undefined> {
  const rows = await db
    .select()
    .from(learningSessions)
    .where(eq(learningSessions.id, id));
  return rows[0] ? rowToSession(rows[0]) : undefined;
}

export async function insertSession(
  session: LearningSession,
  executor: DbOrTx = db,
): Promise<void> {
  await executor.insert(learningSessions).values({
    id: session.id,
    title: session.title,
    source: session.source,
    sourceChatId: session.sourceChatId,
    conceptIds: session.conceptIds,
    createdAt: session.createdAt,
    rawSnippet: session.rawSnippet,
  });
}

export async function deleteSession(id: SessionId): Promise<void> {
  await db.delete(learningSessions).where(eq(learningSessions.id, id));
}
