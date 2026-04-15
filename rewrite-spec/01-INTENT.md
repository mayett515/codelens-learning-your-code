# What CodeLens Is

CodeLens is a **mobile-first learning tool for reading and understanding code on a phone**. The user imports a GitHub repo or pastes code, browses files, marks lines with colored highlights to track what they understand vs. what needs review, opens AI chats scoped to specific code sections or single lines, and over time builds a personal knowledge base of *concepts they have actually learned*.

The headline feature is the **learning hub**: when a chat reaches a useful insight, the user saves it as a "learning". The app extracts concepts, embeds them, and builds a knowledge graph. Future chats can semantically retrieve related concepts. The user can review, search, and explore their learning visually.

## Who It Is For

The user is a developer studying code on a phone — on the train, in bed, away from a laptop. They want the depth of an IDE-assisted code review session in a touch-first form factor. They are willing to invest time in marking and saving because the knowledge graph compounds.

## What Matters (in priority order)

1. **The mark/highlight system feels like a fluid IDE.** Long-press, range-select, color-code, depth-aware nesting. The user uses this constantly — every gesture must be precise on a phone.
2. **AI chats are scoped and saved.** Section chats, line chats, general chats, and learning review chats. Each has its own provider/model config. Chats persist and are searchable.
3. **The learning hub turns transient chats into a knowledge graph.** Saving a chat extracts concepts; concepts get embedded; the graph shows their relationships; semantic retrieval surfaces related concepts in new chats.
4. **Local-first, offline-capable.** No network = app still works (except AI calls). All vector search runs on-device. All vendored libs bundled.
5. **Touch-first interactions.** Pinch zoom on the graph. Taphold for context menus. Hardware back button works. Modals dismiss on outside tap. No interaction assumes a mouse.

## What This App Is NOT

- Not a code editor. Read-only view + marks. No syntax server, no LSP, no autocomplete.
- Not a note-taking app. Notes happen *through* AI chats, not as standalone documents.
- Not a sync service. Data is on-device. Backup/restore is a JSON export.
- Not a multi-user product. Single-user, single-device.

## The Resume Story This Rewrite Is Building

> "I built a local-first RAG learning app for mobile. On-device semantic search using SQLite + sqlite-vec via JSI, hexagonal adapter pattern so the vector store is swappable, hybrid retrieval (vector + recency + session-scope) in pure SQL, knowledge graph rendered with Cytoscape inside a WebView. TypeScript strict, Expo, no native code written by me beyond config."

Every architectural choice in `02-STACK.md` and `03-ARCHITECTURE.md` exists to make this story honest and demonstrable.
