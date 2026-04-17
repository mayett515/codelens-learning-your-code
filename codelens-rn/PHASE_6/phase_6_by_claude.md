# Phase 6 — Handoff Document

**Author:** Claude (Opus 4.6) — session ran out mid-work
**For:** Next LLM (Claude / Codex / Gemini) continuing execution
**Date frozen:** 2026-04-16
**Repo:** `C:\CodeLens-v2\codelens-rn`
**Branch:** `main`

---

## 0. What came before this doc

### Phases already complete

- **Phase 1** — Core shell, SQLite + Drizzle, MMKV, Expo Router, theme.
- **Phase 2** — Projects, files, paste/GitHub import, marks/ranges, section chat.
- **Phase 3** — General chat, chat list, recent chats.
- **Phase 4** — Learning system (concept extraction, embeddings, sqlite-vec, merge detection, save-as-learning modal).
- **Phase 5** — Concept library, learning sessions list, learning chat, bubble menu.
- **Phase 6 (partial)** — Architecture consolidation + scaling hardening (see below).

### Already done within Phase 6

1. **Architecture consolidation** (6 PRs merged) — ports/adapters cleanup, composition root, query-keys, domain branded types.
2. **Drizzle transactions** — `commitLearningSession` now uses `db.transaction(async (tx) => …)`; `insertConcept`, `updateConcept`, `insertSession` accept `executor: DbOrTx = db`. See `src/db/client.ts:60-62` for `DbOrTx` type.
3. **Crypto UIDs** — `src/lib/uid.ts` now uses `expo-crypto.randomUUID()` (RFC 4122 v4). Vitest alias maps `expo-crypto` → `node:crypto`.
4. **Hot/Cold vector tier** — FTS5 virtual table (migration `002-concepts-fts`), `runVectorGC()` fired on app boot (evicts at 5000, trims to 4500), hybrid search in `retrieve.ts` (parallel `sqlite-vec` + FTS5, JIT rehydration).

### Phase 6 remaining (= what this doc covers)

| # | Task | Status |
|---|------|--------|
| 1 | Backup/export (`.codelens` archive) | not started |
| 2 | Restore from `.codelens` | not started |
| 3 | Clear all data (double-confirm) | not started |
| 4 | Empty states for every screen | not started |
| 5 | App icon + splash screen wiring | partial (paths exist in `app.json`, real assets still pending) |
| 6 | Design templates (`design/ASSETS.md`, `design/THEME_SPECS.md`) | not started |

After Phase 6 → Phase 7 (README + v1.0 tag) ships the app.

---

## 1. Deps — already installed

The user pre-installed these during the planning session — **do not re-install, do not upgrade versions, treat as locked**:

```
expo-file-system     ~19.0.21
expo-sharing         ~14.0.8
expo-document-picker ~14.0.8
jszip                ^3.10.1
@types/jszip         ^3.4.0
expo-crypto          ~15.0.8  (already used for uid())
```

If your edits require another dep, **stop and ask the user** — don't install silently.

---

## 2. The `.codelens` backup format (spec — build exactly this)

### Why this format (context for judgment calls)

We evaluated three options:

- **Option 1 — JSON dump (single `.json` file):** simple but (a) loads everything into JS memory, OOM risk, (b) loses vectors (= restore triggers full re-embedding = API costs + rate limits + battery drain).
- **Option 2 — Raw SQLite file copy:** fastest but (a) brittle across schema versions, (b) doesn't include MMKV / secure-store keys, (c) no migration hooks.
- **Option 3 — `.codelens` archive (NDJSON + Zip):** chosen. Streams rows (constant ~2MB JS memory), preserves vectors as Base64 (~2KB per 384-dim float × zip compression → small), explicit schema version for forward compat, bundles MMKV + secure-key names.

**Go with Option 3. Do not ship Option 1 or 2.**

### Archive structure

The `.codelens` file is a plain `.zip` renamed. Internal layout:

```
backup-YYYY-MM-DD-HHMMSS.codelens/
├── metadata.json       # Schema version, app version, export date, counts
├── preferences.json    # MMKV dump: chat_config + embed_config
├── secure_keys.json    # NAMES of keys only (e.g. ["openrouter", "siliconflow"]) — never the secrets
├── projects.ndjson     # one JSON object per line
├── files.ndjson
├── chats.ndjson
├── chat_messages.ndjson
├── learning_sessions.ndjson
├── concepts.ndjson     # includes base64-encoded vector field
└── concept_links.ndjson
```

### `metadata.json` shape

```json
{
  "formatVersion": 1,
  "appVersion": "1.0.0",
  "schemaVersion": 2,
  "exportedAt": "2026-04-16T18:42:00.000Z",
  "counts": {
    "projects": 12,
    "files": 83,
    "chats": 47,
    "chat_messages": 621,
    "learning_sessions": 9,
    "concepts": 104,
    "concept_links": 38,
    "embeddings": 87
  }
}
```

