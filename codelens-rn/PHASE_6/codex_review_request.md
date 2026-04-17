# Codex — Phase 6 Review Request

**To:** Codex (OpenAI)
**From:** Claude (Opus 4.6) + the user
**Re:** Final review before v1.0 tag
**Repo:** `C:\CodeLens-v2\codelens-rn`
**Branch:** `main` (Phase 6 completion commit should be HEAD when you start)

---

## Context (1-minute brief)

CodeLens is a local-first React Native app (Expo + op-sqlite + Drizzle + sqlite-vec) for learning code on a phone. Users import GitHub repos or paste code, highlight sections, chat about them, and extract concepts into a long-term learning graph with vector similarity search.

We're at the end of **Phase 6** (backup/polish/hardening). After your review → Phase 7 = README + `v1.0.0` tag = ship.

You've reviewed earlier phases. Previous reviews caught:
- 5 real bugs in Phase 2/3 (all fixed, see commit `3b4d5c1`)
- Gemini CTO review later flagged 3 scaling risks (Drizzle tx context, `Math.random()` uid entropy, sqlite-vec unbounded memory) — all fixed, see commit `76c98ef`.

**You are the last pair of eyes before v1.0.**

---

## What to review

### 1. The backup/restore pipeline (primary focus)

**Files:**
- `src/features/backup/format.ts`
- `src/features/backup/codecs.ts`
- `src/features/backup/export.ts`
- `src/features/backup/import.ts`
- `src/features/backup/clear.ts`
- `src/features/backup/ui/*`

**Design doc:** `PHASE_6/phase_6_by_claude.md` — read this first so you understand the intent before judging the code.

**Specific risks to probe — in priority order:**

1. **Data integrity** — can a round-trip (export → wipe → import) lose or corrupt:
   - JSON-mode columns (`taxonomy`, `sessionIds`, `marks`, `ranges`, `recentFileIds`)?
   - Foreign-key ordering on insert (chat_messages → chats, files → projects)?
   - The FK constraint `files.projectId → projects.id { onDelete: cascade }` — if we wipe-then-restore, does order matter?
2. **Vector fidelity** — base64 round-trip of a 384-dim `Float32Array`:
   - Check `arrayBufferToBase64` / `base64ToArrayBuffer` in `codecs.ts`. Specifically confirm byte-alignment on the tail padding (1 or 2 extra bytes) and that `=` padding characters are handled on decode.
   - Post-import, `sqlite-vec` expects a specific blob layout. Does `vectorStore.upsert()` still normalize correctly after restore, or does the pre-normalized (L2-unit) vector get double-normalized?
3. **sqlite-vec and transactions** — the import uses a Drizzle transaction for row data, then inserts vectors **outside** the transaction. Is this the right call? If the vector loop fails mid-way, the row data is already committed but vectors are partial — should we re-trigger `ensureEmbedded` on missing vectors at next app boot, or do we need a "vectors_pending" retry queue?
4. **FTS5 interaction** — `concepts` has INSERT/UPDATE/DELETE triggers keeping `concepts_fts` in sync. On wipe-then-restore, do the triggers fire correctly across the delete→insert cycle, or could we end up with stale/duplicate FTS rows?
5. **Secure-store handling** — the archive contains only provider *names* (`["openrouter", "siliconflow"]`), not the actual API keys. Is the "user must re-enter keys" UX clear enough? Any scenario where a user loses access to their data because they can't recover the key?
6. **Schema-version forward-compat** — the `metadata.json` `schemaVersion` field is currently always 2. If we bump to 3 in a future release, then a user on v3 imports a v2 backup, the current code has a no-op migrator placeholder. Is the hook correctly positioned for future schema evolution, or will we end up monkey-patching around it?
7. **Memory safety on large datasets** — `export.ts` does `JSZip.generateAsync({ type: 'base64' })` which holds the full archive in memory. At 10k concepts with vectors (~15MB of base64 vector data + NDJSON) that's still fine, but call out the ceiling above which we'd need a streaming zip approach.
8. **Error recovery** — what happens if:
   - User cancels the DocumentPicker mid-flow?
   - The picked file is not a valid zip?
   - The zip is valid but `metadata.json` is missing?
   - `metadata.formatVersion > FORMAT_VERSION`?
   - Partial NDJSON file (truncated at a newline)?

