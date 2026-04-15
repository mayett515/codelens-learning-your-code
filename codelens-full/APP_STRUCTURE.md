# CodeLens App Structure and Function Map

This document explains how the app is organized, how data flows through it, and where key functions live.

For the full markdown documentation map, see `MAIN.md`.

## 1) High-level architecture

CodeLens is a Capacitor Android app with a plain HTML/CSS/JavaScript frontend (no React/Vue framework).

- Native shell: Android + Capacitor
- Frontend runtime: one HTML page, multiple JS modules loaded in order
- State: in-memory global `state` object, persisted to local storage
- API keys:
  - Native path (preferred on Android): `window.NativeSecureStore` bridge to Android SharedPreferences
  - Fallback path: browser localStorage
- Learning vectors (semantic memory):
  - Native path (preferred on Android): `window.ObjectBoxBridge` bridge (upsert/match/delete)
  - JS metadata path: `state.learningHub.embeddings` (metadata only, no raw vectors)
  - JS vector store path: localStorage key `codelens_learning_vectors_v1` managed by `17-learning-embeddings.js`

## 2) Repository map

Main folders/files:

- `android/`
  - Native Android project (Capacitor wrapper).
  - Important Java files:
    - `android/app/src/main/java/com/codelens/app/MainActivity.java`
    - `android/app/src/main/java/com/codelens/app/NativeSecureStoreBridge.java`
    - `android/app/src/main/java/com/codelens/app/ObjectBoxBridge.java`
- `android/app/src/main/assets/public/`
  - Runtime web app shipped inside Android.
  - Main frontend files:
    - `index.html`
    - `styles/app.css`
    - `scripts/01-state.js` ... `scripts/17-learning-embeddings.js`
- `www/`
  - Web assets mirror (also contains architecture notes).
  - In practice, `android/app/src/main/assets/public` is the critical runtime copy for Android.
- `package.json`
  - Minimal Capacitor dependencies.

## 3) Frontend composition model

The frontend is modular but global-scope based:

- Each script defines top-level functions on `window` scope.
- Scripts depend on each other by load order.
- `index.html` loads scripts in numeric sequence:
  - `01-state.js`
  - `02-init.js`
  - ...
  - `16-learning.js`
  - `17-learning-embeddings.js`
  - `15-init-2.js` (calls `init();`)

Why this matters:

- If you move a function to another file, load order can break references.
- Refactors should preserve script order or convert to an explicit module system.

## 4) Startup and boot sequence

Boot path:

1. `15-init-2.js` calls `init()`.
2. `init()` (`02-init.js`) performs:
   - icon initialization
   - API key load
   - persisted state load
   - state normalization (`ensureStateShape()`)
   - first render of screens/lists
   - event listener wiring
3. Global delegated click handler listens for `[data-action]` and dispatches to `runDelegatedAction()`.

## 5) State model (single source of truth)

The global `state` object is initialized in `01-state.js`.

Core fields:

- `projects[]`
- `gems[]`
- `folders[]`
- `bookmarks[]`
- `generalChats[]`
- `chatConfig` (provider/model by scope)
- `currentProject`, `currentFile`, `currentChat`
- `currentGeneralFolder`
- `currentAvatar`
- `learningHub`
  - `sessions[]`, `concepts[]`, `links[]`
  - `embeddings{ conceptId -> { api, model, signature, updatedAt, nativeSyncedAt, nativeSignature } }`
  - `graphMode`, `graphZoom`
  - `reviewChats[]`
  - `activeReviewChatId`, `activeConceptId`
- `referenceView` (temporary read-only memory session jump context)

Persistence strategy:

- App state: localStorage key `codelens_state_v2`
- API keys:
  - preferred: native bridge (`NativeSecureStore`)
  - fallback: localStorage key `codelens_api_keys_v1`
- Learning vectors:
  - preferred: native bridge (`ObjectBoxBridge`) in Android SharedPreferences-backed store
  - metadata cache: `state.learningHub.embeddings` in `codelens_state_v2`
  - raw vector cache: `codelens_learning_vectors_v1` (separate localStorage key, debounced writes)

Normalization path:

- `ensureStateShape()` repairs legacy/missing fields and keeps structures valid.