- `formatVersion` = this archive format's version. **Bump only if you change the archive layout** (e.g., rename a file, change NDJSON shape). Current = `1`.
- `schemaVersion` = the SQLite schema version (mirrors `schema_version` table). Current = `2`. On import, if the archive's schemaVersion < current, run a JS-side field-mapping migration before insert.

### `preferences.json` shape

```json
{
  "chat_config": { /* ChatConfig from src/ai/scopes.ts */ },
  "embed_config": { /* EmbedConfig from src/ai/scopes.ts */ }
}
```

Read via `kv.get('chat_config')` and `kv.get('embed_config')`.

### `secure_keys.json` shape

```json
{
  "providers": ["openrouter", "siliconflow"]
}
```

**SECURITY:** Only the provider names, never `sk-...` secrets. On restore the user gets a toast: "Re-enter API keys in Settings for: openrouter, siliconflow".

### NDJSON line shape — concepts (the complex one)

Each line is a self-contained JSON object. Vector is optional (cold-tier concepts have no active vector):

```json
{"id":"abc","name":"X","summary":"…","taxonomy":{"tags":["a"]},"sessionIds":["s1"],"strength":0.5,"createdAt":"…","updatedAt":"…","embedding":{"model":"BAAI/bge-small-en-v1.5","api":"siliconflow","signature":"…","updatedAt":"…","vectorBase64":"BASE64…"}}
```

- Read vector via `rawDb.executeSync('SELECT embedding FROM embeddings_vec WHERE concept_id = ?', [id])`. Result is an `ArrayBuffer` (1536 bytes = 384 × float32).
- Convert: `arrayBufferToBase64(buf)` — use a small utility, **not** JS `btoa` (binary safety).
- If no vector row, omit the `embedding` field entirely.

### NDJSON line shape — other tables

Straight row dumps. Use `db.select().from(table)` and JSON-stringify each row. JSON-mode columns (`marks`, `ranges`, `taxonomy`, etc.) are already objects in Drizzle output — no extra decode needed.

---

## 3. Implementation plan — files to create/edit

### 3.1 New feature folder: `src/features/backup/`

```
src/features/backup/
├── index.ts              # barrel exports
├── format.ts             # constants + types (FORMAT_VERSION, SCHEMA_VERSION, etc.)
├── codecs.ts             # arrayBufferToBase64 / base64ToArrayBuffer, NDJSON helpers
├── export.ts             # exportBackup(): Promise<string>  — returns file URI
├── import.ts             # importBackup(uri): Promise<ImportResult>
├── clear.ts              # clearAllData(): Promise<void>
└── ui/
    ├── BackupSection.tsx     # settings-screen subsection (Export / Import / Clear buttons + modals)
    ├── ConfirmClearModal.tsx # double-confirm flow
    └── ImportPreviewModal.tsx # shows counts from metadata.json before committing
```

### 3.2 Edit: `app/settings.tsx`

Add a new section at the **bottom** (after Embedding section):

```tsx
<Text style={styles.sectionTitle}>Data</Text>
<BackupSection />
```

Import `BackupSection` from `@/src/features/backup`. Don't inline the logic into settings.tsx — keep it contained.

### 3.3 Edit: `src/features/backup/index.ts` barrel

```ts
export { exportBackup } from './export';
export { importBackup } from './import';
export type { ImportResult } from './import';
export { clearAllData } from './clear';
export { BackupSection } from './ui/BackupSection';
```

---

## 4. Backup export — code skeleton

