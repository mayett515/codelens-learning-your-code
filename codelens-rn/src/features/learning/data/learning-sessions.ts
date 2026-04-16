import { eq, desc } from 'drizzle-orm';
import { db } from '../client';
import { learningSessions } from '../schema';
import type {
  LearningSession,
  SessionId,
  ChatId,
  ConceptId,
} from '../../domain/types';

function rowToSession(
  row: typeof learningSessions.$inferSelect,
): LearningSession {
  return {
    id: row.id as SessionId,
    title: row.title,
    source: row.source as LearningSession['source'],
    sourceChatId: row.sourceChatId as ChatId,
    conceptIds: (row.conceptIds ?? []) as ConceptId[],
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
): Promise<void> {
  await db.insert(learningSessions).values({
    id: session.id,
    title: session.title,
    source: session.source,
    sourceChatId: session.sourceChatId,
    conceptIds: session.conceptIds as any,
    createdAt: session.createdAt,
    rawSnippet: session.rawSnippet,
  });
}

export async function deleteSession(id: SessionId): Promise<void> {
  await db.delete(learningSessions).where(eq(learningSessions.id, id));
}
