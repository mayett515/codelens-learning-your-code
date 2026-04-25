# CodeLens — Java vs RN Feature Comparison

## Java-Only Features (Missing in RN)

### Dot Connector (memory injection)
_High Impact · AI · Medium effort_

> Settings toggle: ON/OFF (default ON). When ON, user can also set how many concepts to inject — slider or input,
>   default 5, max ~20.
> 
>   Separate "Review Mode" button in chat header (not settings). Tap it to temporarily pull max concepts for that session
>   — deep study mode. Tap again to go back to normal.
> 
>   Search is free (sqlite-vec + FTS5, pure device math). Token cost only comes from what gets injected into the API call.
>    5 concepts ≈ 300-400 tokens. 20 concepts ≈ 1500-2000 tokens.
> review mode is not dot connector but you can click review mode whilst chatting so the response will be given in review mode. 
> Review Mode uses a similarity threshold, not a fixed count. Only concepts above ~0.65 similarity score get included,
>   up to max 20. If only 4 concepts are truly relevant, only 4 get injected — no noise from weak matches. Threshold could
>    be a hidden constant first, user-adjustable later.

### Persona / Gem system (5 built-in + custom)
_High Impact · AI · Low effort_

> yeah gems u have in the main menu dude. you can use in the chats.

### Learning chat: code snippets + Socratic pattern
_Medium Impact · AI_

> Low priority. Socratic pattern covered by Learner Gem persona. Code snippets less critical once Dot Connector injects
>   relevant concepts. Revisit after Dot Connector + Review Mode are shipped.

### Multi-part system prompt composition
_Medium Impact · AI · Low effort_

> Not a user feature — internal prerequisite for Dot Connector + personas working together. Build this when implementing
>    those, not standalone.

### Line-level mini chat (double-tap)
_Medium Impact · UX_

> Double-tap any line opens a mini chat scoped to that exact line. Chat is temporary by default — disappears when you
>   leave. "Save" button pins it: saved chats show a dot in the left gutter instead of a color mark. Dot is tappable to
>   reopen the pinned chat anytime. Different visual language from marks on purpose — marks = highlights, dots =
>   conversations.

### Message border color + bookmark system
_Low Impact · UX_

> Simple bookmark system per chat. Long-press any bubble → bookmark it → give it a name. Bookmark icon in chat header
>   opens a timeline view showing all bookmarks with visual spacing proportional to distance between them in the chat. Tap
>    any bookmark in the timeline to jump to it. No color picking — keep it simple
> Bubble color system (per project, independent from mark colors)
>   - Color picker in chat input — pick a color before writing, your sent bubbles get that border color
>   - Or long-press any existing bubble and assign a color retroactively
>   - Colors + their labels defined per project (e.g. red = "confused", yellow = "important", green = "understood")
>   - Bookmark icon in chat header shows all colored bubbles in that chat grouped by color
>   - Project view shows all colored bubbles across all chats filterable by color/label

### Session reference markers in messages
_Low Impact · UX · High effort_

> Already discussed — AI references past learning sessions with a clickable link. Tap opens that session read-only. High
>    effort, ship after the more impactful stuff.

### Concept strength visualization (color gradient)
_High Impact · UX · Low effort_

> Strength score already exists in DB (0-1), just not rendered. Short term: color gradient on concept cards in Learning Hub (red = weak, yellow = building, green = strong).
>
> Long term: dedicated Knowledge Health screen — visual overview of all concepts by strength. Click a concept to see: strength score, how many times reviewed, last reviewed date, which sessions it came from. Heatmap or grid view so you see your whole knowledge base at once and immediately spot gaps.
>
> This becomes the "spaced repetition without the flashcard UI" — you naturally gravitate toward weak concepts because they visually stand out.

### Graph: 3 view modes + pinch zoom
_Low Impact · UX_

> Current Cytoscape + WebView approach is a short-term hack. Long term replace with a proper React Native graph library (react-native-graph or d3 with react-native-svg). Pinch zoom and view modes (connections / recency / source) come naturally with a real native implementation. Don't patch the WebView version — wait for the full rewrite.

### File picker: folder tree + search snippets
_Low Impact · UX · High effort_