```ts
// src/features/backup/export.ts
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import JSZip from 'jszip';
import { db, getRawDb } from '../../db/client';
import * as schema from '../../db/schema';
import { kv, secureStore } from '../../composition';
import { arrayBufferToBase64 } from './codecs';
import { FORMAT_VERSION, SCHEMA_VERSION, APP_VERSION } from './format';

const BATCH_SIZE = 500; // tune if needed

interface ConceptExportRow {
  id: string;
  name: string;
  summary: string;
  taxonomy: unknown;
  sessionIds: string[];
  strength: number;
  createdAt: string;
  updatedAt: string;
  embedding?: {
    model: string;
    api: string;
    signature: string;
    updatedAt: string;
    vectorBase64: string;
  };
}

export async function exportBackup(): Promise<string> {
  const zip = new JSZip();

  // --- Streaming counts ---
  const counts: Record<string, number> = {};

  // Helper: stream a table to NDJSON string (returns lines joined).
  // For very large tables we could stream to disk first, but FlatList
  // apps rarely have >100k rows — in-memory concat is fine up to ~10MB.
  async function dumpTable<T extends Record<string, unknown>>(
    name: string,
    rows: T[],
    transform?: (row: T) => unknown
  ): Promise<void> {
    counts[name] = rows.length;
    const lines = rows
      .map((r) => JSON.stringify(transform ? transform(r) : r))
      .join('\n');
    zip.file(`${name}.ndjson`, lines);
  }

  await dumpTable('projects', await db.select().from(schema.projects));
  await dumpTable('files', await db.select().from(schema.files));
  await dumpTable('chats', await db.select().from(schema.chats));
  await dumpTable('chat_messages', await db.select().from(schema.chatMessages));
  await dumpTable('learning_sessions', await db.select().from(schema.learningSessions));
  await dumpTable('concept_links', await db.select().from(schema.conceptLinks));

  // Concepts — merge in vectors + meta.
  const conceptRows = await db.select().from(schema.concepts);
  const metaRows = await db.select().from(schema.embeddingsMeta);
  const metaById = new Map(metaRows.map((m) => [m.conceptId, m]));

  // Read vectors in one sweep (batched).
  const vecById = new Map<string, ArrayBuffer>();
  const raw = getRawDb();
  for (let i = 0; i < conceptRows.length; i += BATCH_SIZE) {
    const batch = conceptRows.slice(i, i + BATCH_SIZE);
    const placeholders = batch.map(() => '?').join(',');
    const res = raw.executeSync(
      `SELECT concept_id, embedding FROM embeddings_vec WHERE concept_id IN (${placeholders})`,
      batch.map((c) => c.id)
    );
    for (const row of res.rows ?? []) {
      const id = row['concept_id'] as string;
      const emb = row['embedding'] as ArrayBuffer | Uint8Array;
      const buf = emb instanceof ArrayBuffer ? emb : emb.buffer.slice(emb.byteOffset, emb.byteOffset + emb.byteLength);
      vecById.set(id, buf);
    }
  }

  let embeddingCount = 0;
  await dumpTable('concepts', conceptRows, (c) => {
    const meta = metaById.get(c.id);
    const vec = vecById.get(c.id);
    const out: ConceptExportRow = {
      id: c.id,
      name: c.name,
      summary: c.summary,
      taxonomy: c.taxonomy,
      sessionIds: c.sessionIds,
      strength: c.strength,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    };
    if (meta && vec) {
      out.embedding = {
        model: meta.model,
        api: meta.api,
        signature: meta.signature,
        updatedAt: meta.updatedAt,
        vectorBase64: arrayBufferToBase64(vec),
      };
      embeddingCount++;
    }
    return out;
  });

  // --- Preferences (MMKV) ---
  zip.file(
    'preferences.json',
    JSON.stringify({
      chat_config: kv.get('chat_config'),
      embed_config: kv.get('embed_config'),
    })
  );

  // --- Secure-key names only ---
  const providers: string[] = [];
  for (const p of ['openrouter', 'siliconflow']) {
    if (await secureStore.getApiKey(p)) providers.push(p);
  }
  zip.file('secure_keys.json', JSON.stringify({ providers }));

  // --- Metadata ---
  zip.file(
    'metadata.json',
    JSON.stringify({
      formatVersion: FORMAT_VERSION,
      appVersion: APP_VERSION,
      schemaVersion: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      counts: { ...counts, embeddings: embeddingCount },
    })
  );

  // --- Generate + write to tempfile ---
  const base64 = await zip.generateAsync({
    type: 'base64',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  const filename = `codelens-backup-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.codelens`;
  const uri = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });

  // Share (user chooses destination).
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/zip',
      dialogTitle: 'Save CodeLens backup',
      UTI: 'public.zip-archive',
    });
  }

  return uri;
}
```

### ⚠️ Sensitive cases to handle

1. **JSZip `generateAsync` memory** — At scale, prefer `generateAsync({ type: 'uint8array' })` then write via `writeAsStringAsync` with `Base64`. If you hit memory ceilings on very large datasets, switch to writing individual NDJSON files to disk first, then streaming-zip each via `FileSystem.readAsStringAsync`. Don't over-optimize unless user reports an actual OOM.
2. **op-sqlite blob shape for `embedding`** — returned as `Uint8Array` or `ArrayBuffer` depending on driver mood. The code above normalizes both.
3. **Drizzle JSON columns** — already parsed to JS objects on read; `JSON.stringify` on the row handles re-serialization.

---

## 5. Restore import — code skeleton