## 6) Screen and modal map

Defined in `index.html` as `.screen` sections:

- `home-screen`
- `project-screen`
- `chat-screen` (section chat)
- `general-chat-screen`
- `learning-screen`
- `learning-chat-screen` (Learner concept review chat)
- `gems-screen`
- `bookmarks-screen`
- `folders-screen`
- `recent-chats-screen`
- `settings-screen`

Important modals:

- import GitHub
- paste code
- create gem
- create folder
- save snippet
- bubble options
- learning concept modal
- avatar picker
- sections modal
- file picker
- project actions

Navigation control:

- `showScreen(screenId)` in `03-navigation.js`
- `showModal(modalId)` / `hideModal(modalId)`
- `showToast(message)`

## 7) Event handling model

Primary interaction model:

- Buttons/elements carry `data-action="..."`.
- One delegated click listener (in `02-init.js`) captures clicks and routes to `runDelegatedAction()`.
- This central action switch is the command bus for most UI behavior.

Recent improvement:

- Action target resolution is resilient (`findDelegatedActionElement`) so SVG/internal nested nodes still trigger actions reliably.

## 8) Core feature flows

### A) Project import and code viewing

Owned by `04-projects.js`:

- `importFromGitHub()` handles:
  - repository URL import
  - single raw file URL import
  - GitHub API traversal and file fetch
- Code view supports:
  - lightweight syntax highlighting
  - virtualized line rendering for performance
  - color-based line marking
  - file picker with search over paths and content
  - per-project recent files tracking

### B) Section chats and general chats

- Section chat flow:
  - `05-sections-chats.js`: open marked section chat, render recent chats
  - `06-chat-ui.js`: message rendering and `sendMessage()`
- General chat flow:
  - `07-general-chat.js`: `sendGeneralMessage()`, renderer
- Both chat paths:
  - build history
  - append system prompts (gem, memory context)
  - call `callAI()`
  - render AI response + metadata

### C) AI queue and retry system

Owned by `12-ai-api.js`.

Responsibilities:

- request queueing (`pendingApiRequests`)
- cooldown and provider min-delay scheduling
- retry with backoff + jitter
- provider failover handling for unavailable models
- per-provider request execution:
  - `callOpenRouter()`
  - `callSiliconFlow()`
- centralized entrypoints:
  - `callAI(prompt, options)`
  - `requestJsonFromApi(...)`

### D) Learning hub and memory graph

Owned by:
- `16-learning.js` (sessions, taxonomy capture, graph, review chat)
- `17-learning-embeddings.js` (embedding lifecycle, vector persistence, native bridge calls)

Core parts:

- chat-to-learning capture:
  - `captureCurrentChatLearning()` (whole chat summary via AI)
  - `saveSelectedBubbleAsLearning()` (single bubble)
- learning card taxonomy per concept:
  - `title`
  - `summary`
  - `coreConcept` (language-agnostic)
  - `architecturalPattern` (nullable)
  - `programmingParadigm`
  - `languageSyntax[]`
  - `keywords[]`
- concept/session storage:
  - `addConceptToLearningSession()`
  - `addSnippetToLearningSession()`
- local semantic memory retrieval:
  - cloud embeddings fetched on-demand (`getBestEmbeddingForText`)
  - vectors synced to native bridge via JS interfaces (implemented in `17-learning-embeddings.js`):
    - `upsertEmbedding(payload)`
    - `getTopMatches(payload)`
    - `deleteEmbedding(payload)`
  - `learningHub.embeddings` stores metadata only
  - raw vectors live in a separate vector store key (`codelens_learning_vectors_v1`)
  - pull ranking blends lexical + cosine similarity (native bridge first, JS fallback)
- derived graph data:
  - `refreshLearningDerivedData()`
  - `calculateLearningLinks()`
- UI:
  - Today sessions
  - Concept explorer
  - Knowledge graph
  - Session snippets
- learner review chat:
  - `startLearningReviewChatFromConcept()`
  - `sendLearningReviewMessage()`
  - `buildLearningReviewSystemPrompts()`

Memory/session jump mode:

- `openLearningSessionById()` enters read-only reference mode
- `isReferenceReadOnlyMode()` gates writes
- `exitLearningSessionReference()` restores previous navigation context