> Important feature. Flat list breaks on any real repo. Collapsible folder tree with expand/collapse state per project.
>   Search shows content preview snippets so you can tell which file you actually want without opening it. Folder
>   expand/collapse state persists per project — so if you always work in src/components you don't have to re-expand it
>   every time. Search should work across both path and content simultaneously with the snippet preview showing exactly
>   where the match is in the file.

### Session cards: counts + Today grouping
_Medium Impact · UX · Low effort_

> This whole screen needs a proper redesign, not just a quick fix. Currently too bare — date and title only tells you
>   nothing.
> 
>   Cards need: message count, concept count, session duration/length, which project/file it came from, strength of
>   concepts extracted from that session.
> 
>   Today grouping at the top, then by date descending. Maybe week groupings ("This Week", "Last Week", "April", etc).
> 
>   Concept cards on the Learning Hub also need a full rethink — strength visualization, taxonomy tags visible, last
>   reviewed date, how many sessions it appeared in, related concepts count. Should feel like a knowledge dashboard not a
>   plain list.
> 
>   The whole Learning section is the core product differentiator — it needs to be the most polished screen in the app.
>   Everything else is just a code viewer. This is what makes CodeLens actually unique.

### Concept preview modal (full taxonomy)
_Medium Impact · UX · Low effort_

> This is the root of the whole learning experience. Before you start a review chat you should fully see what you know
>   about this concept — not just the name but everything: core concept, pattern, paradigm, language, keywords, related
>   concepts, strength score, how many sessions it appeared in, last reviewed.
> 
>   The modal is also the bridge to the session cards — from here you should be able to see which sessions this concept
>   came from and tap into them read-only. And see related concepts and tap into those too.
> 
>   Basically this modal is the knowledge graph in text form. Done right it replaces half the need for the graph view
>   because you can navigate your entire knowledge base just by tapping through concept previews and their relationships.
> 
>   This + the session cards redesign + strength visualization are one unified feature, not three separate ones. Design
>   them together.

### Cancel in-flight AI request button
_Medium Impact · UX · Low effort_

> Simple but annoying without it. You send a message, the AI starts writing something useless, you can't stop it — you
>   just wait. Add an X button in the chat input area while a request is in flight. Kills the stream, clears the spinner.
>   One of those small things that makes the app feel polished vs half-finished.

### Mark color name customization
_Low Impact · UX · Low effort_

> Per-project color palette. Each project can have its own set of mark colors with custom names — not a global setting.
>   Add colors beyond the default 5, name them whatever makes sense for that codebase ("TODO", "confused", "architecture",
>    "review"). Edit the palette from within the project, not the main settings menu. Different projects have different
>   needs — a React project might need different labels than a Python one.

### Selected code preview in chat (scrollable)
_High Impact · UX · Medium effort_

> Java showed the selected code snippet directly inside the chat as a scrollable horizontal strip — you could see exactly what code you were asking about without going back to the file. RN sends the code as context to the AI but never shows it visually in the chat. Missing and annoying on any selection longer than one line.

### Adjust selection from within chat
_High Impact · UX · Medium effort_

> After opening a section chat you realize your selection was slightly off — too short, cut off a line above or below. Instead of going back to the file, closing the chat, re-selecting, re-opening: tap "Adjust" on the code preview bubble in chat. The bubble expands showing your selected code with 2 extra lines above and 2 below as handles. Drag the top/bottom handles to expand or shrink the selection. Tap "Confirm" — the selection updates in the file AND in the chat context. Tap "Cancel" to keep original. Saves a huge amount of friction on mobile where precise selection is hard.

### Syntax highlighting (VSCode dark theme)
_High Impact · UX · Medium effort_

> Current code viewer renders plain monospace text with no syntax highlighting. Java had proper VSCode-style dark theme highlighting — keywords in blue, strings in orange, comments in green etc. Makes reading code dramatically easier especially on a small screen. Should match VSCode dark+ theme exactly so it feels familiar to any developer.

### Long-press selection start indicator
_Medium Impact · UX · Low effort_