```ts
// src/features/backup/import.ts
import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import JSZip from 'jszip';
import { db } from '../../db/client';
import * as schema from '../../db/schema';
import { kv, vectorStore } from '../../composition';
import { base64ToArrayBuffer } from './codecs';
import { FORMAT_VERSION, SCHEMA_VERSION } from './format';
import { clearAllData } from './clear';

export interface ImportResult {
  imported: Record<string, number>;
  skipped: string[];     // table names skipped due to errors
  missingKeys: string[]; // providers that had keys in backup — user must re-enter
}

export async function importBackup(): Promise<ImportResult | null> {
  const picked = await DocumentPicker.getDocumentAsync({
    type: ['application/zip', 'application/octet-stream', '*/*'],
    copyToCacheDirectory: true,
  });
  if (picked.canceled || !picked.assets[0]) return null;
  const uri = picked.assets[0].uri;

  // Read file as base64 and load into JSZip.
  const b64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const zip = await JSZip.loadAsync(b64, { base64: true });

  // --- Validate metadata ---
  const metaRaw = await zip.file('metadata.json')?.async('string');
  if (!metaRaw) throw new Error('Invalid backup: metadata.json missing');
  const meta = JSON.parse(metaRaw) as {
    formatVersion: number;
    schemaVersion: number;
    appVersion: string;
  };
  if (meta.formatVersion > FORMAT_VERSION) {
    throw new Error(`Backup format v${meta.formatVersion} is newer than this app (v${FORMAT_VERSION}). Update the app.`);
  }

  // --- WIPE before restore (clean slate strategy) ---
  // Alternative: merge. Decided against it because:
  //  - Conflict resolution on concept merges is genuinely hard
  //  - Users who restore usually want a fresh clone from another device
  // If user pushback: add a "merge vs replace" toggle in ImportPreviewModal later.
  await clearAllData();

  const imported: Record<string, number> = {};
  const skipped: string[] = [];

  // --- Helper: read NDJSON lines from zip ---
  async function readNdjson<T>(name: string): Promise<T[]> {
    const raw = await zip.file(`${name}.ndjson`)?.async('string');
    if (!raw) return [];
    return raw
      .split('\n')
      .filter((l) => l.trim().length > 0)
      .map((l) => JSON.parse(l) as T);
  }

  // --- Restore inside a single transaction for atomicity ---
  // Note: vectors (embeddings_vec) use a separate virtual-table path that
  // sqlite-vec may NOT roll back cleanly with the Drizzle transaction.
  // We therefore insert vectors AFTER the row data is committed.
  const projects = await readNdjson<typeof schema.projects.$inferSelect>('projects');
  const files = await readNdjson<typeof schema.files.$inferSelect>('files');
  const chats = await readNdjson<typeof schema.chats.$inferSelect>('chats');
  const messages = await readNdjson<typeof schema.chatMessages.$inferSelect>('chat_messages');
  const sessions = await readNdjson<typeof schema.learningSessions.$inferSelect>('learning_sessions');
  const concepts = await readNdjson<any>('concepts');
  const links = await readNdjson<typeof schema.conceptLinks.$inferSelect>('concept_links');

  // Apply schema migrations here if meta.schemaVersion < SCHEMA_VERSION.
  // Currently we are at v2 and the only schema change from v1 was adding FTS5
  // (virtual table + triggers) — it does not affect row shape, so no transform
  // needed for now. Add field mappers here when the schema evolves.

  await db.transaction(async (tx) => {
    if (projects.length) await insertBatch(tx, schema.projects, projects);
    if (files.length)    await insertBatch(tx, schema.files, files);
    if (chats.length)    await insertBatch(tx, schema.chats, chats);
    if (messages.length) await insertBatch(tx, schema.chatMessages, messages);
    if (sessions.length) await insertBatch(tx, schema.learningSessions, sessions);
    // concepts: strip the embedding field before insert (goes into vec0 below)
    const conceptRows = concepts.map((c: any) => {
      const { embedding, ...row } = c;
      return row;
    });
    if (conceptRows.length) await insertBatch(tx, schema.concepts, conceptRows);
    if (links.length)    await insertBatch(tx, schema.conceptLinks, links);
  });

  imported['projects'] = projects.length;
  imported['files'] = files.length;
  imported['chats'] = chats.length;
  imported['chat_messages'] = messages.length;
  imported['learning_sessions'] = sessions.length;
  imported['concepts'] = concepts.length;
  imported['concept_links'] = links.length;

  // --- Vectors (post-transaction) ---
  let vecRestored = 0;
  for (const c of concepts) {
    if (!c.embedding) continue;
    try {
      const buf = base64ToArrayBuffer(c.embedding.vectorBase64);
      const f32 = new Float32Array(buf);
      await vectorStore.upsert({
        id: c.id,
        vector: f32,
        model: c.embedding.model,
        api: c.embedding.api,
        signature: c.embedding.signature,
        updatedAt: c.embedding.updatedAt,
      });
      vecRestored++;
    } catch {
      // per-concept failure doesn't abort the whole restore
    }
  }
  imported['embeddings'] = vecRestored;

  // --- MMKV prefs ---
  try {
    const prefsRaw = await zip.file('preferences.json')?.async('string');
    if (prefsRaw) {
      const prefs = JSON.parse(prefsRaw);
      if (prefs.chat_config) kv.set('chat_config', prefs.chat_config);
      if (prefs.embed_config) kv.set('embed_config', prefs.embed_config);
    }
  } catch {
    skipped.push('preferences');
  }

  // --- Missing secure keys warning ---
  let missingKeys: string[] = [];
  try {
    const keysRaw = await zip.file('secure_keys.json')?.async('string');
    if (keysRaw) missingKeys = JSON.parse(keysRaw).providers ?? [];
  } catch {}

  return { imported, skipped, missingKeys };
}

// --- Batched insert helper (keeps single SQL statement small) ---
async function insertBatch<T>(tx: any, table: any, rows: T[]) {
  const CHUNK = 100;
  for (let i = 0; i < rows.length; i += CHUNK) {
    await tx.insert(table).values(rows.slice(i, i + CHUNK));
  }
}
```

