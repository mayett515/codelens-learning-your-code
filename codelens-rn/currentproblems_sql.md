# Current Problems — Drizzle + op-sqlite Integration

## Context

We're building **CodeLens RN** — a React Native + Expo rewrite of a Capacitor app. The full spec is in `c:/CodeLens-v2/rewrite-spec/` (10 files, start with `00-START-HERE.md`). The project lives at `c:/CodeLens-v2/codelens-rn/`.

We're at the **Phase 1 demo checkpoint**: a dev screen (`app/dev.tsx`) that runs a RAG smoke test — inserts a project, inserts concepts, upserts vectors into a sqlite-vec `vec0` virtual table, runs `topMatches`, and prints results.

## Stack (relevant parts)

- **Expo SDK 54**, React Native 0.81.5, Hermes, new architecture enabled
- **@op-engineering/op-sqlite v15.2.11** — JSI-backed SQLite driver
- **sqlite-vec** — compiled into op-sqlite via `"op-sqlite": { "sqliteVec": true }` in `package.json`
- **drizzle-orm v0.45.2** — using `drizzle-orm/op-sqlite` driver
- **drizzle-kit v0.31.10** — schema/migrations tooling (not yet used for migrations, tables created via raw SQL in `initDatabase()`)

## Problem 1: Drizzle op-sqlite driver API mismatch

The `drizzle-orm/op-sqlite` driver (`node_modules/drizzle-orm/op-sqlite/session.js`) was written for an **older version** of op-sqlite. The method names and return shapes don't match v15:

| What Drizzle calls | What op-sqlite v15 has | Used for |
|---|---|---|
| `client.executeAsync(sql, params)` | `client.execute(sql, params)` | INSERT/UPDATE/DELETE (`run()`) |
| `client.executeRawAsync(sql, params)` | `client.executeRaw(sql, params)` | SELECT returning raw arrays (`values()`) |
| `client.execute(sql, params).rows._array` | `client.executeSync(sql, params).rows` (plain array, no `_array`) | SELECT returning objects (`all()`, `get()`) |

### Current fix attempt

In `src/db/client.ts`, we wrap the op-sqlite `DB` object with a `Proxy` that maps old method names to new ones:

```ts
function wrapForDrizzle(raw: DB): any {
  return new Proxy(raw, {
    get(target, prop) {
      if (prop === 'executeAsync') return target.execute.bind(target);
      if (prop === 'executeRawAsync') return target.executeRaw.bind(target);
      if (prop === 'execute') {
        return (sql: string, params?: any[]) => {
          const result = target.executeSync(sql, params);
          return {
            ...result,
            rows: Object.assign(result.rows ?? [], {
              _array: result.rows ?? [],
            }),
          };
        };
      }
      const val = (target as any)[prop];
      if (typeof val === 'function') return val.bind(target);
      return val;
    },
  });
}
```

**Status: UNTESTED.** The original error (before this fix) was:

```
ERROR: Failed query: insert into "projects" ("id", "name", "source", "github_url", "created_at", "recent_file_ids") values (?, ?, ?, ?, ?, ?)
params: test-project-1,Smoke Test Project,paste,,2026-04-15T17:53:24.728Z,[]
```

We haven't been able to re-test yet because of Problem 2.

### What to verify

1. Does the Proxy wrapper correctly bridge all the Drizzle driver calls?
2. Does Drizzle properly `JSON.stringify` the `mode: 'json'` columns (like `recent_file_ids`, `marks`, `taxonomy`) before passing them to op-sqlite? Or do we need to stringify manually in the query helpers?
3. Does op-sqlite v15 accept `null` as a parameter value (for nullable columns like `github_url`)? The `Scalar` type says yes (`string | number | boolean | null | ArrayBuffer | ArrayBufferView`) but the original error showed an empty param slot for the null value.

### Alternative approaches if the Proxy doesn't work

- **Option A**: Drop Drizzle for queries entirely. Keep `src/db/schema.ts` for documentation, but write all query helpers using `opsqlite.execute()` / `opsqlite.executeSync()` with raw SQL. This is more verbose but removes the compatibility layer entirely.
- **Option B**: Downgrade op-sqlite to the version Drizzle's driver targets. Risk: may lose sqlite-vec support or new arch compatibility.
- **Option C**: Use `drizzle-orm/better-sqlite3` driver style — Drizzle also has a generic SQLite driver that might work with a thinner adapter.

## Problem 2: Metro / ADB connectivity

Not a code problem, just a dev workflow issue. After the native build installed the app, Metro sometimes can't reconnect to the device:

```
[ADB] Couldn't reverse port 8081: adb.exe: device 'adb-R58Y80Q5S7Y-j9fnQZ' not found
```

**Workaround**: Open the CodeLens RN app manually on the phone. It should connect to Metro via the LAN IP shown in the terminal (e.g. `10.10.98.40:8081`). If it shows a connection prompt, enter that URL.

## Key files to read

| File | What it does |
|---|---|
| `src/db/client.ts` | op-sqlite init, Drizzle wrapping, table creation, sqlite-vec loading |
| `src/db/schema.ts` | Drizzle schema (all tables) |
| `src/db/queries/projects.ts` | Example CRUD helpers using Drizzle — if this works, the rest will too |
| `src/adapters/sqlite-vector-store.ts` | vec0 adapter using raw SQL (NOT Drizzle) — this part should work independently |
| `app/dev.tsx` | The smoke test screen that exercises the full stack |
| `node_modules/drizzle-orm/op-sqlite/session.js` | The Drizzle driver source — shows exactly which methods it calls |
| `node_modules/@op-engineering/op-sqlite/lib/typescript/src/types.d.ts` | op-sqlite v15 type definitions — the `DB` interface |

## What success looks like

The dev screen smoke test prints:

```
Initializing database...
Database initialized
Cleaning up any stale test data...
Inserting test project...
Project inserted
Projects in DB: 1
Inserting test concepts...
3 concepts inserted
Generating stub vectors (384-dim)...
3 vectors upserted into vec0
Running topMatches query (searching near vec1)...
Top matches returned: 3
  Closure: cosine=1.0000
  Promise: cosine=0.XXXX
  Monad: cosine=0.XXXX
Cleaning up test data...
Cleanup done
RAG SMOKE TEST PASSED
```
