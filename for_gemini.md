# CodeLens-v2 — Briefing for Gemini (Third-Perspective Review)

Hi Gemini. The user is looking for an outside perspective on the direction of this project and on the work done in the most recent session. Below is a self-contained briefing so you can read, critique, and suggest what to prioritize next without having to crawl the repo first.

---

## 1. What CodeLens is

CodeLens-v2 is a **mobile (Android) coding companion** aimed at reading, understanding, and learning from source code on the go. It's the user's personal app — not a product shipped to others — but it's built carefully enough to be real software.

Core user-facing features:

- **Projects / Files / Sections.** You load code (paste or file import), the app splits it into sections, and you can mark sections, stamp them, add notes, and chat with an AI about any section.
- **Viewer vs Mark mode.** A deliberate split: viewing is safe, marking is a separate intentional mode so you don't accidentally destroy annotations while reading.
- **Section chats, general chat, learning chat.** Three distinct chat scopes, each with its own provider/model config.
- **Learning Hub.** Extracts *concepts* from code+chat (title, summary, coreConcept, architecturalPattern, programmingParadigm, languageSyntax, keywords), groups them into sessions, builds a knowledge graph with pinch-zoom, and supports review chats tied to stored concepts.
- **Semantic memory.** Concepts are embedded locally; searches blend lexical + cosine-similarity ranking. Embeddings are cached so repeat queries are free.
- **Recents, folders, snippets, gems, backup/export/import.** The normal housekeeping you'd expect.

---

## 2. Tech stack

- **Android shell:** native Java (not Kotlin). `MainActivity` + JS↔Java bridges. AGP 8.13.2, Java 17, minSdk 26, targetSdk 36.
- **Runtime wrapper:** Capacitor 5 (`@capacitor/android`, `@capacitor/core`).
- **UI layer:** plain HTML + CSS + vanilla JS modules loaded in numeric order (`01-state.js` … `17-learning-embeddings.js`, with `15-init-2.js` last calling `init()`). No React/Vue/Solid. Global-scope composition on purpose — keeps the WebView bundle tiny and debuggable.
- **State:** single `codelens_state_v2` localStorage blob with debounced save and an `ensureStateShape()` normalizer. Learning *vectors* now live in a separate `codelens_learning_vectors_v1` key (see §3).
- **Secure storage:** API keys via Android SharedPreferences, exposed to JS through a `NativeSecureStore` bridge (with localStorage fallback in dev).
- **Vector storage:** `ObjectBoxBridge` (named after the eventual real backend; currently backed by SharedPreferences with per-id rows + one-shot legacy-blob migration, and precomputed L2 norms for fast cosine).
- **AI providers:** OpenRouter + SiliconFlow. Queue with retry/backoff, model fallback, embedding support (BAAI/bge-m3, Qwen3-Embedding-8B, etc.).
- **Build:** Android Gradle. APK packaged from `codelens-full/android/`; web assets mirrored into `android/app/src/main/assets/public/` from `codelens-full/www/`. Both trees must stay semantically identical (MAIN.md §14).

---

## 3. What changed in the most recent session

Four architectural upgrades + one follow-up fix flagged by Codex. Full log lives in `whatclaudechanged.md` at the repo root.

### 3.1 Model lists + per-task routing
- Expanded `OPENROUTER_MODEL_OPTIONS` (6 → 14) and `SILICONFLOW_MODEL_OPTIONS` (5 → 11) in `01-state.js`. Added DeepSeek V3/R1/Coder, Qwen 2.5 Coder, Llama 3.3, Gemma 2, Nemotron, etc. Each entry carries `tags: ['code'|'general'|'cheap'|'free'|'learning'|'reason']`.
- Added a `learning` chat scope (in addition to `section` and `general`) with strong-JSON-capable defaults (DeepSeek chat on OpenRouter, DeepSeek-V2.5 on SiliconFlow).
- New `SCOPE_RECOMMENDED_MODELS` table + `getDefaultModelForProviderInScope(provider, scope)` helper. `ensureStateShape` iterates `CHAT_SCOPES`; setters only propagate to legacy top-level fields when `scope === 'section'`.
- Learning-capture and review chat now force `scope: 'learning'` regardless of the source chat's scope.

