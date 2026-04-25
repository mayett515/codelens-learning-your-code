# Legacy Java → RN Rewrite: Feature Gaps

What the Java version had that the RN rewrite lost or simplified.
Use this as a backlog post-v1.0. Sections 1–4 are AI/prompt gaps. Sections 5–10 are UI/UX/feature gaps.

---

## 1. Memory Injection into Section Chats (Dot Connector)

**Java:** Every section chat automatically pulled the 3 most relevant concepts from the user's memory vault and injected them into the system prompt. The AI was instructed to act as a "Dot Connector" — bridging the current code problem to things the user had previously learned.

Injected format per concept:
```json
{"title": "...", "core_concept": "...", "architectural_pattern": "...", "programming_paradigm": "...", "syntax": "...", "keywords": "tag1, tag2", "session_reference": "..."}
```

AI instruction: *"Eyy, this should look familiar..."* — proactively surfaces prior learning.

**RN:** No memory injection in section chats. Concepts only appear in the dedicated Learning chat, never in the main code chat.

**Impact:** This is why responses feel generic — the AI has no idea what the user already knows. Every chat starts cold.

---

## 2. Personas / Avatars / Gems System

**Java:** 5 built-in personas selectable per chat:

| Gem | System prompt |
|-----|--------------|
| Senior Dev | "15 years experience. Detailed, professional advice." |
| Teacher | "Patient teacher. Step by step with examples." |
| Debug Bot | "Debugging assistant. Focus on finding and fixing bugs." |
| Code Reviewer | "Point out issues and suggest improvements." |
| Quick Helper | "Quick, concise answers. No fluff, just solutions." |
| Learner Gem | "Patient learning coach. Short steps, practical examples, check for understanding." |

Users could also create custom Gems.

**RN:** Single static prompt per chat type (section / general / learning). No persona selection, no customization.

**Impact:** Responses always have the same tone regardless of what the user needs. Quick one-liner questions get essay responses; debug sessions don't feel like debug sessions.

---

## 3. Rich Learning Review Prompts (Code Snippets + Socratic Pattern)

**Java:** The learning chat system prompt included:
- Full concept metadata (title, summary, core concept, architectural pattern, paradigm, language/syntax)
- 5 most relevant related concepts with full taxonomy
- **3 actual code snippets from the user's past sessions** where this concept appeared
- Explicit Socratic dialogue pattern: "Use conversational bridge opener... State what is same conceptually and different in implementation... End with one practice step and check-understanding question"

**RN:** Learning prompt includes concept name + summary + related concept names only. No code snippets, no structured dialogue pattern.

**Impact:** Learning chat feels flat — no grounding in real code the user has seen before, no guided discovery.

---

## 4. Multi-Part System Prompt Composition

**Java:** The API call composed multiple system prompt layers:
1. Base app prompt ("You are the AI assistant inside CodeLens...")
2. Persona/gem prompt (optional)
3. Memory pull prompt (optional, from Dot Connector)
4. Concept-specific prompt (learning chats)

These stacked, allowing any combination.

**RN:** Single `buildSystemPrompt()` call per chat type. No layering, no runtime composition.

**Impact:** Not directly user-visible, but blocks implementing the above features cleanly.

---

## 5. What RN Actually Improved

- **Concept extraction** — RN uses a strict Zod schema with retry logic. Java's extraction was looser and less reliable.
- **Embedding architecture** — local-first ExecuTorch pipeline vs cloud-only in Java.
- **Vector memory bounds** — Hot/Cold tier GC. Java had no memory management for vectors.
- **Transaction safety** — Drizzle `db.transaction()` vs raw SQLite in Java.

---

## Priority Backlog (post-v1.0)

| # | Feature | Effort | Impact |
|---|---------|--------|--------|
| 1 | Memory injection in section chats (Dot Connector) | Medium | High — fixes generic response feel immediately |
| 2 | Quick Helper / Debug Bot / Code Reviewer persona toggle | Low | High — one system prompt swap |
| 3 | Code snippets in learning review prompts | Medium | Medium — needs snippet storage per concept |
| 4 | Learner Gem persona for learning chat | Low | Medium — just a better default prompt |
| 5 | Custom persona creation UI | High | Low for v1.0 |

**Start with #1 and #2** — they require only prompt changes, no new DB schema or UI, and will make responses noticeably better immediately.

---

## 5. Line-Level Mini Chats