Graph interaction:

- Mode controls: connections/recency/source
- Pan/zoom support:
  - `getLearningGraphZoom()`
  - `setLearningGraphZoom()`
  - pannable viewport with mobile pinch-zoom gestures

## 9) Gems, avatars, snippets, bookmarks, settings

- Gems (`08-gems.js`)
  - prompt templates and active gem behavior
  - includes default Learner gem bootstrap (`ensureLearnerGem()`)
- Avatars (`11-avatars.js`)
  - persona selection and avatar-specific prompt injection
- Snippet folders (`09-folders-snippets.js`)
  - save and browse message snippets
- Bookmarks (`10-bookmarks.js`)
  - filter and render bookmarked messages
- Settings (`13-settings.js`)
  - provider/model selection
  - UI controls all three scopes: `section` (section chat row), `general` (general chat row), `learning` (settings page — "Learning Model (JSON Extraction / Review)")
  - `syncAllChatModelControls()` iterates `CHAT_SCOPES`, so adding a scope only requires a new selector pair in HTML + `getChatSelectorElements()` branch
  - API key management UI
  - color naming
- Backup (`14-backup.js`)
  - export/import/clear app data
  - note: raw vectors are now outside `codelens_state_v2`; include `codelens_learning_vectors_v1` if you need full-memory backups
  - on `clearAllData()` / `importBackup()`: calls `clearAllLearningVectors()` (drops the vector store + native rows) and `resetLearningEmbeddingSyncFlags()` (clears `nativeSyncedAt` / `nativeSignature` on imported metadata so the native bridge actually gets re-populated)

## 10) Native Android bridge details

`MainActivity.java`:

- Registers `NativeSecureStoreBridge` as JS interface `NativeSecureStore`.
- Registers `ObjectBoxBridge` as JS interface `ObjectBoxBridge`.

`NativeSecureStoreBridge.java`:

- `getApiKeys()`
- `setApiKeys(json)`
- `clearApiKeys()`

`ObjectBoxBridge.java`:

- `upsertEmbedding(payloadJson)`:
  - payload: `{ id, vector[], model, api, signature, updatedAt }`
- `getTopMatches(payloadJson)`:
  - payload: `{ vector[], ids[], limit }`
  - response: `{ ok, matches: [{ id, score, cosine }] }`
- `deleteEmbedding(payloadJson)`:
  - payload: `{ id }`

Storage backend:

- Android `SharedPreferences` file `codelens_secure_store`, key `api_keys_json`.
- Android `SharedPreferences` file `codelens_learning_vectors`:
  - current format: per-id rows under `vec.<id>`
  - legacy migration: old `embeddings_json` blob is auto-migrated on first load

## 11) Full function index (by script)

This is the current function map for quick navigation.

### `scripts/01-state.js`

`sanitizeApiKeys`, `getApiKeysSnapshot`, `getApiKey`, `setApiKeys`, `setApiKey`, `persistApiKeysToStorage`, `loadApiKeysFromStorage`, `clearStoredApiKeys`, `migrateLegacyApiKeys`, `sanitizePersistedState`, `getPersistedStateSnapshot`, `getProviderModelOptions`, `getDefaultModelForProvider`, `getDefaultModelForProviderInScope`, `ensureStateShape`, `touchProjectRecentFile`, `getProjectRecentFiles`, `getChatPreviewText`, `parseSectionMeta`, `buildRecentChats`, `touchSectionChatActivity`, `touchGeneralChatActivity`, `getChatConfig`, `getChatProvider`, `getChatModel`, `setChatProvider`, `setChatModel`, `uiIcon`, `iconWithText`, `normalizeFaceKey`, `getFaceIconName`, `renderFaceGlyph`, `getDefaultAvatars`

### `scripts/02-init.js`

`init`, `applyKitIcons`, `loadState`, `flushStateSave`, `saveState`, `invalidateSectionsCache`, `getCurrentHighlights`, `getCodeViewerElements`, `getSelectionClassForLine`, `applyLineClasses`, `detectLanguageFromFileName`, `detectLanguageFromHint`, `getTokenClass`, `highlightWithRegex`, `highlightCodeLine`, `getHighlightedLineHTML`, `renderCodeLineElement`, `renderVisibleCodeLines`, `scheduleRenderVisibleCodeLines`, `refreshVisibleLineClasses`, `updateRenderedLine`, `updateRenderedRange`, `requestFullCodeRender`, `setupEventListeners`, `getDatasetNumber`, `runDelegatedAction`, `handleDelegatedActionClick`, `findDelegatedActionElement`