### 3.2 Extracted embeddings layer
- `16-learning.js` was 2624 lines. Pulled ~350 lines of embedding code out into a new `17-learning-embeddings.js` — lazy localStorage load + debounced save, native-bridge surface (`upsertEmbedding` / `getTopMatches` / `deleteEmbedding`), cosine similarity, concept embedding sync, query embedding LRU cache.
- `index.html` loads `17-learning-embeddings.js` between `16-learning.js` and `15-init-2.js`. Mirrored to the Android asset tree.

### 3.3 Vectors out of the state blob
- Vectors no longer live inside the main state blob. Dedicated key `codelens_learning_vectors_v1`.
- `migrateInlineLearningVectors()` runs during `ensureStateShape` to move legacy inline vectors into the new store exactly once.
- `getPersistedStateSnapshot()` defensively strips any `.vector` fields before export.

### 3.4 Native store rewrite (still SharedPreferences, contract-ready for ObjectBox)
- `ObjectBoxBridge.java` rewritten: per-id rows under prefix `vec.<id>` with short-key JSON (`{v, m, a, s, u}`) instead of a single `embeddings_json` blob that had to be rewritten on every upsert.
- One-shot `migrateLegacyBlobLocked()` fans the old blob into per-id rows then deletes the legacy key.
- `StoredEmbedding` caches L2 norm; new `cosineSimilarityWithCachedNorms` avoids √ per candidate. JS contract unchanged.

### 3.5 Codex-flagged follow-up: reset/import leak
- `clearAllData()` and `importBackup()` now call a new `clearAllLearningVectors()` helper in `17-learning-embeddings.js` that drops the localStorage key, clears the in-memory map + query cache + in-flight jobs, and issues `deleteEmbedding` to the native bridge for every known id.
- Without this, vectors from the previous install could ghost-match freshly-imported concepts that happened to share ids.

---

## 4. User's intent

The user wants:
1. A **third perspective** on whether the direction (per-scope model routing, vectors-as-first-class-storage, native-bridge contract sitting over a stub backend until a real ObjectBox swap) is sound.
2. An opinion on **what to prioritize next** among the open items in §5.
3. Calling out anything that looks like premature optimization, overengineering, or a footgun the session missed.

The user is the sole developer. Pragmatism > purity. The app is Android-only; iOS is not on the table.

---

## 5. Known open items (explicitly not done this session)

- **Real ObjectBox Gradle swap.** The Java bridge is contract-shaped for it, but the actual plugin + schema + migration from SharedPreferences rows to an ObjectBox box wasn't attempted because the build wasn't verifiable from the session environment.
- **Settings UI for the `learning` scope.** The data model and routing support it, but no dropdown has been added to let the user pick a learning-scope model from the UI yet.
- **Doc rewrite** across `MAIN.md`, `APP_STRUCTURE.md`, `LEARNING_NATIVE_BRIDGE.md` to reflect the split of 16-learning.js into 16+17 and the new vector storage key. Currently only `whatclaudechanged.md` captures it.
- **Vector inclusion in backup export.** Deliberately skipped — vectors can be rebuilt from concept text — but worth a decision either way.
- **No automated tests.** The project has zero test harness; all verification is manual. Worth considering whether any regression-prone piece (state shape migration, cosine math, scope routing) deserves a minimal test.

---

## 6. Where to look in the repo

- `codelens-full/MAIN.md` — doc index.
- `codelens-full/APP_STRUCTURE.md` — full function map (still reflects pre-split state; needs updating).
- `codelens-full/LEARNING_NATIVE_BRIDGE.md` — bridge contract.
- `codelens-full/www/scripts/` — canonical JS source. Mirrored into `codelens-full/android/app/src/main/assets/public/scripts/`.
- `codelens-full/android/app/src/main/java/com/codelens/app/` — `MainActivity`, `NativeSecureStore`, `ObjectBoxBridge`.
- `whatclaudechanged.md` (repo root) — detailed session log.

Thanks for taking a look. Blunt feedback welcome.
