import { eq, desc } from 'drizzle-orm';
import { db } from '../../../db/client';
import type { DbOrTx } from '../../../db/client';
import { learningSessions } from '../../../db/schema';
import { parseConceptIds } from './codecs';
import type { LearningSession, SessionId, ChatId } from '../../../domain/types';

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