> When you long-press a line to start a range selection, there's no visual feedback showing where your finger landed — the start point is invisible until you tap the end. Should show a clear visual marker (highlight, pin, or pulsing dot) on the start line the moment you long-press so you always know where your selection began. Especially important on mobile where your finger covers the line you're pressing.

### Base app system prompt + app identity completely missing from RN
_High Impact · AI · Low effort_

> Java had a universal base prompt prepended to EVERY request regardless of chat type or model:
>
> ```
> You are the AI assistant inside the CodeLens mobile coding app.
> The user is editing code and markdown from a phone and wants fast, practical, reliable help.
> Always preserve continuity with previous chat turns and use the conversation history provided.
> Keep answers concise and actionable, and use markdown code fences when code is needed.
> ```
>
> **What RN currently has instead:**
>
> Section chat: `"You are a code tutor helping someone learn by reading code on their phone."`
> General chat: `"You are a helpful coding assistant. The user is learning programming by reading code on their phone."`
> Learning chat: `"You are a code tutor helping someone deepen their understanding of: [concept]."`
>
> **What's missing in every single RN prompt:**
> 1. The AI has no idea it's inside an app called CodeLens
> 2. No idea the user has a learning system, saved concepts, a knowledge graph
> 3. No "preserve continuity" instruction — model changes mid-chat can lose context
> 4. No instruction to use code fences consistently
> 5. No identity anchor — every request starts cold with no sense of what this app is for
>
> **Why this matters:** The Java base prompt meant every model, every chat type, every request always knew: what app it was in, what the user was doing, and that it must respect the full conversation history. Switching models in Java felt seamless. In RN it can feel like starting over.
>
> **Fix:** Add a `BASE_APP_SYSTEM_PROMPT` constant prepended to every request before the chat-specific prompt. One change, instant improvement across all chat types.

### Concept extraction prompt is weaker in RN — missing taxonomy fields + snippets
_High Impact · AI · Low effort_

> Java's extraction prompt was richer and produced better structured concepts. It extracted `snippets` (actual code quotes + reason why they matter) alongside concepts — these snippets fed back into learning review chats. RN strips snippets entirely.
>
> **Java extraction JSON shape:**
> ```json
> {
>   "session_title": "string",
>   "core_principles": [{
>     "title": "string",
>     "summary": "string",
>     "core_concept": "string",
>     "architectural_pattern": "string|null",
>     "programming_paradigm": "string",
>     "language_syntax": ["string"],
>     "keywords": ["string"]
>   }],
>   "snippets": [{ "quote": "string", "reason": "string" }]
> }
> ```
>
> **RN extracts:** name, summary, taxonomy (domain, subdomain, pattern, language, tags). That's it.
>
> **Missing fields vs Java:**
> - `core_concept` — the abstract CS mechanism behind the concept (e.g. "event loop", "closure", "immutability")
> - `architectural_pattern` — e.g. "Observer", "Repository", "Facade" — null if not applicable
> - `programming_paradigm` — e.g. "functional", "reactive", "OOP"
> - `language_syntax` — concrete syntax features used (e.g. ["async/await", "destructuring"])
> - `snippets` — actual code quotes from the session + why they matter
>
> **Why it matters:** The Dot Connector, the concept preview modal, the learning review prompt — all of them get dramatically better when the concept has a real `core_concept` and `architectural_pattern`. Right now the Dot Connector would only match on surface-level tags. With proper taxonomy it matches on the actual CS mechanism — much smarter connections.
>
> The `snippets` are also the missing piece for learning review chats — without them the AI has no real code from the user's sessions to reference.

### Save as Learning modal — concept card preview missing
_High Impact · UX · Medium effort_