### ⚠️ Critical gotchas for import

1. **Wipe vs merge** — this impl wipes first. Keep it. Don't invent a diff/merge algorithm without explicit user approval.
2. **Vectors outside the transaction** — `sqlite-vec` virtual tables don't always participate cleanly in rollback; isolating vector restore means a partial vector failure doesn't corrupt the row data.
3. **Schema version forward-compat** — if `meta.schemaVersion < SCHEMA_VERSION`, add a `migrateRows(rows, fromVersion)` step before insert. Current schemaVersion is 2 and the v1→v2 change is FTS-only (no row shape change), so no migrators needed yet. Add the hook as a no-op function now so next developer has an obvious place to extend.
4. **FTS5 sync** — `INSERT INTO concepts` triggers auto-populate `concepts_fts`. No manual FTS refill needed.
5. **Drizzle batching** — op-sqlite has a SQL-size ceiling; chunk inserts at 100 rows.

---

## 6. `codecs.ts` — Base64 helpers

```ts
// src/features/backup/codecs.ts
// React Native lacks Buffer in the global scope and btoa/atob are binary-unsafe.
// Use a manual implementation for portability.

const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let out = '';
  let i = 0;
  for (; i + 2 < bytes.length; i += 3) {
    const triplet = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    out +=
      B64_CHARS[(triplet >> 18) & 63] +
      B64_CHARS[(triplet >> 12) & 63] +
      B64_CHARS[(triplet >> 6) & 63] +
      B64_CHARS[triplet & 63];
  }
  if (i < bytes.length) {
    const rem = bytes.length - i;
    const triplet = (bytes[i] << 16) | ((rem === 2 ? bytes[i + 1] : 0) << 8);
    out += B64_CHARS[(triplet >> 18) & 63] + B64_CHARS[(triplet >> 12) & 63];
    out += rem === 2 ? B64_CHARS[(triplet >> 6) & 63] : '=';
    out += '=';
  }
  return out;
}

export function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const clean = b64.replace(/=+$/, '');
  const len = Math.floor((clean.length * 3) / 4);
  const out = new Uint8Array(len);
  let p = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const c0 = B64_CHARS.indexOf(clean[i]);
    const c1 = B64_CHARS.indexOf(clean[i + 1]);
    const c2 = i + 2 < clean.length ? B64_CHARS.indexOf(clean[i + 2]) : 0;
    const c3 = i + 3 < clean.length ? B64_CHARS.indexOf(clean[i + 3]) : 0;
    out[p++] = (c0 << 2) | (c1 >> 4);
    if (i + 2 < clean.length) out[p++] = ((c1 & 15) << 4) | (c2 >> 2);
    if (i + 3 < clean.length) out[p++] = ((c2 & 3) << 6) | c3;
  }
  return out.buffer;
}
```

