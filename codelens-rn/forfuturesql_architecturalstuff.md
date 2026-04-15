# Future SQL & Architecture Decisions

This document captures the architectural workarounds, fixes, and patterns we established for using \`@op-engineering/op-sqlite\` (v15+) alongside \`drizzle-orm\` and \`sqlite-vec\`.

## 1. sqlite-vec Statically Linked Initialization

**The Problem:**
Originally, \`initVec0()\` was attempting to use \`opsqlite.loadExtension('vec0')\`. However, because \`sqlite-vec\` is statically compiled into the \`op-sqlite\` binary via \`"op-sqlite": { "sqliteVec": true }\`, no dynamic library (.so / .dylib) file exists on the disk. This caused \`loadExtension\` to throw an error, hitting the nested \`catch\` block which returned early and **skipped the virtual table creation entirely**, leading to \`no such table: embeddings_vec\` errors.

**The Solution:**
Skip \`loadExtension\` checks entirely if \`sqliteVec\` is statically compiled. Directly run the \`CREATE VIRTUAL TABLE\` SQL. If it fails, \`try/catch\` will catch it. 

## 2. vec0 Metadata Columns & Primary Keys

**The Problem:**
Our \`embeddings_vec\` virtual table was originally declared with \`concept_id TEXT PRIMARY KEY\`. However, \`vec0\` virtual tables only natively support \`rowid\` (an \`INTEGER\`) as the true primary key. Other columns (like \`TEXT\`) are treated as **metadata columns** that can be filtered on, but they cannot act as a unique constraint or primary key for conflict resolution (e.g., \`INSERT OR REPLACE\` won't resolve conflicts on a metadata column).

**The Solution:**
1. **Schema Update:** Remove \`PRIMARY KEY\` from the \`concept_id\` column in the \`vec0\` schema:
   \`\`\`sql
   CREATE VIRTUAL TABLE IF NOT EXISTS embeddings_vec USING vec0(
     concept_id TEXT,
     embedding FLOAT[384]
   );
   \`\`\`
2. **Upsert Logic Update:** Because we can't rely on \`INSERT OR REPLACE\` to overwrite an existing vector by \`concept_id\`, we must explicitly \`DELETE\` the old vector first and then \`INSERT\` the new one within the same transaction.
   \`\`\`typescript
   // In sqlite-vector-store.ts
   await tx.execute('DELETE FROM embeddings_vec WHERE concept_id = ?', [input.id]);
   await tx.execute('INSERT INTO embeddings_vec (concept_id, embedding) VALUES (?, ?)', [input.id, vecBlob]);
   \`\`\`

## 3. Drizzle ORM to op-sqlite v15 Proxy Adapter

**The Problem:**
The \`drizzle-orm/op-sqlite\` driver was written for an older version of \`op-sqlite\`. 
1. It calls deprecated methods like \`executeAsync\` and \`executeRawAsync\`.
2. It expects the \`execute\` result to have a \`rows._array\` property, which was removed in op-sqlite v15 in favor of returning a plain array directly on \`rows\`.
3. \`op-sqlite\`'s JSI bridge expects strictly typed primitive values for parameterized queries. It crashes or rejects queries if passed \`undefined\` (instead of \`null\`) or literal JavaScript arrays/objects instead of JSON strings (for \`mode: 'json'\` columns like arrays of IDs). Drizzle was passing things like \`undefined\` and literal arrays \`[]\` down to the driver.

**The Solution:**
We implemented a \`wrapForDrizzle()\` Proxy inside \`src/db/client.ts\` that intercepts Drizzle's calls before they reach \`op-sqlite\`.
- **Method Renaming:** Maps \`executeAsync\` -> \`execute\` and \`executeRawAsync\` -> \`executeRaw\`.
- **Result Mapping:** Injects the \`_array\` property onto the \`rows\` array for backwards compatibility.
- **Parameter Sanitization:** Intercepts the \`params\` array before execution. It converts \`undefined\` to \`null\`, and safely \`JSON.stringify()\`s any plain objects or arrays (excluding \`ArrayBuffer\`/\`Float32Array\` types used for vector embeddings). This strictly protects the JSI bridge from invalid parameter types and natively resolves the array-insertion errors.

## Maintainer Note
If Drizzle updates their \`op-sqlite\` driver to fully support v15+ natively, we can remove the proxy. However, the vector-store manual \`DELETE\` -> \`INSERT\` flow should remain, as that is a native \`sqlite-vec\` behavior regarding metadata column constraints.