> **What RN currently shows in the Save as Learning modal:**
> - Editable title
> - Editable snippet text box
> - Concept chips (just the name) with a 2-line summary below each
> - Merge suggestion chips if a similar concept exists
>
> **What Java showed:**
> - A full preview of what the concept card would look like in the Learning Hub — with taxonomy tags, core concept label, architectural pattern, paradigm, language syntax badges, keywords — the full card exactly as it would appear after saving
> - You could see and edit all fields before committing
> - The preview made the save feel meaningful — you could see your knowledge graph growing in real time
>
> **What's missing in the RN modal:**
> - No card preview — you have no idea what the concept will look like after saving
> - No taxonomy fields visible — domain, subdomain, pattern, language all hidden
> - No `core_concept`, `architectural_pattern`, `programming_paradigm`, `language_syntax` fields at all (not extracted, not shown)
> - No `snippets` — the actual code quote that triggered the concept is not saved alongside it
> - No keywords displayed
>
> **Why this matters:** The Save as Learning moment is the most important moment in the whole app — it's when a user decides something is worth remembering. The modal should feel like building something, not filling out a form. A full card preview makes users feel like they're curating their knowledge graph. Right now it just feels like saving a note.
>
> **Fix needed:** Expand the extraction schema to include Java's missing fields, then render a proper concept card preview in the modal showing everything that will be saved.

### Dot Connector full prompt (for implementation reference)
_Reference only_

> Exact Java Dot Connector prompt template:
>
> ```
> You are the user's personal "Dot Connector" and coding mentor.
> Your job is to map the current problem/code to concepts from the user's own memory vault.
> Current scope context: [optional scope]
> Highly relevant Vault Pulls (abstract concept cards only, never raw past code):
> [top 3 matching concepts as JSON]
> Task:
> 1) Find the best conceptual match based on core_concept or architectural_pattern, not superficial syntax.
> 2) If there is a real match, start immediately with a memory bridge (example tone: "Eyy, this should look familiar...").
> 3) Explain via association: map old concept behavior to this new context directly.
> 4) If the pulls are genuinely irrelevant, do not force a connection. Say: "This looks like a genuinely new concept for our database. What does this remind you of?"
> If you reference one pull, include this exact token format once: [[SESSION_REF:<id>|<short title>]]
> Do not invent session IDs.
> ```
>
> The `[[SESSION_REF:...]]` token is how session reference markers got generated — the AI embedded them in responses and the app detected + rendered them as tappable links. Smart system.

## RN Improvements over Java

- **Concept extraction (strict Zod schema + retry)**
- **Local-first embeddings via ExecuTorch (offline)**
- **Hot/Cold vector tier — bounded memory (~7.5MB cap)**
- **Drizzle transactions — atomic writes, no data corruption**
- **Full backup/restore (.codelens archive with vectors)**
- **Multi-provider fallback engine (SiliconFlow / OpenRouter)**

## In Both Versions

- Code marking / range marking with depth
- GitHub repo import
- Section chat (code-scoped)
- General chat
- Save as Learning + concept extraction
- Learning Hub (concepts + sessions list)
- Knowledge graph (Cytoscape)
- Vector similarity search (RAG retrieval)
- Per-scope model config (section / general / learning)
- Recent files per project
- File picker with dual search modes
- Dark theme

### Read-only past session view — "flashback mode"
_Medium Impact · UX · Medium effort_

> When you open a past learning session or follow a session reference link from a chat, you're viewing something that already happened — you can't edit it, can't send messages, it's a memory. It should feel like one visually.
>
> **The look:**
> - Slightly desaturated color palette — not black and white, just muted. Like the difference between a present scene and a flashback in a film.
> - Subtle vignette or soft blur on the edges of the screen
> - Faint grain or noise texture overlay (very subtle, not distracting)
> - A soft banner at the top: "Viewing past session — [date]" in muted text, not a harsh warning bar
> - No input bar at the bottom — replaced by a soft "Return to chat" button
> - Bubble colors slightly faded versions of their normal selves
> - Maybe a very faint slow pulse animation on the background — barely perceptible, just enough to feel alive but distant
>
> **Why this matters:**
> It's not just an aesthetic choice. The visual difference immediately communicates "you are not here right now, you are remembering." No user will accidentally try to type in it. No confusion about whether this is their active chat. And it makes the act of reviewing past learning feel intentional and meaningful — like actually going back to revisit something important — rather than just opening a screen that looks identical to every other screen but happens to be disabled.
>
> The Java version had a read-only mode but it looked identical to the regular chat just without an input bar. The flashback visual treatment is a RN original idea — it would make CodeLens feel genuinely considered.

### Save as Learning — architectural redesign needed
_High Impact · Architecture · High effort_