### `scripts/03-navigation.js`

`showScreen`, `showModal`, `hideModal`, `showToast`

### `scripts/04-projects.js`

`legacyRenderProjectsOld`, `handleProjectTap`, `startProjectLongPress`, `cancelProjectLongPress`, `showProjectActionMenu`, `cancelProjectDelete`, `deleteSelectedProject`, `createFromPaste`, `setImportStatus`, `importFromGitHub`, `openProject`, `renderFileTabs`, `renderProjectRecentFiles`, `normalizeFilePath`, `buildFilePickerTree`, `legacyRenderFilePickerNodeOld`, `getFileSearchSnippet`, `renderFilePickerSearchResults`, `renderFilePicker`, `showFilePicker`, `toggleFilePickerFolder`, `selectFileFromPicker`, `switchFile`, `renderCode`, `clearSelectionState`, `getSelectedRange`, `updateSelectionStatus`, `toggleSelectionMode`, `clearSelection`, `applySelectionToCurrentColor`, `handleLineClick`, `toggleLine`, `selectColor`, `escapeHtml`, `renderProjects`, `bindProjectItemGestures`, `renderFilePickerNode`

### `scripts/05-sections-chats.js`

`getSectionsForFile`, `getSections`, `getAllSections`, `getSectionPreview`, `showMarkedSections`, `openSectionChat`, `openSectionChatById`, `autoExplain`, `goBackFromChat`, `formatRecentTime`, `decodeRecentData`, `renderRecentChatsInto`, `renderHomeRecentChatsPreview`, `renderRecentChatsScreen`, `openRecentChat`

### `scripts/06-chat-ui.js`

`getChatBubbleProviderLabel`, `renderChatBubbleMeta`, `buildAIHistoryFromMessages`, `decodeSessionRefMarker`, `renderSessionReferenceTag`, `renderChatMessages`, `getChatCodeLanguage`, `renderChatCodeBlock`, `applyInlineFormatting`, `formatTextSegment`, `formatMessage`, `showBubbleOptions`, `getCurrentMessages`, `toggleBookmark`, `sendMessage`

### `scripts/07-general-chat.js`

`renderGeneralGemSelector`, `sendGeneralMessage`, `renderGeneralChatMessages`

### `scripts/08-gems.js`

`getDefaultLearnerGem`, `isLearnerGem`, `ensureLearnerGem`, `getLearnerGemPrompt`, `legacyRenderGemsOld`, `legacyRenderGemSelectorOld`, `legacyCreateGemOld`, `toggleGemActive`, `setActiveGem`, `clearActiveGem`, `renderGems`, `renderGemSelector`, `createGem`

### `scripts/09-folders-snippets.js`

`legacyRenderFoldersOld`, `createFolder`, `openFolder`, `legacySaveToFolderOld`, `saveSnippetToFolder`, `renderFolders`, `saveToFolder`

### `scripts/10-bookmarks.js`

`renderBookmarks`, `filterBookmarks`, `showChatBookmarks`, `legacyRenderBookmarksOld`

### `scripts/11-avatars.js`

`unusedShowAvatarPickerOld`, `unusedSelectAvatarOld`, `showProjectAvatarChat`, `showProjectChats`, `showGeneralChatFolders`, `showAvatarPicker`, `selectAvatar`

### `scripts/12-ai-api.js`