**Java:** Double-tap any code line in View mode opened a dedicated chat scoped to that single line — separate from section chats, tracked via `lineIdx` + `fileIdx`.

**RN:** Tap opens mark mode only. No inline per-line chat entry point.

**Impact:** Users have to manually copy a line and paste it into a chat. High friction for quick questions.

---

## 6. Message Border Color + Bookmark System

**Java:** Any chat bubble could be tagged with one of 6 border colors (non-destructive, separate from marks). A dedicated Bookmarks screen collected tagged bubbles cross-chat.

**RN:** Bubble long-press only offers Save as Learning / Copy / Delete. No color tagging, no bookmark collection.

**Impact:** No way to flag important AI responses for later without saving them as concepts.

---

## 7. Session Reference Markers

**Java:** Messages could contain clickable session reference markers — tapping jumped the user to that learning session in read-only mode (`isReferenceReadOnlyMode`), then returned them to the chat.

**RN:** No cross-linking between chat messages and learning sessions.

**Impact:** Learning chat responses can't point back to the session where a concept originated.

---

## 8. Strength Visualization on Concepts

**Java:** Concept strength was a multi-signal score (review count 58%, user questions 26%, repetition signals 18%) with a dynamic color gradient (weak → mid → strong) rendered on concept cards.

**RN:** `strength` field exists in the DB schema but is not visually surfaced anywhere in the Learning Hub UI.

**Impact:** Users can't see which concepts are weak and need review.

---

## 9. Graph View Modes + Pinch Zoom

**Java:** Knowledge graph had 3 switchable view modes (connections / recency / source) and two-finger pinch zoom with a zoom % indicator.

**RN:** Graph exists (Cytoscape + cxtmenu vendored) but no view mode switching and no pinch zoom.

**Impact:** Graph is harder to navigate on a small screen without zoom.

---

## 10. File Picker: Folder Tree + Search Snippets

**Java:** File picker rendered a collapsible hierarchical folder tree with expand/collapse state. Search results showed content preview snippets for context.

**RN:** File picker is a flat sorted list with path + filename. No folder grouping, no content preview snippets in results.

**Impact:** Large repos are harder to navigate.

---

## 11. Learning Hub: Session Cards + Today Grouping

**Java:** Session list grouped sessions under a "Today" header. Each card showed: date, title, message count, concept count, and snippet count.

**RN:** Session list shows date + title only. No grouping, no counts.

**Impact:** Sessions feel interchangeable — no at-a-glance sense of what each session contains.

---

## 12. Concept Preview Modal

**Java:** Tapping a concept showed a read-only preview modal with full taxonomy (core concept, pattern, paradigm, syntax layer, keywords, related concepts) before entering review chat.

**RN:** Tapping a concept goes straight to learning chat. No preview.

**Impact:** No way to quickly read a concept's metadata without starting a chat.

---

## 13. Queue Status Bar

**Java:** A persistent status bar showed the live AI request queue — request counter and a cancel button while a request was in-flight.

**RN:** Spinner shows in the chat input area but no queue counter or cancel for in-flight requests.

**Impact:** Users can't cancel a slow request without killing the app.

---

## 14. Color Name Customization

**Java:** Each of the 5 marking colors had a user-editable name (e.g. rename "yellow" to "important" or "TODO").

**RN:** Colors are hardcoded labels. No renaming.

**Impact:** Minor, but reduces personalization.

---

## Updated Priority Backlog

| # | Feature | Effort | Impact |
|---|---------|--------|--------|
| 1 | Memory injection in section chats (Dot Connector) | Medium | High |
| 2 | Persona toggle (Quick Helper / Debug Bot / Reviewer) | Low | High |
| 3 | Strength visualization on concept cards | Low | High |
| 4 | Code snippets in learning review prompts | Medium | Medium |
| 5 | Line-level mini chat (double-tap) | Medium | Medium |
| 6 | Cancel in-flight request button | Low | Medium |
| 7 | Concept preview modal | Low | Medium |
| 8 | Session cards with counts + Today grouping | Low | Medium |
| 9 | Message bookmarks + border color tagging | Medium | Low |
| 10 | Graph pinch zoom + view mode switching | Medium | Low |
| 11 | File picker folder tree | High | Low |
| 12 | Learner Gem persona for learning chat | Low | Medium |
| 13 | Session reference markers in messages | High | Low |
| 14 | Color name customization | Low | Low |
