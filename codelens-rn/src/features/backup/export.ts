import JSZip from 'jszip';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { getRawDb } from '../../db/client';
import { kv, secureStore } from '../../composition';
import { APP_VERSION, ARCHIVE_EXT, ARCHIVE_MAGIC, FORMAT_VERSION, SCHEMA_VERSION } from './format';
import { arrayBufferToBase64 } from './codecs';

export interface ExportResult {
  uri: string;          // file:// URI of the written archive
  fileName: string;     // e.g. codelens-backup-2026-04-17.codelens
  sizeBytes: number;
  counts: Record<string, number>;
}

interface TableSpec {
  name: string;
  sql: string;
}

// Read order matches the restore order in import.ts (parents first on write,
// FK-ordered inserts on read — inserts are sequenced by the importer).
const TABLES: TableSpec[] = [
  { name: 'projects',          sql: 'SELECT * FROM projects' },
  { name: 'files',             sql: 'SELECT * FROM files' },
  { name: 'chats',             sql: 'SELECT * FROM chats' },
  { name: 'chat_messages',     sql: 'SELECT * FROM chat_messages' },
  { name: 'learning_sessions', sql: 'SELECT * FROM learning_sessions' },
  { name: 'concept_links',     sql: 'SELECT * FROM concept_links' },
];

interface EmbeddingMetaRow {
  concept_id: string;
  model: string;
  api: string;
  signature: string;
  updated_at: string;
}

interface VecRow {
  concept_id: string;
  embedding: ArrayBuffer | Uint8Array | null;
}

/**
 * Dumps all user data as a .codelens archive (NDJSON + Zip).
 *
 * Layout inside the archive:
 *   metadata.json      — format/schema/app versions, created_at, counts
 *   preferences.json   — app-owned MMKV keys (chat_config, embed_config)
 *   secure_keys.json   — list of provider ids that HAD a key set (no values)
 *   {table}.ndjson     — one JSON object per line
 *   concepts.ndjson    — concepts + embedded base64 vector + meta per row
 *
 * Returns the file URI of the written archive. Caller is responsible for
 * presenting the share sheet (we also attempt Sharing.shareAsync here for
 * convenience when available).
 */
export async function exportBackup(): Promise<ExportResult> {
  const rawDb = getRawDb();
  const zip = new JSZip();

  const counts: Record<string, number> = {};

  // --- 1. Core tables ---
  for (const table of TABLES) {
    const res = await rawDb.execute(table.sql);
    const rows = (res.rows ?? []) as Record<string, unknown>[];
    counts[table.name] = rows.length;
    zip.file(`${table.name}.ndjson`, rowsToNdjson(rows));
  }

  // --- 2. Concepts + embeddings (co-located per-row for portability) ---
  const conceptRes = await rawDb.execute('SELECT * FROM concepts');
  const conceptRows = (conceptRes.rows ?? []) as Record<string, unknown>[];

  const metaRes = await rawDb.execute('SELECT * FROM embeddings_meta');
  const metaRows = (metaRes.rows ?? []) as unknown as EmbeddingMetaRow[];
  const metaById = new Map<string, EmbeddingMetaRow>();
  for (const m of metaRows) metaById.set(m.concept_id, m);

  // Pull vectors separately — vec0 rows are opaque binary blobs.
  const vecRes = await rawDb.execute('SELECT concept_id, embedding FROM embeddings_vec');
  const vecRows = (vecRes.rows ?? []) as unknown as VecRow[];
  const vecById = new Map<string, ArrayBuffer>();
  for (const v of vecRows) {
    if (!v.embedding) continue;
    const buf = toArrayBuffer(v.embedding);
    vecById.set(v.concept_id, buf);
  }

  const conceptLines: string[] = [];
  let vecCount = 0;
  for (const row of conceptRows) {
    const id = row['id'] as string;
    const vec = vecById.get(id);
    const meta = metaById.get(id);
    const enriched: Record<string, unknown> = { ...row };
    if (vec && meta) {
      enriched['embedding'] = {
        vectorBase64: arrayBufferToBase64(vec),
        model: meta.model,
        api: meta.api,
        signature: meta.signature,
        updatedAt: meta.updated_at,
      };
      vecCount++;
    }
    conceptLines.push(JSON.stringify(enriched));
  }
  zip.file('concepts.ndjson', conceptLines.join('\n'));
  counts['concepts'] = conceptRows.length;
  counts['embeddings'] = vecCount;

  // --- 3. MMKV preferences (app-owned keys only) ---
  const preferences: Record<string, unknown> = {};
  const chatConfig = kv.get<unknown>('chat_config');
  const embedConfig = kv.get<unknown>('embed_config');
  if (chatConfig != null) preferences['chat_config'] = chatConfig;
  if (embedConfig != null) preferences['embed_config'] = embedConfig;
  zip.file('preferences.json', JSON.stringify(preferences, null, 2));

  // --- 4. Secure-store: NEVER export actual keys; record which providers
  //     had keys so the importer can prompt the user to re-enter. ---
  const providersWithKeys: string[] = [];
  for (const provider of ['openrouter', 'siliconflow', 'google', 'opencodego']) {
    const k = await secureStore.getApiKey(provider);
    if (k) providersWithKeys.push(provider);
  }
  zip.file(
    'secure_keys.json',
    JSON.stringify({ providers: providersWithKeys }, null, 2),
  );

  // --- 5. Metadata ---
  const metadata = {
    magic: ARCHIVE_MAGIC,
    formatVersion: FORMAT_VERSION,
    schemaVersion: SCHEMA_VERSION,
    appVersion: APP_VERSION,
    createdAt: new Date().toISOString(),
    counts,
  };
  zip.file('metadata.json', JSON.stringify(metadata, null, 2));

  // --- 6. Serialize + write to disk ---
  // Use base64 so we can hand it straight to file.write(base64).
  const archiveBase64 = await zip.generateAsync({
    type: 'base64',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  const datestamp = new Date().toISOString().slice(0, 10);
  const fileName = `codelens-backup-${datestamp}.${ARCHIVE_EXT}`;
  const file = new File(Paths.cache, fileName);
  if (file.exists) file.delete();
  file.create();
  file.write(archiveBase64, { encoding: 'base64' });

  const sizeBytes = file.size ?? 0;

  // Convenience: present the share sheet if available. Non-fatal on failure.
  try {
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(file.uri, {
        mimeType: 'application/zip',
        dialogTitle: 'Save CodeLens backup',
        UTI: 'com.anthropic.codelens.backup',
      });
    }
  } catch {
    // User cancelled or sharing unavailable — the file still exists on disk.
  }

  return { uri: file.uri, fileName, sizeBytes, counts };
}

// ---------------- helpers ----------------

function rowsToNdjson(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  return rows.map((r) => JSON.stringify(r)).join('\n');
}

function toArrayBuffer(blob: ArrayBuffer | Uint8Array): ArrayBuffer {
  if (blob instanceof ArrayBuffer) return blob;
  // Uint8Array — copy out to a standalone ArrayBuffer
  const copy = new ArrayBuffer(blob.byteLength);
  new Uint8Array(copy).set(blob);
  return copy;
}
