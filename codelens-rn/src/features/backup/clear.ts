import { db, getRawDb } from '../../db/client';
import * as schema from '../../db/schema';
import { kv, secureStore, vectorStore } from '../../composition';

export interface ClearOptions {
  /** Default false — API keys are painful to re-enter on mobile. Opt-in to nuke. */
  includeApiKeys?: boolean;
}

/**
 * Fully wipes user data. Used by:
 *  - "Clear all data" settings action (double-confirm)
 *  - importBackup() before restoring a .codelens archive
 *
 * Order of operations matters:
 *  1. vector store (also clears embeddings_meta)
 *  2. Drizzle tables, FK-safe order (children first), inside a transaction
 *  3. concepts_fts — explicitly, in case the AFTER DELETE triggers didn't fire
 *     during a TRUNCATE-style delete
 *  4. MMKV app-owned keys
 *  5. API keys — only on opt-in
 */
export async function clearAllData(options?: ClearOptions): Promise<void> {
  await vectorStore.deleteAll();

  await db.transaction(async (tx) => {
    await tx.delete(schema.chatMessages);
    await tx.delete(schema.chats);
    await tx.delete(schema.conceptLinks);
    await tx.delete(schema.concepts);
    await tx.delete(schema.learningSessions);
    await tx.delete(schema.files);
    await tx.delete(schema.projects);
  });

  // Guard against trigger misfires on bulk deletes.
  try {
    getRawDb().executeSync('DELETE FROM concepts_fts');
  } catch {
    // If the FTS table doesn't exist yet (fresh install before migration 002),
    // this is a safe no-op.
  }

  kv.delete('chat_config');
  kv.delete('embed_config');

  if (options?.includeApiKeys) {
    await secureStore.deleteApiKey('openrouter');
    await secureStore.deleteApiKey('siliconflow');
    await secureStore.deleteApiKey('google');
    await secureStore.deleteApiKey('opencodego');
  }
}
