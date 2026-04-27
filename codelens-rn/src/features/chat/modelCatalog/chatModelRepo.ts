import { eq } from 'drizzle-orm';
import { db, type DbOrTx } from '../../../db/client';
import { chats } from '../../../db/schema';
import type { ChatId } from '../../../domain/types';
import type { ChatModelId } from './catalog';

export async function setChatModelOverride(
  chatId: ChatId,
  modelId: ChatModelId | null,
  executor: DbOrTx = db,
): Promise<void> {
  await executor
    .update(chats)
    .set({
      modelOverrideId: modelId,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(chats.id, chatId));
}