`sleep`, `getApiPolicy`, `parseRetryAfterMs`, `extractErrorMessage`, `isRetriableStatus`, `isLikelyRetriableMessage`, `isLikelyHardLimitMessage`, `createApiError`, `parseJSONResponse`, `fetchWithTimeout`, `normalizeAIContent`, `getProviderDisplayName`, `normalizeHistoryMessages`, `buildApiMessages`, `getApiKeyMissingMessage`, `normalizeAIResultPayload`, `getRemainingDelayMs`, `waitWithCancelableCooldown`, `isAIInputBlocked`, `updateAIQueueUI`, `cancelPendingRequests`, `computeRetryDelayMs`, `shouldRetryError`, `withApiRetries`, `executeAIRequest`, `processAIQueue`, `callAI`, `requestJsonFromApi`, `isModelUnavailableError`, `getOpenRouterModelFallbackList`, `getSiliconFlowModelFallbackList`, `persistResolvedModel`, `getRequestMessages`, `callOpenRouter`, `callSiliconFlow`

### `scripts/13-settings.js`

`getProviderLabel`, `normalizeApiSelectionCards`, `fillProviderSelect`, `fillModelSelect`, `ensureSelectValue`, `getChatSelectorElements`, `syncChatModelControls`, `syncAllChatModelControls`, `syncSettingsModelControls`, `loadSettings`, `saveSettings`, `saveColorNames`, `setActiveAPI`, `updateAPIButtons`, `handleChatProviderChange`, `handleChatModelChange`

### `scripts/14-backup.js`

`exportBackup`, `importBackup`, `clearAllData`

### `scripts/15-init-2.js`

Boot call only: `init();`

### `scripts/16-learning.js`

`getTodayDateKey`, `toDateKey`, `cleanLearningText`, `truncateLearningText`, `createLearningId`, `deepCloneSimple`, `tokenizeLearningText`, `uniqueLearningStrings`, `getCurrentChatContextDescriptor`, `getLearningSessionById`, `getLearningSessionByKey`, `getOrCreateLearningSessionForContext`, `extractLearningKeywords`, `collectLearningConceptTokens`, `computeLearningTokenJaccard`, `getLearningConceptSimilarity`, `chooseMoreSpecificLearningPrinciple`, `findBestLearningConceptMatch`, `addConceptToLearningSession`, `addSnippetToLearningSession`, `deriveLearningConceptRecords`, `calculateLearningLinks`, `refreshLearningDerivedData`, `getSortedLearningSessions`, `renderLearningSessionsInto`, `renderLearningSnippets`, `decodeLearningData`, `getLearningReviewChats`, `getLearningReviewChatById`, `getLearningConceptById`, `getLatestLearningReviewChatForConcept`, `getLearningConceptRecordsSorted`, `clampLearning01`, `getConceptReviewStats`, `getConceptStrengthScore`, `getLearningStrengthPalette`, `renderLearningConceptExplorer`, `getRelatedConceptTitles`, `openLearningConceptById`, `getLearningSnippetsForConcept`, `buildLearningReviewStarterMessage`, `createLearningReviewChat`, `startLearningReviewChatFromConcept`, `openLearningReviewChatById`, `getActiveLearningReviewChat`, `buildLearningReviewSystemPrompts`, `renderLearningReviewChatScreen`, `sendLearningReviewMessage`, `normalizeLearningGraphMode`, `getLearningGraphMode`, `getLearningGraphModeMeta`, `clampLearningGraphZoom`, `getLearningGraphZoom`, `setLearningGraphZoom`, `setLearningGraphMode`, `getConceptAgeDays`, `getLearningGraphNodeVisual`, `buildLearningGraphData`, `renderLearningGraph`, `renderLearningHomePreview`, `renderLearningScreen`, `scoreLearningSessionForQuery`, `getRelevantLearningSessions`, `getLearningSystemPromptForQuery`, `tryParseLearningSummaryJson`, `buildFallbackLearningSummary`, `normalizeLearningSummary`, `findMessageByQuote`, `captureCurrentChatLearning`, `saveSelectedBubbleAsLearning`, `captureNavigationContext`, `restoreNavigationContext`, `decodeSessionRefData`, `openLearningSessionById`, `getReferenceSession`, `isReferenceReadOnlyMode`, `applyReferenceReadOnlyUI`, `exitLearningSessionReference`

### `scripts/17-learning-embeddings.js`