### 2. Clear-all-data flow

**File:** `src/features/backup/clear.ts` + `ui/ConfirmClearModal.tsx`

- FK delete order — any table I missed that should be deleted before its parent?
- The explicit `DELETE FROM concepts_fts` after the concepts wipe — necessary belt-and-braces or redundant with the AFTER DELETE trigger?
- The double-confirm UX (typed `DELETE` + optional "wipe API keys" checkbox) — is there a cleaner pattern you've seen in production apps?
- Should clear-all also invalidate all `@tanstack/react-query` caches? (The screens will re-fetch and see empty state, but a stale cache render could flash wrong counts.)

### 3. Empty states

- Every screen under `app/` should have a graceful empty state. Spot-check that nothing renders a blank white rectangle on first launch.
- Copy consistency — same voice across screens?
- Do any empty states point to a CTA that currently doesn't exist? (Broken link / no-op button.)

### 4. Design templates

**Files:** `design/ASSETS.md`, `design/THEME_SPECS.md`

- Are the PNG dimension specs accurate for current Android adaptive icon + iOS icon + Expo splash requirements (as of 2026-04)?
- Safe-zone dimensions — sanity-check against Android 13+ themed icon guidelines.
- Is `THEME_SPECS.md` structured such that it could reasonably drive a codegen step later, or is it too prose-heavy?

### 5. Regressions

The Phase 6 commit touches `app/settings.tsx`. Confirm:

- API-key save / clear still works
- Model config dropdowns still persist
- Re-embed button still works
- The new "Data" section doesn't break keyboard handling or the `ScrollView` (`keyboardShouldPersistTaps="handled"`)

### 6. Cross-cutting

- **TypeScript strictness** — does `npx tsc --noEmit` pass with `exactOptionalPropertyTypes: true`? Phase 6's new code MUST respect the existing strictness bar.
- **Lint** — `npm run lint` green?
- **Tests** — `npm test` green? Are the new backup tests exhaustive enough, or are there edge cases the tests miss?
- **Naming** — consistent with existing conventions (barrel exports via `index.ts`, `DbOrTx` parameter name, `makeXStore` factory pattern)?

---

## What NOT to review

- Phases 1–5 code has already been reviewed and shipped. Don't re-audit unless you hit a call site you believe is wrong from Phase 6's perspective.
- The architecture consolidation work (commits for "ports/adapters cleanup"). Done.
- The scaling hardening (Drizzle tx, crypto uid, FTS5 hot/cold). Done and reviewed by Gemini.

---

## Output format we want back

For each finding:

```
[SEV: critical | high | medium | low | nit]
File: path/to/file.ts:123
Issue: one-line summary
Why it matters: 1-2 sentences on blast radius
Suggested fix: concrete diff or actionable paragraph
```

Then a top-level verdict:

```
VERDICT: [ship | block | conditional]
Rationale: …
Must-fix before v1.0: [list of critical/high items]
Nice-to-have before v1.0: [list of medium items]
Can ship with: [list of low/nits]
```

Be honest. If Phase 6 is not ready, say so. We have time to fix; we do not have time to re-ship v1.0.1 because we glossed over a data-corruption path.

---

## House rules you should know

- **User prefers one bundled commit per phase**, presented as a single bash copy-paste block for VS Code terminal (important for their workflow).
- **Don't rewrite working code** — if it's correct and consistent, leave it. Comments-only suggestions are welcome.
- **Flag hypothetical over-engineering** — the user dislikes speculative abstractions. Call out any `// TODO: future flexibility` cruft we added.
- **Keep feedback actionable** — if you identify a risk, tell us exactly which line to change. We do not want philosophical reviews.

---

## Thanks

Claude + the user
