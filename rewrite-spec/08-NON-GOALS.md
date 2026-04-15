# Non-Goals

These features exist in the legacy app. **Do not port them in the rewrite**, at least not in v1. They were added because vanilla JS made them easy, not because they're load-bearing for the product.

If after shipping the lean rewrite the user actively wants any of these back, port them then. Until then, they are explicitly out of scope.

## Out for v1

- **Gems** — prompt template management. Defer. Hardcode 2-3 system prompts per scope in `domain/prompts.ts` instead.
- **Folders for general chats** — defer. General chats are a flat list ordered by `updatedAt`.
- **Avatars** — defer. No avatar selection on general chats.
- **Bookmarks screen** — defer. Mark colors already serve a similar purpose.
- **Snippets folders** — defer.
- **Recent chats screen with search + incremental load** — *partially defer*. Build the screen but skip the incremental loading optimization until there are >100 chats and it's actually slow. Use a basic `FlatList` with all chats; revisit if needed.
- **Color label customization** — defer. Hardcode the five labels: `Important`, `Understood`, `Review`, `Question`, `Complex`. Add settings UI for this in v2.
- **Backup encryption** — defer. v1 backup is plain JSON.
- **Multiple embedding models with auto-detection** — *partially defer*. Pick one default model, store the model name with each embedding. Don't build the auto-re-embed-on-model-change UI yet — log a warning and leave it.
- **Pinch-zoom on the code viewer** — defer. Code is rendered at one size. Marker UX is the priority.
- **Range erase across multiple lines** — defer. Erase one line at a time.
- **Reference view restore-prior-context** — defer. Reference view opens; back button just goes back via router.

## Out Forever (Even In v2+)

- **Cloud sync.** This is a single-device app. If multi-device sync ever makes sense it's a v3 conversation, not a v2 conversation.
- **Multi-user / accounts.** No login.
- **Real-time collaboration.**
- **A note-taking surface separate from chats.** Chats *are* the surface.
- **A code editor / write mode.** Read + mark only.
- **Plugin system.** Hardcode the providers. Do not abstract a "provider plugin" interface.
- **Telemetry / analytics.** No event tracking. Single-user app.

## Anti-Goals (Do Not Build These Patterns)

- **No "smart" auto-marking.** The user marks. AI does not mark on their behalf.
- **No auto-save of every chat as a learning.** The user explicitly chooses what becomes a learning.
- **No background AI work without user trigger.** Every AI call is user-initiated. Embedding sync after a save is the only exception.
- **No infinite-scroll feeds.** Lists paginate or virtualize, but no algorithmic timeline.
- **No animated splash screen, no onboarding flow, no tutorial overlay.** Empty states explain themselves.