`getLearningEmbeddingsStore`, `buildLearningConceptSignature`, `buildLearningConceptEmbeddingText`, `pruneLearningEmbeddingsToKnownConcepts`, `getLearningCosineSimilarity`, `getNativeVectorBridge`, `callNativeVectorBridge`, `getTopMatches`, `upsertEmbedding`, `deleteEmbedding`, `ensureNativeEmbeddingSynced`, `getLearningSemanticScoresFromNativeBridge`, `computeLearningSemanticScoresLocally`, `getLearningSemanticScoreMap`, `embedTextForLearning`, `ensureLearningEmbeddingForConcept`, `syncLearningConceptEmbeddings`, `loadLearningVectorsFromStorage`, `saveLearningVectorsSoon`, `getLearningVector`, `setLearningVector`, `deleteLearningVector`, `migrateInlineLearningVectors`

## 12) Where to edit common requests

Use this as a fast "where do I change X?" guide:

- Project import behavior:
  - `scripts/04-projects.js` (`importFromGitHub`, parsing helpers)
- File search in project picker:
  - `scripts/04-projects.js` (`renderFilePickerSearchResults`, `getFileSearchSnippet`)
- Recent files per project:
  - `scripts/01-state.js` (`touchProjectRecentFile`, `getProjectRecentFiles`)
  - `scripts/04-projects.js` (`renderProjectRecentFiles`)
- Recent chats UI:
  - `scripts/05-sections-chats.js` (`renderRecentChatsInto`, `renderRecentChatsScreen`)
- AI queue/retry/provider behavior:
  - `scripts/12-ai-api.js`
- Learning capture and concept quality:
  - `scripts/16-learning.js` (`captureCurrentChatLearning`, concept matching/linking)
- Learning vectors / semantic retrieval / native bridge sync:
  - `scripts/17-learning-embeddings.js`
- Knowledge graph UX:
  - `scripts/16-learning.js` + `styles/app.css`
  - Cytoscape.js + `cytoscape-cxtmenu` vendored at `www/vendor/cytoscape/` (offline-safe)
  - Touch-tuned cxtmenu: `taphold`/`cxttap`, viewport-adaptive radius, icon commands, finger-sized node targets
  - Expand/collapse toggle persisted at `state.learningHub.graphExpanded`
- Screen-level layout/labels:
  - `index.html` + `styles/app.css`

## 13) Practical maintenance notes

- The app is currently global-function based. Keep naming clear and avoid silent collisions.
- `ensureStateShape()` must be updated whenever persistent schema changes.
- If you add a new action button, wire a `data-action` case in `runDelegatedAction()`.
- For Android release consistency, keep `android/app/src/main/assets/public` and `www` aligned.

## 14) New UX/Navigation Pass (April 2026)

- Code interaction is now split into:
  - `View` mode: safe browsing, open marked chats, double-tap line explain.
  - `Mark` mode: section/range marking and color depth layering.
- Line-level mini chats:
  - Double-tap any code line in `View` mode.
  - Optional pin/point marker per line opens its own chat thread.
- Marker safety:
  - Eraser now requires deliberate confirmation (double tap / confirm for range).
- Project recents:
  - Recent files row keeps newest at the left and includes active file.
- Recent chats:
  - Home shows latest 5.
  - Full recent screen supports search + incremental load on scroll + absolute date.
- File picker search:
  - Toggle between `Path + Content` and `Filename Only`.
- Android back behavior:
  - Screen history stack + hardware back handling.
  - `initializeNavigationBackHandling()` (`03-navigation.js`) wires `popstate`, Capacitor `App.backButton`, and a duplicate-event guard. `showScreen()` syncs `history.state` on each forward transition.
- Learning capture:
  - `Save as Learning` now shows a concept preview modal before final save.
- Knowledge graph:
  - Two-finger pinch zoom on mobile graph viewport (no +/- buttons).
  - Cytoscape renderer on learning screen (fallback: SVG). Libraries vendored under `www/vendor/cytoscape/`.
  - `cytoscape-cxtmenu` radial node menu, tuned for touch (long-press open, icon+label commands, viewport-adaptive radius).
  - Bigger/Smaller toggle expands the graph panel; state persisted at `state.learningHub.graphExpanded`.
- Asset sync:
  - `npm run sync` (script at `codelens-full/scripts/sync-assets.js`) mirrors `www/` → `android/app/src/main/assets/public/`. `npm run sync:check` exits non-zero if the trees diverge. Do **not** copy files by hand.
