import JSZip from 'jszip';
import { File } from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import { db, getRawDb } from '../../db/client';
import * as schema from '../../db/schema';
import { kv, vectorStore } from '../../composition';
import { ARCHIVE_MAGIC, FORMAT_VERSION } from './format';
import { base64ToFloat32 } from './codecs';
import { clearAllData } from './clear';
import type { ConceptId, Provider } from '../../domain/types';

export interface ImportResult {
  imported: Record<string, number>;
  skipped: string[];
  missingKeys: string[];
}

/**
 * Restores from a `.codelens` archive. Strategy: wipe-then-restore.
 *
 * Why not merge? See §5 of PHASE_6/phase_6_by_claude.md — conflict resolution
 * on concept merges is its own project and 99% of restore flows want a 1:1 clone.
 *
 * If `sourceUri` is omitted, opens the system document picker.
 */
export async function importBackup(sourceUri?: string): Promise<ImportResult> {
  // --- 1. Pick file if not provided ---
  let uri = sourceUri;
  if (!uri) {
    const pick = await DocumentPicker.getDocumentAsync({
      type: ['application/zip', 'application/octet-stream', '*/*'],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (pick.canceled || pick.assets.length === 0) {
      throw new Error('Import cancelled');
    }
    uri = pick.assets[0]!.uri;
  }

  // --- 2. Read archive into memory as base64 ---
  const file = new File(uri);
  if (!file.exists) throw new Error('Backup file not found');
  const b64 = await file.base64();

  const zip = await JSZip.loadAsync(b64, { base64: true });

  // --- 3. Validate metadata ---
  const metaRaw = await zip.file('metadata.json')?.async('string');
  if (!metaRaw) throw new Error('Invalid backup: metadata.json missing');
  const meta = JSON.parse(metaRaw) as {
    magic?: string;
    formatVersion: number;
    schemaVersion: number;
    appVersion?: string;
  };
  if (meta.magic !== ARCHIVE_MAGIC) {
    throw new Error('This file is not a CodeLens backup.');
  }
  if (meta.formatVersion > FORMAT_VERSION) {
    throw new Error(
      `Backup format v${meta.formatVersion} is newer than this app (v${FORMAT_VERSION}). Update the app and try again.`,
    );
  }

  // --- 4. Read every ndjson payload BEFORE we wipe — if one is corrupt,
  //        we don't want to have already destroyed the current data. ---
  const projects     = await readNdjson<Record<string, unknown>>(zip, 'projects');
  const files        = await readNdjson<Record<string, unknown>>(zip, 'files');
  const chats        = await readNdjson<Record<string, unknown>>(zip, 'chats');
  const messages     = await readNdjson<Record<string, unknown>>(zip, 'chat_messages');
  const sessions     = await readNdjson<Record<string, unknown>>(zip, 'learning_sessions');
  const concepts     = await readNdjson<ConceptExport>(zip, 'concepts');
  const links        = await readNdjson<Record<string, unknown>>(zip, 'concept_links');

  let preferences: Record<string, unknown> = {};
  try {
    const prefsRaw = await zip.file('preferences.json')?.async('string');
    if (prefsRaw) preferences = JSON.parse(prefsRaw);
  } catch { /* non-fatal */ }

  let missingKeys: string[] = [];
  try {
    const keysRaw = await zip.file('secure_keys.json')?.async('string');
    if (keysRaw) missingKeys = (JSON.parse(keysRaw).providers as string[]) ?? [];
  } catch { /* non-fatal */ }

  // --- 5. Wipe current state. Keep API keys by default (user can always
  //        re-import, and they're a pain to re-enter on mobile). ---
  await clearAllData();

  const imported: Record<string, number> = {};
  const skipped: string[] = [];

  // --- 6. Restore row data in a single transaction for atomicity.
  //        Vectors go after the tx because sqlite-vec virtual tables
  //        don't always participate cleanly in rollback. ---
  await db.transaction(async (tx) => {
    if (projects.length) await insertBatch(tx, schema.projects, projects);
    if (files.length)    await insertBatch(tx, schema.files, files);
    if (chats.length)    await insertBatch(tx, schema.chats, chats);
    if (messages.length) await insertBatch(tx, schema.chatMessages, messages);
    if (sessions.length) await insertBatch(tx, schema.learningSessions, sessions);

    // Strip the embedding before inserting the concept row — it goes into
    // the vector store separately below.
    const conceptRows = concepts.map((c) => {
      const { embedding, ...row } = c;
      void embedding;
      return row;
    });
    if (conceptRows.length) await insertBatch(tx, schema.concepts, conceptRows);
    if (links.length)    await insertBatch(tx, schema.conceptLinks, links);
  });

  imported['projects']          = projects.length;
  imported['files']             = files.length;
  imported['chats']             = chats.length;
  imported['chat_messages']     = messages.length;
  imported['learning_sessions'] = sessions.length;
  imported['concepts']          = concepts.length;
  imported['concept_links']     = links.length;

  // --- 7. Vectors (post-transaction). Per-concept failures do not abort. ---
  let vecRestored = 0;
  let vecFailed = 0;
  for (const c of concepts) {
    if (!c.embedding) continue;
    try {
      const f32 = base64ToFloat32(c.embedding.vectorBase64);
      await vectorStore.upsert({
        id: c['id'] as ConceptId,
        vector: f32,
        model: c.embedding.model,
        api: c.embedding.api as Provider,
        signature: c.embedding.signature,
        updatedAt: c.embedding.updatedAt,
      });
      vecRestored++;
    } catch {
      vecFailed++;
    }
  }
  imported['embeddings'] = vecRestored;
  if (vecFailed > 0) skipped.push(`${vecFailed} embedding(s) failed to restore`);

  // --- 8. Preferences ---
  try {
    if (preferences['chat_config']) kv.set('chat_config', preferences['chat_config']);
    if (preferences['embed_config']) kv.set('embed_config', preferences['embed_config']);
  } catch {
    skipped.push('preferences');
  }

  // --- 9. FTS5 is already in sync via triggers from the concept INSERTs;
  //        as a belt-and-braces step, verify the row count matches so we
  //        catch a trigger misfire early. ---
  try {
    const ftsCheck = getRawDb().executeSync('SELECT COUNT(*) AS n FROM concepts_fts');
    const ftsCount = (ftsCheck.rows?.[0] as { n?: number })?.n ?? 0;
    if (ftsCount !== concepts.length) {
      // Repair: rebuild from base table.
      getRawDb().executeSync('DELETE FROM concepts_fts');
      getRawDb().executeSync(
        'INSERT INTO concepts_fts(id, name, summary) SELECT id, name, summary FROM concepts',
      );
    }
  } catch {
    skipped.push('fts-sync-check');
  }

  return { imported, skipped, missingKeys };
}

// ---------------- helpers ----------------

interface ConceptExport extends Record<string, unknown> {
  embedding?: {
    vectorBase64: string;
    model: string;
    api: string;
    signature: string;
    updatedAt: string;
  };
}

async function readNdjson<T>(zip: JSZip, name: string): Promise<T[]> {
  const raw = await zip.file(`${name}.ndjson`)?.async('string');
  if (!raw) return [];
  return raw
    .split('\n')
    .filter((l) => l.trim().length > 0)
    .map((l) => JSON.parse(l) as T);
}

async function insertBatch<T extends Record<string, unknown>>(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  table: Parameters<typeof db.insert>[0],
  rows: T[],
): Promise<void> {
  const CHUNK = 100;
  for (let i = 0; i < rows.length; i += CHUNK) {
    // op-sqlite has a per-statement size ceiling; chunked inserts stay well
    // under the limit while remaining fast.
    await tx.insert(table).values(rows.slice(i, i + CHUNK) as never);
  }
}
