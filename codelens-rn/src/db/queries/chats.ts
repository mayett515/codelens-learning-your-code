import { eq, and, desc } from 'drizzle-orm';
import { db } from '../client';
import { chats, chatMessages } from '../schema';
import type {
  Chat,
  ChatId,
  ChatModelOverride,
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
  const modelOverride = normalizeChatModelOverride(row.modelOverride);

  return {
    id: row.id as ChatId,
    scope: row.scope as ChatScope,
    projectId: (row.projectId as ProjectId) ?? undefined,
    fileId: (row.fileId as FileId) ?? undefined,
    startLine: row.startLine ?? undefined,
    endLine: row.endLine ?? undefined,
    folderId: (row.folderId as FolderId) ?? undefined,
    conceptId: (row.conceptId as ConceptId) ?? undefined,
    personaId: row.personaId ?? undefined,
    modelOverrideId: row.modelOverrideId ?? undefined,
    modelOverride,
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
    personaId: chat.personaId ?? null,
    modelOverrideId: chat.modelOverrideId ?? null,
    modelOverride: chat.modelOverride ?? null,
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

export async function updateChatModelOverride(
  chatId: ChatId,
  modelOverride?: ChatModelOverride,
): Promise<void> {
  await db
    .update(chats)
    .set({
      modelOverride: modelOverride ?? null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(chats.id, chatId));
}

export async function deleteChat(id: ChatId): Promise<void> {
  await db.delete(chats).where(eq(chats.id, id));
}

function normalizeChatModelOverride(raw: unknown): ChatModelOverride | undefined {
  if (!raw || typeof raw !== 'object') return undefined;

  const value = raw as Partial<ChatModelOverride>;
  if (value.provider !== 'openrouter' && value.provider !== 'siliconflow') {
    return undefined;
  }

  const model = value.model?.trim();
  if (!model) return undefined;

  return {
    provider: value.provider,
    model,
    fallbackModels: value.fallbackModels
      ? {
          openrouter: normalizeModelList(value.fallbackModels.openrouter),
          siliconflow: normalizeModelList(value.fallbackModels.siliconflow),
        }
      : undefined,
    allowCrossProviderFallback:
      typeof value.allowCrossProviderFallback === 'boolean'
        ? value.allowCrossProviderFallback
        : undefined,
    freeTierFallbacksOnly:
      typeof value.freeTierFallbacksOnly === 'boolean'
        ? value.freeTierFallbacksOnly
        : undefined,
  };
}

function normalizeModelList(models: unknown): string[] {
  if (!Array.isArray(models)) return [];
  const seen = new Set<string>();
  const out: string[] = [];

  for (const model of models) {
    if (typeof model !== 'string') continue;
    const trimmed = model.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }

  return out;
}