(If Expo exposes `Buffer` or you have `expo-crypto`'s `digestStringAsync` giving hex, prefer those. The hand-rolled version above is guaranteed to work in the Hermes JS engine.)

---

## 7. `format.ts`

```ts
// src/features/backup/format.ts
export const FORMAT_VERSION = 1;   // Archive structure version — bump on layout changes
export const SCHEMA_VERSION = 2;   // Must match src/db/migrations/index.ts
export const APP_VERSION = '1.0.0'; // Must match package.json + app.json
```

**Keep this file as the single source of truth for these values.** If schema or app version changes, update here too.

---

## 8. Clear all data — `clear.ts`

```ts
// src/features/backup/clear.ts
import { db, getRawDb } from '../../db/client';
import * as schema from '../../db/schema';
import { kv, secureStore, vectorStore } from '../../composition';

export async function clearAllData(options?: { includeApiKeys?: boolean }): Promise<void> {
  // 1. Vector store (also nukes embeddings_meta).
  await vectorStore.deleteAll();

  // 2. Drizzle tables — delete in FK-safe order (children first).
  await db.transaction(async (tx) => {
    await tx.delete(schema.chatMessages);
    await tx.delete(schema.chats);
    await tx.delete(schema.conceptLinks);
    await tx.delete(schema.concepts);
    await tx.delete(schema.learningSessions);
    await tx.delete(schema.files);
    await tx.delete(schema.projects);
  });

  // 3. FTS5 virtual table — triggers clear it when concepts are deleted, but
  //    be explicit in case the trigger misfires.
  getRawDb().executeSync('DELETE FROM concepts_fts');

  // 4. MMKV — only wipe app-owned keys (not react-native-mmkv internals).
  kv.delete('chat_config');
  kv.delete('embed_config');

  // 5. API keys — only if caller opted in (default = keep).
  if (options?.includeApiKeys) {
    await secureStore.deleteApiKey('openrouter');
    await secureStore.deleteApiKey('siliconflow');
  }
}
```

### UI flow — double confirm (in `ConfirmClearModal.tsx`)

Two-step confirm:

1. Modal opens with copy: "This will delete all projects, chats, concepts, and preferences. This cannot be undone."
2. Show a checkbox: "Also delete saved API keys". Default off.
3. User types `DELETE` into a text field (case-sensitive) to enable the final destructive button.
4. Destructive button runs `clearAllData({ includeApiKeys: checkbox.value })`, closes modal, toasts "All data cleared", navigates to `/`.

Use `Pressable` (not Alert.alert) so copy + the typed-confirm pattern work cross-platform consistently with the rest of the app.

---

## 9. BackupSection UI — `src/features/backup/ui/BackupSection.tsx`

Three buttons stacked vertically, each with a description line:

```
┌──────────────────────────────────────┐
│ Data                                 │
│                                      │
│ [Export backup]                      │
│   Download all your data as a        │
│   .codelens file.                    │
│                                      │
│ [Restore from backup]                │
│   Import a .codelens file. Replaces  │
│   all current data.                  │
│                                      │
│ [Clear all data]     (red / danger)  │
│   Delete everything. Cannot be       │
│   undone.                            │
└──────────────────────────────────────┘
```

Show a spinner on each button while its action is in-flight. Disable all buttons when any action is running. Wire the toast (`flash`) already used in `settings.tsx` for success/error messages. On import success, show the `ImportResult` counts (e.g. "Restored: 12 projects, 104 concepts, 87 vectors"). If `missingKeys.length > 0`, show a warning: "Re-enter API keys in Settings: openrouter, siliconflow".

Reuse styles from `settings.tsx` (`keySection`, `saveBtn`, `clearBtn`, `label`) where possible — keep design consistent.

---

## 10. Empty states — which screens need them

Audit every screen in `app/` and wire an empty-state when the data list is empty:

| File | Current | Needed |
|------|---------|--------|
| `app/index.tsx` | has empty ("No projects yet") | polish copy, add CTA button to open import modal |
| `app/learning/index.tsx` | check | "No concepts yet — chat in Learning scope to extract some." |
| `app/learning/sessions.tsx` (if exists) | check | "No learning sessions yet." |
| `app/recent-chats.tsx` | check | "No chats yet. Tap Chat to start one." |
| `app/project/[id].tsx` | check | "No files in this project. Add one with the + button." |
| `app/general-chat/[id].tsx` | usually has messages | first-message prompt hint: "Ask anything." |

**Pattern to use** — match the existing `emptyContainer`/`emptyText`/`emptyHint` styles in `app/index.tsx:357-373`. Do NOT add an illustration — stay text-only for v1.0.

For each empty state, include:
- A short title ("No concepts yet")
- A one-line hint explaining how to create the thing
- Optionally, a primary CTA button that kicks off the create flow

---

## 11. App icon + splash — configuration

`app.json` is already wired correctly (lines 7, 15-20, 32-42). **Do not change the config.** What's needed is real image assets in `assets/images/`.

The existing placeholders (`icon.png`, `android-icon-foreground.png`, `android-icon-background.png`, `android-icon-monochrome.png`, `splash-icon.png`, `favicon.png`) are the default Expo generated ones — they still need user-provided replacements.

### What to do now (without assets)

1. **Create `design/ASSETS.md`** — see spec in §12 below. Tells user exactly what dimensions + files to provide from Figma.
2. **Create `design/THEME_SPECS.md`** — see §13. Figma design-tokens template.
3. **Optionally:** change the splash background color in `app.json` from `#ffffff` to `colors.background` (`#0f1117`) so the splash matches the dark app theme seamlessly. Propose this as a diff and let the user approve.

### Splash color suggestion

```diff
-          "backgroundColor": "#ffffff",
+          "backgroundColor": "#0f1117",
           "dark": {
             "backgroundColor": "#000000"
           }
```

But **only apply after user confirms**.

---

## 12. `design/ASSETS.md` — spec

Create `C:\CodeLens-v2\codelens-rn\design\ASSETS.md`:

```markdown
# Design Assets

Source of truth for all visual assets. When we export from Figma, drop PNGs at the paths below. `app.json` already references them — no config changes required.

## App icon — iOS + generic

- Path: `assets/images/icon.png`
- Size: 1024×1024 PNG, sRGB, no alpha (iOS rejects alpha on App Store icon)
- Safe zone: keep meaningful content inside the centre 820×820 square

## App icon — Android adaptive

Android renders these at different crop ratios per-device. Design with the safe zone in mind.

- Path: `assets/images/android-icon-foreground.png`
  - Size: 1024×1024 PNG, transparent background
  - Safe zone: centre 660×660 circle is always visible
- Path: `assets/images/android-icon-background.png`
  - Size: 1024×1024 PNG, opaque — solid colour or subtle gradient
- Path: `assets/images/android-icon-monochrome.png`
  - Size: 1024×1024 PNG, single-colour (white/alpha). Used by Android 13+ themed icons.

## Splash screen

- Path: `assets/images/splash-icon.png`
- Size: 512×512 PNG, transparent background
- Rendered at 200px wide (see `app.json` → `imageWidth: 200`)
- Kept intentionally simple — splash should feel instant, not branded-heavy

## Favicon (web)

- Path: `assets/images/favicon.png`
- Size: 48×48 PNG. Any wider is wasted — browsers downsample.

## Exporter checklist

- [ ] All PNGs use sRGB colourspace
- [ ] File names match EXACTLY (case-sensitive on CI)
- [ ] No macOS metadata (run `xattr -c *.png` before committing)
- [ ] Commit message: `chore(assets): v1.0 icon + splash`
```

## 13. `design/THEME_SPECS.md` — spec

Create `C:\CodeLens-v2\codelens-rn\design\THEME_SPECS.md`:

```markdown
# Theme Specs — Figma → TypeScript

Fill in the values below from your Figma design tokens. Once populated, this file will drive code-generation for `src/ui/theme.ts` (we will strictly type each token and fail the build if a design-referenced value is missing).

## Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `background` | `#0f1117` | Root view background |
| `surface` | `#1a1d27` | Card / input background |
| `surfaceLight` | `#252836` | Elevated surface |
| `primary` | `#608bdb` | Buttons, accents |
| `primaryLight` | `#7ea3e8` | Hover / pressed state |
| `text` | `#f4f7ff` | Primary text |
| `textSecondary` | `#8b92a8` | Hint text |
| `border` | `#2a2d3a` | Dividers, outlines |
| `red` | `#e06c75` | Destructive / error |
| `green` | `#98c379` | Success / saved state |
| `yellow` | `#e5c07b` | Warnings |
| `blue` | `#61afef` | Info links |
| `purple` | `#c678dd` | Learning scope accent |

> Current values above match `src/ui/theme.ts`. Replace with Figma exports when finalized.

## Typography

| Token | Value | Weight | Usage |
|-------|-------|--------|-------|
| `fontSize.sm` | `12` | 400 | Small labels |
| `fontSize.md` | `14` | 400 | Body default |
| `fontSize.lg` | `16` | 500 | Subtitles |
| `fontSize.xl` | `20` | 700 | Section titles |
| `fontSize.xxl` | `24` | 700 | Screen titles |

- Font family: system (iOS SF, Android Roboto) — no custom font in v1.0
- Monospace: used only for code / model-id inputs — `'monospace'` keyword

## Spacing

Flexbox `gap` and `padding` values (px):

| Token | Value |
|-------|-------|
| `spacing.xs` | `4` |
| `spacing.sm` | `8` |
| `spacing.md` | `16` |
| `spacing.lg` | `24` |
| `spacing.xl` | `32` |

## Radii

| Token | Value |
|-------|-------|
| `radius.sm` | `6` |
| `radius.md` | `8` |
| `radius.lg` | `12` |
| `radius.pill` | `28` |

> Not yet in `theme.ts`. Add these under an `export const radius = {...}` block once confirmed.

## Opacity / elevation

| Token | Value | Notes |
|-------|-------|-------|
| `shadow.card` | `{ offset: {0,2}, opacity: 0.25, radius: 4, elevation: 4 }` | iOS + Android |
| `opacity.disabled` | `0.5` | Disabled buttons |
| `opacity.overlay` | `0.6` | Modal backdrops |

## Next step

Once this file is populated from Figma:
1. Add a `scripts/codegen-theme.js` that reads this MD (or a structured JSON sibling) and regenerates `src/ui/theme.ts` with strict `as const` typing.
2. Add CI check: `tsc --strict` + grep for any hardcoded hex colour outside `theme.ts` → fail PR.
```

---

## 14. Testing

There is an existing Vitest suite; `expo-crypto` is aliased to `node:crypto` in `vitest.config.ts`. Patterns:

- Add `src/features/backup/__tests__/codecs.test.ts` — round-trip a `Float32Array` through `arrayBufferToBase64` → `base64ToArrayBuffer` and assert equality (byte-for-byte and value-for-value on a 384-dim vector).
- Add `src/features/backup/__tests__/export.test.ts` — seed a small DB (use `initDatabase()` on an in-memory path), run export, unzip in-memory with JSZip, assert counts and that `concepts.ndjson` contains a line with an `embedding.vectorBase64` field.
- Add `src/features/backup/__tests__/import.test.ts` — export → wipe → import → compare counts. Mock `DocumentPicker.getDocumentAsync` to return a tempfile URI.
- Skip Sharing tests (no simulator IPC).

Run `npm test`. Target: green + no TS errors (`npx tsc --noEmit`).

---

## 15. Order of operations (suggested)

Work through in this order to reduce rework:

1. Create `src/features/backup/format.ts` + `codecs.ts` + tests for codecs.
2. Build `clear.ts` (small, testable, no external deps).
3. Build `export.ts` + test against seeded in-memory DB.
4. Build `import.ts` + round-trip test.
5. Build `ui/ConfirmClearModal.tsx`, then `ui/ImportPreviewModal.tsx`, then `ui/BackupSection.tsx`.
6. Wire `BackupSection` into `app/settings.tsx`.
7. Audit empty states across `app/` — one PR per screen is overkill; bundle them as a single "empty-states" commit.
8. Create `design/ASSETS.md` + `design/THEME_SPECS.md`.
9. Propose splash background colour change to user (diff only, don't merge without approval).
10. Update `current_state.md` + `MAIN.md` + `ARCHITECTURE.md` with Phase 6 completion entry.
11. Hand off to Codex using `PHASE_6/codex_review_request.md` (sibling file, see §16).

---

## 16. What to commit (user preference)

User prefers **one bundled commit per logical phase** over many small commits. Structure the final Phase 6 commit message as:

```
feat(phase6): backup/restore, clear-data, empty states, design assets

Implements Phase 6 (ship-ready hardening + data portability):

1. Backup export/import (.codelens = NDJSON + Zip)
   - src/features/backup/{format,codecs,export,import,clear}.ts
   - Streaming per-table NDJSON (constant ~2MB JS memory regardless of DB size)
   - Vectors preserved as Base64 (~2KB/vector) → zero re-embed cost on restore
   - Schema-version migration hook (currently no-op, v1→v2 is FTS-only)
   - Vectors applied post-transaction (sqlite-vec does not rollback reliably)

2. Clear-all-data (double-confirm flow)
   - Typed "DELETE" confirmation + optional API-key wipe
   - Vector store, Drizzle tables, FTS5 index, MMKV prefs

3. Empty states across every screen (no illustrations — v1.0 is text-only)

4. Design handoff templates
   - design/ASSETS.md: exact PNG specs for Figma export
   - design/THEME_SPECS.md: design-token template → generates src/ui/theme.ts

5. Stale MD sync — MAIN.md, current_state.md, ARCHITECTURE.md
```

Then present as a single bash copy-paste block for VS Code terminal (per user's git-commit memory).

---

## 17. Known open questions — ask user before answering

1. **Splash background colour** — white (`#ffffff`) or dark (`#0f1117`) to match app theme?
2. **Import strategy** — wipe-then-restore (current plan) or merge? Plan assumes wipe.
3. **API-key wipe default** — should the "clear all data" flow wipe API keys by default? Current plan: off by default.
4. **Actual icon/splash PNGs** — user needs to produce these from Figma before tagging v1.0. Design templates in §12-13 give exact specs.

---

## 18. Post-Phase-6 → Phase 7 (do not do now)

Phase 7 scope = README + v1.0 tag:

- Rewrite `README.md` to be user-facing: what the app does, screenshots, install instructions, model config, backup/restore usage.
- Tag `v1.0.0` on main.
- (Optional) publish to Expo EAS for internal distribution.

Leave this for a separate session.

---

## 19. Files to touch — quick index

**New:**
- `src/features/backup/index.ts`
- `src/features/backup/format.ts`
- `src/features/backup/codecs.ts`
- `src/features/backup/export.ts`
- `src/features/backup/import.ts`
- `src/features/backup/clear.ts`
- `src/features/backup/ui/BackupSection.tsx`
- `src/features/backup/ui/ConfirmClearModal.tsx`
- `src/features/backup/ui/ImportPreviewModal.tsx`
- `src/features/backup/__tests__/codecs.test.ts`
- `src/features/backup/__tests__/export.test.ts`
- `src/features/backup/__tests__/import.test.ts`
- `design/ASSETS.md`
- `design/THEME_SPECS.md`

**Edit:**
- `app/settings.tsx` — add `<BackupSection />` under a new "Data" section at the bottom.
- `app/index.tsx` — polish existing empty state.
- Every other screen in `app/` that renders a list — add empty state.
- `current_state.md` — append Phase 6 completion entry.
- `MAIN.md` — update status line at bottom.
- `ARCHITECTURE.md` — add backup/restore subsection.

**Possibly edit (ask first):**
- `app.json` — splash backgroundColor change.

---

## 20. Final sanity checks before marking Phase 6 complete

- [ ] `npm test` green
- [ ] `npx tsc --noEmit` green
- [ ] `npm run lint` green
- [ ] Backup → restore round-trip preserves all 7 table counts + vector count
- [ ] Clear-all wipes everything visible in the UI
- [ ] Every `app/` screen has a graceful empty state
- [ ] `design/ASSETS.md` + `design/THEME_SPECS.md` exist and are populated with current values
- [ ] MDs (`MAIN.md`, `current_state.md`, `ARCHITECTURE.md`) reflect Phase 6 done
- [ ] Codex review message exists at `PHASE_6/codex_review_request.md`

Good luck. Ship it.
