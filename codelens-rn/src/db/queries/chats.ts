import { eq, and, desc } from 'drizzle-orm';
import { db } from '../client';
import { chats, chatMessages } from '../schema';
import type {
  Chat,
  ChatId,
  ChatMessage,
  ChatScope,
  ConceptId,
  FileId,
  FolderId,
  MessageId,
  ProjectId,
} from '../../domain/types';

function rowToChat(
  row: typeof chats.$inferSelect,
  messages: ChatMessage[] = [],
): Chat {
  return {
    id: row.id as ChatId,
    scope: row.scope as ChatScope,
    projectId: (row.projectId as ProjectId) ?? undefined,
    fileId: (row.fileId as FileId) ?? undefined,
    startLine: row.startLine ?? undefined,
    endLine: row.endLine ?? undefined,
    folderId: (row.folderId as FolderId) ?? undefined,
    conceptId: (row.conceptId as ConceptId) ?? undefined,
    title: row.title,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    messages,
  };
}

function rowToMessage(row: typeof chatMessages.$inferSelect): ChatMessage {
  return {
    id: row.id as MessageId,
    role: row.role as ChatMessage['role'],
    content: row.content,
    createdAt: row.createdAt,
  };
}

export async function getChatById(
  id: ChatId,
): Promise<Chat | undefined> {
  const rows = await db.select().from(chats).where(eq(chats.id, id));
  if (!rows[0]) return undefined;

  const msgs = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.chatId, id))
    .orderBy(chatMessages.createdAt);

  return rowToChat(rows[0], msgs.map(rowToMessage));
}

export async function getChatByConceptId(
  cId: ConceptId,
): Promise<Chat | undefined> {
  const rows = await db
    .select()
    .from(chats)
    .where(and(eq(chats.conceptId, cId), eq(chats.scope, 'learning')))
    .orderBy(desc(chats.createdAt))
    .limit(1);
  if (!rows[0]) return undefined;

  const msgs = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.chatId, rows[0].id))
    .orderBy(chatMessages.createdAt);

  return rowToChat(rows[0], msgs.map(rowToMessage));
}

export async function getRecentChats(limit: number = 5): Promise<Chat[]> {
  const rows = await db
    .select()
    .from(chats)
    .orderBy(desc(chats.updatedAt))
    .limit(limit);
  return rows.map((r) => rowToChat(r));
}

export async function getAllChats(): Promise<Chat[]> {
  const rows = await db
    .select()
    .from(chats)
    .orderBy(desc(chats.updatedAt));
  return rows.map((r) => rowToChat(r));
}

export async function insertChat(
  chat: Omit<Chat, 'messages'>,
): Promise<void> {
  await db.insert(chats).values({
    id: chat.id,
    scope: chat.scope,
    projectId: chat.projectId ?? null,
    fileId: chat.fileId ?? null,
    startLine: chat.startLine ?? null,
    endLine: chat.endLine ?? null,
    folderId: chat.folderId ?? null,
    conceptId: chat.conceptId ?? null,
    title: chat.title,
    createdAt: chat.createdAt,
    updatedAt: chat.updatedAt,
  });
}

export async function insertMessage(
  chatId: ChatId,
  message: ChatMessage,
): Promise<void> {
  await db.insert(chatMessages).values({
    id: message.id,
    chatId,
    role: message.role,
    content: message.content,
    createdAt: message.createdAt,
  });

  await db
    .update(chats)
    .set({ updatedAt: new Date().toISOString() })
    .where(eq(chats.id, chatId));
}

export async function deleteMessage(id: MessageId): Promise<void> {
  await db.delete(chatMessages).where(eq(chatMessages.id, id));
}

export async function deleteChat(id: ChatId): Promise<void> {
  await db.delete(chats).where(eq(chats.id, id));
}