> The Save as Learning modal and the concept extraction pipeline are one unified system that needs to be redesigned together. Right now they are two separate things bolted together. Here is what the architecture should look like:
>
> **Extraction schema needs to grow:**
> The current schema extracts name + summary + basic taxonomy. It needs to also extract:
> - `core_concept` — the abstract CS mechanism (e.g. "event loop", "closure", "immutability") — language-agnostic
> - `architectural_pattern` — e.g. "Observer", "Repository", "Facade" — null if not applicable
> - `programming_paradigm` — e.g. "functional", "reactive", "OOP"
> - `language_syntax` — concrete syntax features used (e.g. ["async/await", "destructuring"])
> - `keywords` — specific terms for search and Dot Connector matching
> - `snippets` — array of `{ quote, reason }` — actual code/text quotes from the session + why they matter
>
> These fields unlock everything else: smarter Dot Connector matching, richer learning review prompts, concept card previews, Knowledge Health screen.
>
> **The modal needs a full card preview:**
> After extraction, instead of showing chips + 2-line summaries, show a full render of each concept exactly as it will appear in the Learning Hub — with taxonomy badges, core concept label, architectural pattern, paradigm, language syntax, keywords, and the saved snippet. User can edit any field before saving. The preview makes saving feel like building your knowledge graph, not filling a form.
>
> **Snippets feed back into everything:**
> Saved snippets per concept → used in learning review prompts (AI has real code to reference) → used in Dot Connector (matching on actual code patterns not just tags) → shown in concept preview modal (full history of where this concept came from).
>
> This is the core data model upgrade. Everything downstream gets better once snippets and richer taxonomy exist.

### In-chat model switching with model info
_High Impact · UX · Medium effort_

> Currently model is set globally in Settings. No way to switch mid-chat or per-chat without leaving the screen.
>
> **What's needed:**
> - Model name shown in chat header — tap it to open the model picker
> - Each model row in the picker shows:
>   - Model name
>   - FREE or PAID badge — clearly visible, no ambiguity
>   - A "?" info button on each row — tap it to expand a brief one-paragraph description of what that model is good for (e.g. "Fast and cheap, great for quick questions and simple explanations", "Best reasoning, use for architecture decisions and complex debugging", "Strong at code generation and refactoring")
> - Currently active model highlighted
> - Switching mid-chat never loses context — base prompt + full history re-anchors the new model immediately
> - Per-chat override persists — next time you open that chat it remembers the model you picked
>
> **Model info source:** a static config file (e.g. `src/ai/models.ts`) with model ID, display name, description, free/paid flag. Easy to update when providers change their free tier without touching any other code.
>
> **Why it matters:** Different tasks need different models. Quick question → fast free model. Deep architecture discussion → best available. Right now you have to leave the chat, go to Settings, change it, come back. That kills flow completely.

## Post-v1.0 Priority Backlog

| # | Feature | Effort | Impact |
|---|---------|--------|--------|
| 1 | Memory injection in section chats (Dot Connector) | Medium | High |
| 2 | Persona toggle (Quick Helper / Debug Bot / Reviewer) | Low | High |
| 3 | Concept strength visualization | Low | High |
| 4 | Code snippets in learning review prompts | Medium | Medium |
| 5 | Cancel in-flight AI request | Low | Medium |
| 6 | Concept preview modal | Low | Medium |
| 7 | Session cards with counts + Today grouping | Low | Medium |
| 8 | Line-level mini chat (double-tap) | Medium | Medium |
| 9 | Learner Gem persona for learning chat | Low | Medium |
| 10 | Message bookmarks + border color tagging | Medium | Low |
| 11 | Graph pinch zoom + view mode switching | Medium | Low |
| 12 | File picker folder tree | High | Low |
| 13 | Session reference markers in messages | High | Low |
| 14 | Mark color name customization | Low | Low |
| 15 | Syntax highlighting (VSCode dark theme) | Medium | High |
| 16 | Selected code preview in chat (scrollable) | Medium | High |
| 17 | Adjust selection from within chat | Medium | High |
| 18 | Long-press selection start indicator | Low | Medium |
| 19 | Save as Learning schema + card preview redesign | High | High |
| 20 | In-chat model switching with model info + free/paid labels | Medium | High |