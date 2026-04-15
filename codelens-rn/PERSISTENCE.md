# Persistence Layer — op-sqlite + Drizzle + sqlite-vec

Canonical reference for how CodeLens RN stores data on device. Read this before touching anything under `src/db/` or `src/adapters/sqlite-vector-store.ts`.

## Stack

- **@op-engineering/op-sqlite v15+** — JSI-backed SQLite driver.
- **sqlite-vec** — statically compiled into op-sqlite via `"op-sqlite": { "sqliteVec": true }` in `package.json`. No dynamic extension file exists on disk.
- **drizzle-orm v0.45.x** — used for schema + typed CRUD. Driver was written for an older op-sqlite API; we bridge the gap with a Proxy.

## Three decisions that are load-bearing

### 1. sqlite-vec is statically linked — do NOT call `loadExtension`

Because sqlite-vec is compiled into the binary, there is no `.so`/`.dylib` to load. Calling `opsqlite.loadExtension('vec0')` throws, and any surrounding try/catch that bails early will skip the virtual-table creation and you'll get `no such table: embeddings_vec` at query time.

**Rule:** `initVec0()` runs `CREATE VIRTUAL TABLE IF NOT EXISTS embeddings_vec USING vec0(...)` directly. The try/catch is only there to warn if the extension really isn't compiled in.

See [src/db/client.ts](codelens-rn/src/db/client.ts) `initVec0()`.

### 2. vec0 virtual tables have no TEXT primary key — use DELETE+INSERT for upsert

vec0 only treats `rowid` (INTEGER) as a true primary key. A `TEXT` column like `concept_id` is a **metadata column** — you can filter on it but it carries no uniqueness constraint, so `INSERT OR REPLACE` will NOT resolve conflicts on it and you'll end up with duplicate rows per concept.

**Rule:**
- Schema declares `concept_id TEXT` (no `PRIMARY KEY`).
- Upsert pattern is explicit DELETE then INSERT inside a single transaction.

```sql
CREATE VIRTUAL TABLE IF NOT EXISTS embeddings_vec USING vec0(
  concept_id TEXT,
  embedding FLOAT[384]
);
```

See [src/adapters/sqlite-vector-store.ts](codelens-rn/src/adapters/sqlite-vector-store.ts) `upsert()`.

### 3. Drizzle's op-sqlite driver targets an older API — we Proxy-wrap the DB

The `drizzle-orm/op-sqlite` driver calls:
- `executeAsync` / `executeRawAsync` — renamed to `execute` / `executeRaw` in v15.
- Expects `result.rows._array` — v15 returns a plain array on `rows`.
- Passes raw JS values down — op-sqlite's JSI bridge rejects `undefined` (wants `null`) and plain objects/arrays (wants JSON strings for `mode: 'json'` columns).

**Rule:** Every Drizzle call goes through `wrapForDrizzle()` in [src/db/client.ts](codelens-rn/src/db/client.ts), which:
- Renames methods (`executeAsync` → `execute`, `executeRawAsync` → `executeRaw`).
- Re-attaches `_array` on the rows array.
- Sanitizes params: `undefined` → `null`; plain objects/arrays → `JSON.stringify` — but leaves `ArrayBuffer` / `Uint8Array` / `Float32Array` alone (those are vector blobs).

If Drizzle ever ships native v15 support, the Proxy can go. The DELETE+INSERT upsert pattern stays regardless — that's a sqlite-vec constraint, not a Drizzle one.

## Layout

- [src/db/client.ts](codelens-rn/src/db/client.ts) — `open()`, Proxy wrapper, `initDatabase()`, `initVec0()`, `getRawDb()`.
- [src/db/schema.ts](codelens-rn/src/db/schema.ts) — Drizzle schema for all tables.
- [src/db/queries/](codelens-rn/src/db/queries/) — typed CRUD helpers (one file per table).
- [src/adapters/sqlite-vector-store.ts](codelens-rn/src/adapters/sqlite-vector-store.ts) — `VectorStorePort` impl, uses raw SQL (not Drizzle) because vec0 isn't a normal table.

## When this doc needs updating

- op-sqlite major version bump.
- Drizzle ships native v15 driver support (remove the Proxy, keep the vector upsert pattern).
- Embedding dimension changes (currently `FLOAT[384]`).
- New vec0 virtual tables added.
