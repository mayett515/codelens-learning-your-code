# Stage 8 — Personas + Chat UX Polish

> Builds on Stages 1–7. Adds the Persona/Gem system, in-chat model switching, formalizes chat prompt composition,
> introduces cancel-in-flight, selected-code preview + adjust, code-reader polish, line-level mini chat,
> session flashback entry markers, reader bookmarks, and chat message markers with per-project color palettes.
> Codex-implementable. This stage does NOT touch the extractor, save flow, concept graph,
> or familiarity scoring from any previous stage.

---

## Required Reading

Before implementing this stage, read:

1. `CODELENS_REGRESSION_GUARD.md`
2. `CODELENS_COMPLETENESS_GUARD.md`
3. `CODELENS_MASTER_PLAN.md`
4. `STAGE_1_DATA_FOUNDATION.md`
5. `STAGE_2_EXTRACTOR_AND_SAVE_FLOW.md`
6. `STAGE_3_CARD_COMPONENTS.md`
7. `STAGE_4_LEARNING_HUB_SURFACES.md`
8. `STAGE_5_PROMOTION_SYSTEM.md`
9. `STAGE_6_RETRIEVAL.md`
10. `STAGE_7_DOT_CONNECTOR_AND_REVIEW.md`
11. This file

Conflict resolution:

- Regression Guard wins for product safety.
- Stage 1 wins for schema constraints, branded ID conventions, and embedding rules.
- Stage 2 wins for extractor prompt composition — persona layers MUST NOT touch it.
- Stage 6 wins for retrieval engine semantics and `InjectionResult` contracts.
- Stage 7 wins for Dot Connector retrieval pipeline and `applyReviewRating` (the sole familiarity-update path).
- This file wins for persona management, model switching, chat prompt composition, cancel behavior, selected-code preview, session reference rendering, mini chat, reader bookmarks, and chat message markers.

---

## Scope

### In scope

- Persona schema, built-in persona seed, CRUD, per-chat selection
- In-chat model switching with per-chat override and static model metadata
- Formal chat prompt composition pipeline (four locked layers)
- Cancel in-flight LLM stream ("Stop generating" button)
- Selected-code preview in the chat composer
- Adjust-selection from the selected-code preview
- Syntax highlighting and selection-start feedback in the code reader
- Line-level mini chat (lightweight, no Dot Connector by default, 5-exchange cap)
- Session reference marker rendering with flashback entry wiring
- Reader bookmark schema with per-project color palettes
- Chat message bookmarks and message border color tags
- Palette CRUD and default palette seed
- Settings keys for all Stage 8 systems
- Hooks, services, and components for all of the above
- Tests, acceptance criteria, anti-regression rules

### Out of scope

- Native graph rewrite (Stage 9)
- Cross-device sync of personas, bookmarks, or palettes
- Importance-score updates (deferred per Master Plan Decision 4)
- AI-evaluated self-rating (forever forbidden per Regression Guard)
- Bookmark semantic clustering or AI tagging
- Multi-turn review or quiz inside mini chat
- Auto-link of bookmarks to concepts or captures

---

## Core Purpose

<stage_8_purpose>
Stage 8 enriches the chat and code-reading experience in five complementary ways:

1. Personas and model choice — user-selectable AI focus modes and per-chat model switching
   change how the chat model responds,
   without touching the extractor, the knowledge graph, or any scoring.

2. Chat/reader continuity — cancel-in-flight, selected-code preview, adjust-selection,
   syntax highlighting, selection feedback, and line-level mini chat reduce friction
   between reading code and understanding it.

3. Session memory navigation — tappable session references open the same read-only
   flashback surface defined in Stage 4, so the user can revisit where something clicked.

4. Reader bookmarks — lightweight, colored line marks let the user flag code without committing
   to a full capture. They are pre-capture annotations, not knowledge objects.

5. Chat message markers — message bookmarks and border colors help the user organize
   conversations without turning chat moments into captures or concepts.

Stage 8 does not create captures, concepts, or review events automatically.
Every save path still goes through the Stage 2 flow.
</stage_8_purpose>

---

## Hard Constraints

<negative_constraints>

**Extractor isolation:**
- Persona layers MUST NEVER be injected into the extractor prompt.
- Stage 2's extractor prompt composition (`BASE_APP_SYSTEM_PROMPT` + `EXTRACTOR_INSTRUCTIONS` + concept context) is LOCKED.
- Stage 8 MUST NOT modify any file under `src/features/learning/extractor/`.
- `BASE_CHAT_SYSTEM_PROMPT` (Stage 8) and `BASE_APP_SYSTEM_PROMPT` (Stage 2 extractor) are different constants in different modules. They MUST NEVER be merged, swapped, or cross-imported.

**Personas:**
- Built-in personas MUST NOT be deletable by any user action.
- Persona selection MUST NOT change `familiarity_score`, `importance_score`, or any capture content field.
- Persona selection MUST NOT trigger retrieval, embedding, or concept creation.
- A null persona (no selection) MUST produce identical chat behavior to Stage 7 without Stage 8.
- Persona `systemPromptLayer` text MUST NOT exceed 3,000 chars.

**Model switching:**
- Model choice in chat MUST come from a static in-app metadata registry, not a runtime network lookup.
- `chats.model_override_id = NULL` means "use the existing default model behavior for this chat scope."
- Switching models affects the NEXT send only; it MUST NOT rewrite previous messages.
- Switching models MUST NOT clear message history, persona selection, selected code context, or retrieval state.
- Model switching MUST preserve continuity by sending the full existing chat history with the unchanged prompt layering rules.

**Cancel:**
- Cancel MUST abort the in-flight LLM stream using `AbortController`.
- Cancel MUST NOT delete the already-sent user message from the message list.
- Cancel MUST NOT roll back any captures saved earlier in the same session.
- Cancel MUST NOT trigger an automatic retry.
- Partial response ≥ 100 chars received before cancel → preserve with `[Generation stopped]` label.
- Partial response < 100 chars received before cancel → discard; show only `[Generation stopped]`.

**Selected-code preview:**
- Code context is injected as LAYER 4 (after memory injection) in `buildChatSystemPrompt`.
- Code context text is capped at 800 chars (inherits Stage 2's source-text rule).
- Removing the code preview clears the context but does NOT cancel the chat session.
- "Ask in chat" and "Save" are distinct actions on a selection; they MUST NOT share a button.
- Adjusting a selection from chat updates the active `codeContext` and file-viewer selection only.
- Adjusting a selection from chat MUST NOT mutate any saved capture or already-sent message.

**Code reader polish:**
- Syntax highlighting is a presentation layer only; it MUST NOT alter the raw source text, line numbers, or saved snippet text.
- The long-press selection-start indicator is ephemeral UI state only; it MUST NOT be stored in the database.
- The selected-code preview remains read-only unless the user explicitly enters Adjust mode.

**Mini chat:**
- Mini chat MUST NOT use Dot Connector retrieval by default. A future spec MAY introduce opt-in lightweight retrieval (max 3 items, no injection UI) for mini chat; this stage does not implement it and does not block it.
- Mini chat MUST NOT show a persona picker.
- Mini chat MUST cap at 5 exchanges (10 messages); further exchange requires expanding to full chat.
- Mini chat MUST NOT auto-save or auto-extract.
- Saves from mini chat go through the unchanged Stage 2 `prepareSaveCandidates` flow.

**Session references:**
- Flashback mode and session reference markers are one system:
  Stage 4 owns the destination surface; Stage 8 owns message parsing, rendering, and navigation wiring.
- Session references MUST point to real `session_id` values only.
- Tapping a session reference opens the shared read-only flashback surface from Stage 4.
- Invalid or stale session references MUST render inertly; they MUST NEVER crash the chat thread.

**Reader bookmarks:**
- Bookmarks MUST NOT auto-link to concepts.
- Bookmarks MUST NOT auto-create captures.
- Bookmarks MUST NOT modify `familiarity_score`, `importance_score`, or any capture content field.
- Deleting a bookmark MUST NOT affect any linked capture.
- A bookmark's `linked_capture_id` is optional and informational only.
- Palette changes MUST NOT retroactively change existing bookmark colors.
- Bookmarks MUST NOT appear in Learning Hub sections (Recent Captures, Concept List, Session Cards, Knowledge Health).

**Chat message markers:**
- Message bookmarks and message color tags are chat-organization tools only.
- Message bookmarks and message color tags MUST NOT create captures, concepts, review events, or Learning Hub items.
- Message color palettes are per project and MUST remain separate from reader bookmark palettes.
- Message bookmarks do NOT replace reader bookmarks; they exist for conversation navigation, not code-location marking.

</negative_constraints>

---

## End-to-End Flows

### Persona selection and chat

```
User opens a new or existing chat
  → if new chat: apply defaultPersonaId from settings (null = no persona)
  → chat header shows persona chip and active model chip
  → user may tap persona chip → ChatPersonaPickerSheet opens
  → user selects a different persona (or "Default")
  → chats.persona_id updated
  → persona change takes effect on next message send (not retroactive)
  → user may tap model chip → ChatModelPickerSheet opens
  → user selects a model row (or "Use default")
  → chats.model_override_id updated
  → model change takes effect on next message send (not retroactive)

User types and sends a message
  → runSendInjection called with persona, memories (Stage 7), codeContext (if set)
  → buildChatSystemPrompt composes 4-layer system prompt:
      LAYER 1: BASE_CHAT_SYSTEM_PROMPT
      LAYER 2: persona.systemPromptLayer (if persona is set)
      LAYER 3: memory injection block (if Dot Connector enabled and memories exist)
      LAYER 4: code context layer (if selectedCode or lineRef is set)
  → message sent to LLM with composed system prompt
  → Stop button appears; stream begins
  → user may tap Stop → AbortController.abort() → stream ends, partial preserved/discarded
  → stream completes → Stop button replaced by Send button
```

### Session reference flashback

```
Assistant message includes a valid session reference marker
  → renderer parses `[[SESSION_REF:<sessionId>|<short title>]]`
  → marker renders as a tappable inline session reference chip
  → user taps the chip
  → Stage 4 SessionFlashbackScreen opens in read-only mode
  → user reviews the past session
  → user taps "Return to chat"
  → active chat resumes unchanged
```

### Adjust selection from chat

```
User opens a chat from a code selection
  → SelectedCodePreview appears above the composer
  → user notices the range is slightly off
  → user taps "Adjust"
  → preview enters adjust mode with the current code plus 2 context lines above and below when available
  → user drags the top/bottom handles to expand or shrink the range
  → user taps "Confirm"
  → file-viewer selection updates
  → codeContext updates
  → subsequent sends use the adjusted context
```

### Line-level mini chat

```
User views a file in the code reader
  → taps a line → gutter action chip appears: "Ask about this line" | "Bookmark"
  → user taps "Ask about this line" → LineMiniChat bottom sheet opens
  → line code + ±5 surrounding lines are set as lineRef context
  → mini chat uses MINI_CHAT_SYSTEM_PROMPT + buildCodeContextLayer(lineRef)
  → user exchanges messages (max 5 exchanges)
  → at any point, user may tap "Save what clicked" on an assistant message
      → Stage 2 prepareSaveCandidates called with MiniChatSaveContext
      → Stage 2 save modal opens; mini chat stays open
  → user may tap "Expand to full chat →"
      → full chat opens seeded with mini chat history
      → codeContext set to kind: 'expanded_mini_chat'
      → Dot Connector and persona activate per user settings
```

### Bookmark creation

```
User taps a line gutter icon (non-bookmarked line)
  → action chip appears: "Ask about this line" | "Bookmark this line"
  → user taps "Bookmark this line" → BookmarkSheet opens (create mode)
  → color picker shows project palette (seeded from DEFAULT_PALETTE if first bookmark)
  → user picks a color, optionally adds a note (≤ 200 chars)
  → user taps "Save" → bookmark row inserted
  → gutter dot appears in the chosen color

User taps a bookmarked line gutter dot
  → BookmarkSheet opens (edit mode) with existing values
  → "Edit color" | "Edit note" | "Delete" | "Save capture from here"
  → "Save capture from here" → Stage 2 save flow with bookmark's code location as source
```

### Chat message bookmarks and color tags

```
User long-presses a chat bubble
  → ChatMessageMarkerSheet opens
  → actions: "Bookmark message" | "Add color tag" | "Edit marker" when one already exists
  → bookmarking asks for a short label and saves a jump marker for this chat
  → color-tagging lets the user choose a project-scoped color/label pair for the bubble border

User taps the bookmark icon in the chat header
  → ChatBookmarkTimeline opens for the current chat
  → bookmarks appear in chat order with spacing proportional to message distance
  → tapping a bookmark jumps to that message

User opens the color-tag view for a project
  → colored messages across chats are grouped/filterable by color label
  → tapping a row opens that chat and scrolls to the tagged message
```

---

## Step 1 — Persona Schema & Built-Ins

### Branded ID

```ts
export type PersonaId = string & { readonly __brand: 'PersonaId' };
export const newPersonaId = (): PersonaId => makeId<PersonaId>('p');
export const isPersonaId = (v: unknown): v is PersonaId =>
  typeof v === 'string' && v.startsWith('p_');
```

### Schema

```sql
CREATE TABLE personas (
  id                  TEXT PRIMARY KEY,
  name                TEXT NOT NULL,
  description         TEXT NOT NULL,          -- one-line purpose (max 150 chars)
  system_prompt_layer TEXT NOT NULL,          -- injected into chat prompt only; max 3000 chars
  icon_emoji          TEXT,                   -- single emoji or null
  is_built_in         INTEGER NOT NULL DEFAULT 0,  -- 1 = built-in, not deletable
  sort_order          INTEGER NOT NULL DEFAULT 100, -- built-ins 0-N; user-created append at 100+
  created_at          INTEGER NOT NULL,
  updated_at          INTEGER NOT NULL
);

CREATE UNIQUE INDEX idx_personas_name ON personas(name);
CREATE INDEX idx_personas_sort ON personas(sort_order ASC, name ASC);
```

### `chats` table addition

```sql
ALTER TABLE chats ADD COLUMN persona_id TEXT REFERENCES personas(id) ON DELETE SET NULL;
```

`persona_id = NULL` → no persona (base chat behavior). ON DELETE SET NULL ensures a deleted persona gracefully reverts the chat to default.

### Codec

```ts
export const PersonaRowCodec = z.object({
  id:                z.string().refine(isPersonaId),
  name:              z.string().min(1).max(80),
  description:       z.string().min(1).max(150),
  systemPromptLayer: z.string().max(3000),
  iconEmoji:         z.string().max(8).nullable(),
  isBuiltIn:         z.boolean(),
  sortOrder:         z.number().int(),
  createdAt:         z.number().int().positive(),
  updatedAt:         z.number().int().positive(),
});

export type Persona = z.infer<typeof PersonaRowCodec>;
```

### Built-in personas (seeded at first install)

```ts
// src/features/personas/data/seedBuiltInPersonas.ts

export const BUILT_IN_PERSONAS = [
  {
    name: 'Deep Diver',
    description: 'Pushes toward first-principles — why, not just what.',
    systemPromptLayer: `Focus on first principles.
When the user asks about code, explain why the design choice exists, what trade-offs it encodes, and what would break if it were different.
Avoid surface-level descriptions.
Encourage the user to think about invariants and mental models, not just syntax.`,
    iconEmoji: '🔬',
    isBuiltIn: true,
    sortOrder: 0,
  },
  {
    name: 'Teach Me',
    description: 'Explains as if to a learner — analogies, no assumed context.',
    systemPromptLayer: `Explain as if the user is learning this concept for the first time.
Use clear analogies from everyday life or simpler computing concepts.
Define jargon before using it.
Build from the simplest version of the idea toward complexity.`,
    iconEmoji: '📖',
    isBuiltIn: true,
    sortOrder: 1,
  },
  {
    name: 'Pattern Spotter',
    description: 'Surfaces design patterns and connections to saved concepts.',
    systemPromptLayer: `When responding, explicitly name any design patterns, architectural principles, or programming idioms this code exemplifies.
Connect to broader abstractions where relevant.
Help the user see the code as an instance of something they may have encountered before in a different language or context.`,
    iconEmoji: '🔗',
    isBuiltIn: true,
    sortOrder: 2,
  },
  {
    name: 'Rubber Duck',
    description: 'Reflects understanding back — lets the user explain, then surfaces gaps.',
    systemPromptLayer: `Your primary role is to help the user clarify their own understanding.
Ask them to explain in their own words.
Reflect back what you hear them saying.
Point out gaps or inconsistencies gently.
Provide the answer only after they have attempted an explanation — or when they explicitly ask you to just explain it.`,
    iconEmoji: '🦆',
    isBuiltIn: true,
    sortOrder: 3,
  },
] as const;
```

<built_in_persona_rules>
- Built-in personas MUST be seeded at first install and reseeded on boot if any are missing.
- Built-in persona rows are identified by `is_built_in = 1` and their canonical `name`.
- Built-in personas MUST NOT be deletable via any user action or service call.
- Built-in persona `systemPromptLayer` text is immutable at runtime; changes require an app release.
- A built-in persona MAY be cloned; the clone is a user-defined persona (`is_built_in = 0`) initialized from the built-in's fields.
- Cloning a built-in MUST generate a new `PersonaId` for the clone.
</built_in_persona_rules>

---

## Step 2 — Chat Prompt Composition Pipeline

This step formally defines the full chat prompt pipeline. It does NOT modify the extractor prompt from Stage 2.

### Constants

```ts
// src/features/chat/promptComposition/constants.ts

// CHAT only. Never pass to the extractor.
export const BASE_CHAT_SYSTEM_PROMPT = `You are the AI assistant inside CodeLens — a mobile app for learning code by reading real repositories on your phone.
You help the user understand code they are reading.
Ground explanations in the code and context provided.
Be concise. Avoid padding.`;

// Mini chat only. Intentionally lightweight.
export const MINI_CHAT_SYSTEM_PROMPT = `You are a quick code explainer inside CodeLens.
The user is looking at a specific line of code in a file they are reading.
Answer in 1–3 sentences. Be direct. No padding.
If the question requires more depth, suggest the user open the full chat.`;
```

<composition_isolation_rules>
- `BASE_CHAT_SYSTEM_PROMPT` is used ONLY in `buildChatSystemPrompt`.
- `BASE_APP_SYSTEM_PROMPT` from Stage 2 is used ONLY in the extractor prompt composition (`extractorPrompt.ts`).
- `MINI_CHAT_SYSTEM_PROMPT` is used ONLY in `useMiniChat`.
- These constants MUST NEVER be mixed across modules.
- Stage 8 MUST NOT import from `src/features/learning/extractor/` in any Stage 8 file.
- The extractor MUST NOT import from `src/features/personas/` or `src/features/chat/promptComposition/`.
</composition_isolation_rules>

### Code context type

```ts
// src/features/chat/promptComposition/types.ts

export type ChatCodeContextKind =
  | 'selected_code'       // explicit selection from the file viewer
  | 'line_anchor'         // opened from the mini chat gutter trigger
  | 'expanded_mini_chat'; // mini chat expanded to full chat; code context preserved

export interface ChatCodeContext {
  kind: ChatCodeContextKind;
  text: string;               // selected or anchored code, cap at 800 chars before layer build
  filePath: string | null;
  startLine: number | null;
  endLine: number | null;
  language: string | null;
  precedingLines: string | null; // ≤ 300 chars of lines before (mini chat only)
  followingLines: string | null; // ≤ 300 chars of lines after (mini chat only)
}

export interface ChatPromptOptions {
  persona: Persona | null;
  memories: RetrievedMemory[] | null;
  memoriesInjectionOpts?: { tokenBudget: number; maxItems: number };
  codeContext: ChatCodeContext | null;
}
```

### Prompt builder

```ts
// src/features/chat/promptComposition/buildChatSystemPrompt.ts

export const buildChatSystemPrompt = (opts: ChatPromptOptions): string => {
  const layers: string[] = [BASE_CHAT_SYSTEM_PROMPT];

  if (opts.persona?.systemPromptLayer) {
    layers.push(opts.persona.systemPromptLayer);
  }

  if (opts.memories && opts.memories.length > 0) {
    const iopts = opts.memoriesInjectionOpts ?? { tokenBudget: 1500, maxItems: 8 };
    const injection = formatMemoriesForInjection(opts.memories, iopts);
    if (injection.text.trim().length > 0) {
      layers.push(injection.text);
    }
  }

  if (opts.codeContext) {
    layers.push(buildCodeContextLayer(opts.codeContext));
  }

  return layers.filter((l) => l.trim().length > 0).join('\n\n---\n\n');
};
```

### Code context layer builder

```ts
// src/features/chat/promptComposition/buildCodeContextLayer.ts

export const buildCodeContextLayer = (ctx: ChatCodeContext): string => {
  const header =
    ctx.kind === 'selected_code'     ? 'Selected code from the file the user is reading:'
    : ctx.kind === 'line_anchor'     ? 'Code at the line the user asked about:'
    :                                  'Code context from the conversation the user just had:';

  const lineInfo =
    ctx.startLine != null
      ? `File: ${ctx.filePath ?? 'unknown'} · Lines ${ctx.startLine}–${ctx.endLine ?? ctx.startLine}`
      : ctx.filePath
        ? `File: ${ctx.filePath}`
        : null;

  const cappedText = ctx.text.slice(0, 800);
  const fence = ctx.language ? `\`\`\`${ctx.language}` : '```';
  const codeBlock = `${fence}\n${cappedText}\n\`\`\``;

  const parts: string[] = [
    header,
    lineInfo,
    ctx.precedingLines ? `Context before:\n\`\`\`\n${ctx.precedingLines}\n\`\`\`` : null,
    codeBlock,
    ctx.followingLines ? `Context after:\n\`\`\`\n${ctx.followingLines}\n\`\`\`` : null,
  ].filter(Boolean) as string[];

  return parts.join('\n');
};
```

### Composition order (LOCKED)

```
LAYER 1  BASE_CHAT_SYSTEM_PROMPT          always present, immutable
LAYER 2  persona.systemPromptLayer        if persona != null; omitted when persona is null
LAYER 3  memory injection block           if Dot Connector is enabled and memories.length > 0
LAYER 4  code context layer              if codeContext != null
```

<composition_order_rules>
- The order is LOCKED. Layers MUST appear in the sequence above.
- LAYER 4 (code context) comes last so the AI's most-immediate reference is closest to the chat history.
- LAYER 3 (memories) precedes LAYER 4 so general saved knowledge is established before the specific code question.
- LAYER 2 (persona) precedes memories so the persona's style instruction frames all subsequent context.
- Layers that produce empty or whitespace-only text are omitted; the `\n\n---\n\n` separator is placed only between non-empty layers.
- No leading separator. No trailing separator.
- Persona layer (LAYER 2) MUST NOT instruct the AI to ignore, suppress, or override memory injection (LAYER 3) or code context (LAYER 4). If a persona's `systemPromptLayer` contains such instructions, they are applied in document order but the later layers still appear in the prompt — the AI receives all context regardless of what LAYER 2 says about it. This is a build-time authoring constraint on built-in personas; user-defined personas that attempt override will simply have their instructions appear earlier with memories and code following.
</composition_order_rules>

### Integration with Stage 7

Stage 7's `runSendInjection` is updated to use `buildChatSystemPrompt`. The retrieval and formatting logic from Stage 7 is unchanged.

```ts
// Updated runSendInjection.ts (Stage 7 service; Stage 8 adds persona and codeContext)

export interface SendInjectionOptions {
  userMessage: string;
  persona: Persona | null;            // NEW in Stage 8
  codeContext: ChatCodeContext | null; // NEW in Stage 8
  injectionOpts?: { tokenBudget: number; maxItems: number };
  // ... existing Stage 7 fields
}

export const runSendInjection = async (
  opts: SendInjectionOptions
): Promise<PreparedMessage> => {
  // Stage 7: retrieve memories (unchanged)
  const resolved = await resolveInjectionMemories(opts);

  // Stage 8: compose full system prompt
  const systemPrompt = buildChatSystemPrompt({
    persona:               opts.persona,
    memories:              resolved.memories,
    memoriesInjectionOpts: opts.injectionOpts,
    codeContext:           opts.codeContext,
  });

  return {
    systemPrompt,
    userMessage:        opts.userMessage,
    injectedMemoryIds:  resolved.injectedIds,
    diagnostics:        resolved.diagnostics,
  };
};
```

<stage7_integration_rules>
- Stage 7 retrieval and Dot Connector settings still gate whether memories reach `buildChatSystemPrompt`.
- `formatMemoriesForInjection` (Stage 6) is used unchanged inside `buildChatSystemPrompt`.
- `useSendWithInjection` (Stage 7 hook) is updated to accept `persona` and `codeContext` as new optional parameters and forward them to `runSendInjection`.
- The Stage 7 hook contract is backward-compatible: callers that omit the new parameters get null for both.
</stage7_integration_rules>

---

## Step 2A — In-Chat Model Switching

### Purpose

Let the user switch models from the chat header without leaving the conversation.

This is a chat-continuity feature, not a provider-management feature.

### `chats` table addition

```sql
ALTER TABLE chats ADD COLUMN model_override_id TEXT;
```

`model_override_id = NULL` means the chat uses the existing default model behavior for that chat scope.

### Static model metadata

```ts
// src/features/chat/modelSelection/modelCatalog.ts

export interface ChatModelOption {
  id: string;                 // provider/model identifier already used by the app
  displayName: string;        // user-facing short name
  pricingTier: 'free' | 'paid';
  description: string;        // 1 short paragraph: what the model is good at
  providerLabel?: string | null;
  isVisible: boolean;
}
```

<model_metadata_rules>
- Model metadata comes from a static in-app registry.
- Do NOT fetch row descriptions from the network at runtime.
- The registry is the source of truth for display name, free/paid badge, and short capability description.
</model_metadata_rules>

### Component: ChatModelPickerSheet

```ts
interface ChatModelPickerSheetProps {
  currentModelId: string | null;   // null = use default
  models: ChatModelOption[];
  onSelect: (modelId: string | null) => void;
  onClose: () => void;
}
```

<model_picker_rules>
- The active model name is shown in the chat header.
- Tapping the model name opens `ChatModelPickerSheet`.
- The first row is always `Use default`.
- Each model row shows: display name, `FREE`/`PAID` badge, and an expandable one-paragraph description.
- The active row is clearly highlighted.
- Selecting a row updates `chats.model_override_id`.
- The model change applies to the NEXT send only; the current transcript is not rewritten.
- Switching models MUST preserve the existing message history, persona selection, retrieved memories, and code context.
- If a stored `model_override_id` no longer exists in the catalog, show it as unavailable and let the user switch away; do not silently delete the stored value.
</model_picker_rules>

---

## Step 3 — Cancel In-Flight Request

### Component: StopGeneratingButton

```ts
interface StopGeneratingButtonProps {
  onStop: () => void;
}
```

<stop_button_rules>
- The Stop button appears ONLY while a response is being streamed (`messageStatus === 'streaming'`).
- The Stop button replaces the Send button in the composer footer; both MUST NEVER be simultaneously visible.
- The Stop button must have an adequate touch target (min 44×44 pt).
- Tapping Stop calls `abortController.abort()` synchronously on the UI thread.
- The Stop button disappears as soon as the stream ends, whether by completion or abort.
- The Stop button MUST NOT appear during Dot Connector retrieval — only during LLM streaming.
</stop_button_rules>

### Message status

```ts
export type ChatMessageStatus =
  | 'sending'     // user message dispatched; awaiting LLM stream start
  | 'streaming'   // LLM stream in progress
  | 'done'        // stream completed normally
  | 'failed'      // LLM error (not user-initiated)
  | 'stopped';    // user-initiated abort
```

### Cancel behavior

```ts
// src/features/chat/hooks/useCancelGeneration.ts

export const useCancelGeneration = () => {
  const abortControllerRef = useRef<AbortController | null>(null);

  const startGeneration = useCallback((): AbortSignal => {
    const controller = new AbortController();
    abortControllerRef.current = controller;
    return controller.signal;
  }, []);

  const stopGenerating = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
  }, []);

  const clearGeneration = useCallback(() => {
    abortControllerRef.current = null;
  }, []);

  return { startGeneration, stopGenerating, clearGeneration };
};
```

<cancel_rules>
- `startGeneration()` is called immediately before the LLM stream begins. The returned signal is passed to the LLM provider call.
- `stopGenerating()` is called when the user taps Stop. `AbortError` propagates from the LLM call.
- `clearGeneration()` is called on normal stream completion.
- On `AbortError` from the stream: set message status to `'stopped'`; apply partial-response rules below.
- Cancel MUST NOT delete the already-sent user message from the message list.
- Cancel MUST NOT roll back any saves made earlier in the session.
- Cancel MUST NOT trigger an automatic retry.
- After cancel, the composer input is not restored (it was cleared on send and remains in the message list).
</cancel_rules>

### Partial response handling

<partial_response_rules>
- Track the cumulative character count of the streamed response as it arrives.
- At abort time:
  - If `receivedChars === 0` (stream aborted before any token was received): do NOT create an assistant message row at all. The message list MUST NOT contain an empty or `[Generation stopped]`-only bubble in this case. The user message remains in the list; the conversation is ready for the next send.
  - If `receivedChars > 0 && receivedChars < 100`: discard the partial text; set the already-created assistant message content to `'[Generation stopped]'`.
  - If `receivedChars >= 100`: retain the partial text; append `'\n\n[Generation stopped]'` inline.
- The `[Generation stopped]` notice is a non-interactive styled label; it is NOT a button.
- The stopped message MUST be clearly marked as incomplete (e.g., a subtle italic notice).
- A stopped message does NOT block the next message send.
- The stopped message's status is `'stopped'`; it renders identically to a `'done'` message except for the notice and status badge.
</partial_response_rules>

---

## Step 4 — Selected-Code Preview in Chat

### Component: SelectedCodePreview

```ts
interface SelectedCodePreviewProps {
  codeContext: ChatCodeContext;
  onRemove: () => void;
  onAdjust: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}
```

<preview_rules>
- The preview appears at the top of the chat composer input area when `codeContext` is non-null.
- The preview shows:
  - A language chip if `codeContext.language` is set.
  - File path + line range if `codeContext.filePath` and `codeContext.startLine` are set.
  - Up to 5 lines of the code text; if more than 5 lines exist, show "… N more lines" truncation.
  - Maximum 400 chars in the preview (presentation cap; the actual injected layer cap is 800 chars).
  - Horizontal scrolling for long lines; do not force-wrap code just to fit the preview.
- A "×" remove action clears `codeContext` without affecting the chat session or any messages already sent.
- An `Adjust` action opens selection-adjust mode without leaving the chat.
- A collapse toggle hides the code preview visually while keeping the context active for injection.
- The preview MUST make clear this is "context for this message", not "about to be saved".
- Do NOT show a "Save" button inside the preview; saving is a separate action on the file-viewer selection.
</preview_rules>

### Entry points

<code_context_entry_rules>
- File viewer: user selects text → "Ask in chat" action → chat opens with the selection as `codeContext` (`kind: 'selected_code'`).
- File viewer: user selects text → "Save" action → triggers Stage 2 save flow. No chat context set.
- "Ask in chat" and "Save" are ALWAYS separate actions. They MUST NOT share a button or a combined action.
- After saving from a selection, the selection may still be used as code context for a follow-up chat question.
- `codeContext.text` is capped at 800 chars before it reaches `buildCodeContextLayer`. If the original selection exceeds 800 chars, cap silently and show a subtle "(truncated)" note in the preview.
</code_context_entry_rules>

---

### Adjust selection from chat

<adjust_selection_rules>
- Tapping `Adjust` opens an inline adjustment mode anchored to the selected-code preview.
- Adjustment mode shows the current selection plus up to 2 additional lines above and below when available.
- The user adjusts the range with a top handle and bottom handle.
- `Confirm` updates both the file-viewer selection and the active `codeContext`.
- `Cancel` exits adjust mode and keeps the original selection.
- Adjust mode MUST NOT edit any already-sent chat message.
- Adjust mode MUST NOT mutate any saved capture.
- If the adjusted range exceeds the 800-char cap, the preview and injected layer use the capped text and show the same subtle truncation note.
</adjust_selection_rules>

---

## Step 4A — Code Reader Context Polish

### Syntax highlighting

<syntax_highlighting_rules>
- The code reader uses a stable syntax-highlighting palette modeled on VS Code Dark+.
- Highlighting is applied to the file viewer first; reusing the same token colors in selected-code preview and adjust mode is strongly preferred.
- If a file type is unsupported, fall back to plain text without breaking selection, layout, or line numbering.
- Highlighting is visual only; it MUST NOT alter copied text, saved snippets, or `codeContext.text`.
</syntax_highlighting_rules>

### Long-press selection-start indicator

<selection_start_indicator_rules>
- The moment a long-press begins a range selection, show a clear start marker on that line.
- The marker may be a pin, pulse, halo, or highlighted gutter state, but it must be visible immediately.
- The marker remains until the range is completed or cancelled.
- The marker is ephemeral UI state only; it is never persisted.
</selection_start_indicator_rules>

---

## Step 5 — Line-Level Mini Chat

### Purpose

Provide a lightweight, anchored chat surface for asking a quick question about a specific line without opening the full chat.

### Primary user action

Type a question and receive a short answer, all without leaving the file view.

### Trigger

<mini_chat_trigger_rules>
- The trigger is a gutter icon (or inline action chip) that appears when the user taps a line.
- On tap: a compact action chip appears with two options: "Ask about this line" and "Bookmark this line".
- "Ask about this line" opens `LineMiniChat`.
- "Bookmark this line" opens `BookmarkSheet`.
- The chip disappears on tap outside or after either action is taken.
- The gutter icon MUST NOT appear on every line by default; it appears on tap only.
</mini_chat_trigger_rules>

### Types

```ts
// src/features/chat/mini/types.ts

export interface MiniChatMessage {
  id: string;          // client-side UUID; not persisted unless the user saves a capture
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
}

export interface MiniChatSaveContext {
  lineRef: ChatCodeContext;           // kind: 'line_anchor'
  history: MiniChatMessage[];
  selectedMessageId: string;          // which assistant message triggered the save action
}
```

### Component: LineMiniChat

```ts
interface LineMiniChatProps {
  lineRef: ChatCodeContext;           // kind: 'line_anchor'; built from the tapped line
  onExpandToChat: (
    history: MiniChatMessage[],
    lineRef: ChatCodeContext
  ) => void;
  onSaveCapture: (ctx: MiniChatSaveContext) => void;
  onClose: () => void;
}
```

### Layout

<mini_chat_layout_rules>
- Appears as a bottom sheet (or popover on tablet).
- Header: file name chip + line number. No persona picker. No Dot Connector indicator.
- Body: scrollable message list.
- Footer: compact text input + Send button.
- Secondary footer actions: "Expand to full chat →" | visible on each assistant message: "Save what clicked".
- Maximum sheet height: 60% of screen. Minimum height: 30%.
- When the exchange limit is reached, the input is replaced by: "Continue this in the full chat →".
</mini_chat_layout_rules>

### Exchange limit

<mini_chat_limit_rules>
- An "exchange" is one user message + one assistant message.
- The cap is 5 exchanges (10 messages total).
- When the limit is reached:
  - The input field is hidden.
  - A prominent tappable prompt appears: "Continue this in the full chat →".
  - The user cannot send more messages in the mini chat.
- The cap enforces focus. Mini chat is intentionally short-form.
</mini_chat_limit_rules>

### Mini chat prompt

```ts
// src/features/chat/mini/constants.ts

// Mini chat prompt = MINI_CHAT_SYSTEM_PROMPT + buildCodeContextLayer(lineRef).
// Does NOT use buildChatSystemPrompt. No persona. No memories.
export const buildMiniChatSystemPrompt = (lineRef: ChatCodeContext): string =>
  [MINI_CHAT_SYSTEM_PROMPT, buildCodeContextLayer(lineRef)]
    .filter(Boolean)
    .join('\n\n---\n\n');
```

<mini_chat_prompt_rules>
- Mini chat MUST use `MINI_CHAT_SYSTEM_PROMPT` + code context layer.
- Mini chat MUST NOT use `buildChatSystemPrompt`.
- Mini chat MUST NOT inject memories (no Dot Connector retrieval) in this stage.
- Mini chat MUST NOT apply a persona.
- The lineRef code text is capped at 800 chars (same as the standard code context cap).
</mini_chat_prompt_rules>

### lineRef construction

```ts
// Built from the tapped line in the file viewer
const buildLineRef = (
  code: string,
  filePath: string,
  lineNumber: number,
  surroundingLines: { before: string; after: string },
  language: string | null
): ChatCodeContext => ({
  kind: 'line_anchor',
  text: code.slice(0, 800),
  filePath,
  startLine: lineNumber,
  endLine: lineNumber,
  language,
  precedingLines: surroundingLines.before.slice(0, 300) || null,
  followingLines: surroundingLines.after.slice(0, 300) || null,
});
```

### Expand to full chat

<expand_to_chat_rules>
- `onExpandToChat(history, lineRef)` is called with the complete mini chat history and the original line reference.
- The full chat:
  - Seeds its message list with the mini chat history (all messages in order).
  - Sets `codeContext` to a `ChatCodeContext` with `kind: 'expanded_mini_chat'`, same `text`, `filePath`, `startLine`, `endLine`, `language`, `precedingLines`, `followingLines` as the original `lineRef`.
  - Activates the Dot Connector and persona per the user's current settings.
  - The full chat's system prompt uses `buildChatSystemPrompt` (4-layer pipeline).
- The mini chat bottom sheet closes after expansion.
- The expanded chat is NOT treated as a continuation of the mini chat for session purposes; it is a new full chat seeded with mini chat context.
</expand_to_chat_rules>

### Save from mini chat

<mini_chat_save_rules>
- "Save what clicked" appears on each assistant message in the mini chat.
- Tapping it builds a `MiniChatSaveContext` and calls `onSaveCapture`.
- `onSaveCapture` calls `prepareSaveCandidates` (Stage 2) with the mini chat context as the source type.
- The Stage 2 save modal opens on top of the mini chat sheet; the mini chat remains open behind it.
- After saving, the capture is persisted normally per Stage 2 rules.
- The mini chat does NOT close after a save action.
- Mini chat DOES NOT auto-save, auto-extract, or pre-fill candidates without the user initiating.
</mini_chat_save_rules>

---

## Step 5A — Session Reference Markers + Flashback Entry

### Purpose

Render past-session references inside chat messages and route them into the shared Stage 4 flashback surface.

<flashback_unification_rules>
- "Flashback mode" is the read-only destination surface from Stage 4.
- "Session reference markers" are one entry path into that surface.
- Session Cards and `ConceptCardFull` provenance rows are the other entry paths.
- These are one system, not separate features.
</flashback_unification_rules>

### Token format

```txt
[[SESSION_REF:<sessionId>|<short title>]]
```

The short title is user-facing display text.
The `sessionId` is the authoritative navigation target.

### Rendering rules

<session_reference_render_rules>
- Parse the token only inside assistant messages.
- Render it as a tappable inline chip or pill, not as raw token text.
- If multiple valid session references appear, render each separately in message order.
- If the token format is malformed or the `sessionId` no longer resolves, render inert fallback text and log diagnostics.
- The displayed label may use the token's short title, but the app may replace it with the canonical session title if available locally.
- Tapping a rendered session reference opens the Stage 4 `SessionFlashbackScreen`.
- Returning from flashback restores the chat scroll position and draft text.
</session_reference_render_rules>

---

## Step 6 — Reader Bookmark Schema

### Branded ID

```ts
export type BookmarkId = string & { readonly __brand: 'BookmarkId' };
export const newBookmarkId = (): BookmarkId => makeId<BookmarkId>('bm');
export const isBookmarkId = (v: unknown): v is BookmarkId =>
  typeof v === 'string' && v.startsWith('bm_');
```

### Schema

```sql
CREATE TABLE bookmarks (
  id                  TEXT PRIMARY KEY,
  project_id          TEXT NOT NULL,        -- opaque repo identifier (URL, path, or hash)
  file_path           TEXT NOT NULL,        -- repo-relative path
  start_line          INTEGER NOT NULL,     -- 1-indexed inclusive
  end_line            INTEGER NOT NULL,     -- 1-indexed inclusive; equals start_line for single-line mark
  color_key           TEXT NOT NULL,        -- references a key in the project palette
  note                TEXT,                 -- optional annotation; max 200 chars
  linked_capture_id   TEXT REFERENCES learning_captures(id) ON DELETE SET NULL,
  session_id          TEXT,
  created_at          INTEGER NOT NULL,
  updated_at          INTEGER NOT NULL
);

CREATE UNIQUE INDEX idx_bookmarks_location
  ON bookmarks(project_id, file_path, start_line, end_line);

CREATE INDEX idx_bookmarks_created      ON bookmarks(created_at DESC);
CREATE INDEX idx_bookmarks_session      ON bookmarks(session_id);
CREATE INDEX idx_bookmarks_project_file ON bookmarks(project_id, file_path, start_line ASC);
CREATE INDEX idx_bookmarks_color        ON bookmarks(project_id, color_key);

CREATE TABLE bookmark_palettes (
  project_id    TEXT PRIMARY KEY,
  palette_json  TEXT NOT NULL,   -- Zod-validated: MarkColor[]
  updated_at    INTEGER NOT NULL
);
```

### Palette types and codecs

```ts
// src/features/bookmarks/types/bookmark.ts

export interface MarkColor {
  key:    string;   // stable slug, e.g. 'yellow'. Regex: /^[a-z0-9-]+$/
  label:  string;   // user-facing name, e.g. 'Interesting'
  hex:    string;   // CSS hex, e.g. '#FACC15'
  emoji?: string;   // optional, e.g. '⭐'
}

// src/features/bookmarks/codecs/bookmark.ts

export const MarkColorCodec = z.object({
  key:   z.string().min(1).max(40).regex(/^[a-z0-9-]+$/),
  label: z.string().min(1).max(40),
  hex:   z.string().regex(/^#[0-9a-fA-F]{6}$/),
  emoji: z.string().max(8).optional(),
});

export const PaletteCodec = z.array(MarkColorCodec).min(1).max(10);

export const BookmarkRowCodec = z.object({
  id:               z.string().refine(isBookmarkId),
  projectId:        z.string().min(1),
  filePath:         z.string().min(1),
  startLine:        z.number().int().positive(),
  endLine:          z.number().int().positive(),
  colorKey:         z.string().min(1),
  note:             z.string().max(200).nullable(),
  linkedCaptureId:  z.string().refine(isLearningCaptureId).nullable(),
  sessionId:        z.string().nullable(),
  createdAt:        z.number().int().positive(),
  updatedAt:        z.number().int().positive(),
});

export type Bookmark = z.infer<typeof BookmarkRowCodec>;
```

### Default palette

```ts
// src/features/bookmarks/data/defaultPalette.ts

export const DEFAULT_PALETTE: MarkColor[] = [
  { key: 'yellow', label: 'Interesting', hex: '#FACC15', emoji: '⭐' },
  { key: 'blue',   label: 'Important',   hex: '#3B82F6', emoji: '🔵' },
  { key: 'red',    label: 'Confused',    hex: '#EF4444', emoji: '❓' },
  { key: 'green',  label: 'I get this',  hex: '#22C55E', emoji: '✓'  },
  { key: 'purple', label: 'Return to',   hex: '#A855F7', emoji: '🔖' },
];
```

<palette_rules>
- The default palette is seeded for a project on first bookmark creation if no palette row exists yet.
- Palette changes affect only future bookmarks; existing bookmarks retain their `color_key`.
- If a bookmark's `color_key` is not found in the current palette, the bookmark renders with a neutral fallback color (e.g., `#9CA3AF` gray). It is NOT deleted. A diagnostics entry is logged.
- Palette minimum: 1 color. Maximum: 10 colors.
- `color_key` values must be URL-safe slugs: `^[a-z0-9-]+$`.
- The user may rename, recolor, or reorder palette entries.
- The user MUST NOT delete a color key that is currently used by any bookmark. The UI MUST surface a count: "N bookmark(s) use this color — reassign them first."
</palette_rules>

---

## Step 7 — Persona Management UI

### PersonaListScreen

Purpose: browse, select, create, edit, clone, and delete personas.

Primary user action: select a persona or navigate to the editor.

```ts
interface PersonaListScreenProps {
  activeChatId?: string;          // if opened from a chat, selection updates that chat's persona
  onSelectPersona: (id: PersonaId | null) => void; // null = default (no persona)
  onNavigateToEditor: (id: PersonaId | null) => void; // null = create new
}
```

<persona_list_rules>
- Ordering: built-in personas (sort_order ASC, then name ASC), then user-defined (created_at ASC, then name ASC).
- A "Default (no extra focus)" option is always at the top (value = null).
- Built-in rows show: icon + name + description + "Clone" action. No "Delete".
- User-defined rows show: icon + name + description + "Edit" + "Delete" actions.
- Deleting a user-defined persona shows a confirmation: "Remove '[name]'? Chats using it will revert to default."
- Empty state for user-defined section: no heading shown if the user has not created any.
</persona_list_rules>

### PersonaEditorScreen

Purpose: create or edit a user-defined persona. Editing built-in personas is forbidden (only clone).

```ts
interface PersonaEditorScreenProps {
  personaId: PersonaId | null; // null = creating new; non-null = editing existing user-defined
  onSave: () => void;
  onCancel: () => void;
}
```

Fields:

| Field | Input | Required | Constraints |
|---|---|---|---|
| `name` | Text input | Yes | 1–80 chars, unique |
| `description` | Text input | Yes | 1–150 chars |
| `iconEmoji` | Emoji picker | No | 1 emoji or empty |
| `systemPromptLayer` | Multi-line textarea | Yes | 1–3000 chars |

<editor_rules>
- Attempting to edit a built-in persona MUST surface an error: "Built-in personas can't be edited — clone it to customize."
- Saving validates via `PersonaRowCodec`; hard errors block the save.
- Unique name conflict: inline error "A persona with this name already exists." Confirm button disabled.
- Empty `systemPromptLayer` (all whitespace): warn with a non-blocking inline notice "An empty focus layer won't change how the AI responds." Allow saving.
- Character counts for `systemPromptLayer` are shown in real time.
</editor_rules>

### ChatPersonaPickerSheet

A compact sheet opened from the chat header to change the persona for the active chat.

```ts
interface ChatPersonaPickerSheetProps {
  currentPersonaId: PersonaId | null;
  onSelect: (id: PersonaId | null) => void;
  onClose: () => void;
}
```

<picker_rules>
- Purpose: select a persona for the current chat.
- Primary user action: tap a persona row to activate it.
- Ordering: same as PersonaListScreen.
- Selection applies immediately to `chats.persona_id`.
- The chat header shows the active persona name next to the chat title; nothing shown if null.
- Persona change takes effect on the NEXT message sent. Existing messages in the chat are unaffected.
- Persona change MUST NOT re-run retrieval or re-send any message.
- After a persona selection, show a one-time non-blocking inline hint in the chat thread: "Responses will now follow [Persona Name]." The hint appears once per change, auto-dismisses after 3 s or on the next user interaction, and is not stored as a message row. Switching to null (Default) shows "Responses will use the default assistant style."
</picker_rules>

### ChatModelPickerSheet

Purpose: switch the model for the active chat without leaving the thread.

```ts
interface ChatModelPickerSheetProps {
  currentModelId: string | null; // null = use default
  onSelect: (modelId: string | null) => void;
  onClose: () => void;
}
```

<chat_model_picker_rules>
- The active model name is shown in the chat header next to or near the persona chip.
- The picker always includes a `Use default` row that clears `chats.model_override_id`.
- Each model row shows display name, `FREE`/`PAID` badge, and an expandable short description.
- Changing the model writes `chats.model_override_id` immediately.
- The change applies to the next send only.
- Changing the model MUST NOT clear the draft, the scroll position, the persona, or the selected-code preview.
</chat_model_picker_rules>

---

## Step 8 — Reader Bookmark UI

### File viewer gutter

<gutter_rules>
- On tap of a code line: show a compact action chip anchored near the line.
- Chip options for a non-bookmarked line: "Ask about this line" | "Bookmark this line".
- Chip options for a bookmarked line: show the bookmark color dot + "Edit bookmark" | "Ask about this line".
- The chip dismisses on tap outside, on navigation, or after either action completes.
- Bookmarked lines show a `GutterBookmarkDot` — a small colored circle in the gutter margin using the bookmark's palette color (or neutral fallback if color_key is stale).
- Multiple bookmarks on the same line: show the color of the most recent one; tapping opens a list to choose which bookmark to edit.
</gutter_rules>

### BookmarkSheet

Purpose: create or edit a bookmark for a specific line range.

```ts
interface BookmarkSheetProps {
  mode: 'create' | 'edit';
  bookmark?: Bookmark;          // required in edit mode
  projectId: string;
  filePath: string;
  startLine: number;
  endLine: number;
  palette: MarkColor[];
  onSave: (data: BookmarkUpsertInput) => void;
  onDelete?: (id: BookmarkId) => void;
  onSaveCapture?: () => void;   // triggers Stage 2 flow with this location as source
  onClose: () => void;
}

interface BookmarkUpsertInput {
  projectId: string;
  filePath: string;
  startLine: number;
  endLine: number;
  colorKey: string;
  note: string | null;
  sessionId: string | null;
}
```

<bookmark_sheet_rules>
- Create mode: default color = project's last-used color key (held in component state, resets on remount); if unavailable, use `palette[0].key`.
- Edit mode: prefills with existing bookmark values.
- Color picker: a row of tappable swatches (one per palette color).
- Note input: single-line, max 200 chars, character count visible.
- Delete action (edit mode only): shows confirmation "Remove this bookmark?".
- "Save capture from here" (edit mode): secondary action that triggers Stage 2 save flow using the bookmark's location as source. The `bookmarkId` MUST be passed as optional metadata to `prepareSaveCandidates` so the extractor can use it as attribution context. The resulting capture is NOT automatically linked to the bookmark (no `linked_capture_id` write happens without explicit user action); the `bookmarkId` is source provenance only.
- Deleting a bookmark MUST NOT affect `linked_capture_id`'s capture.
</bookmark_sheet_rules>

### BookmarkListScreen

Purpose: browse all bookmarks (optionally filtered).

Primary user action: tap a bookmark to navigate to that line in the file viewer.

```ts
interface BookmarkFilter {
  projectId?: string;
  colorKey?: string;
  sessionId?: string;
}

interface BookmarkListScreenProps {
  filter?: BookmarkFilter;
  onNavigateToLine: (bookmark: Bookmark) => void;
  onEditBookmark: (bookmark: Bookmark) => void;
}
```

<bookmark_list_rules>
- Ordering: `created_at DESC`. Tie-breaker: `id ASC`.
- Grouping: none by default. User may filter by project, color, or session.
- Each row: color swatch, `filePath:startLine` label (or range), note excerpt (max 1 line), relative time.
- Tapping a row: navigate to the file at the bookmarked line.
- Long-press a row: "Edit bookmark" | "Delete bookmark" | "Save capture from here".
- Empty state (no bookmarks at all): "Tap a line in the file viewer to add your first bookmark."
- Empty state (filter matches nothing): "No bookmarks with this color." (or session/project variant).
- Bookmarks MUST NOT appear in the Learning Hub sections. This screen is accessed from a "Tools" or "Reader" area, not from the Hub.
</bookmark_list_rules>

### PaletteEditorScreen

Purpose: customize the color palette for a project.

```ts
interface PaletteEditorScreenProps {
  projectId: string;
  onSave: () => void;
  onCancel: () => void;
}
```

<palette_editor_rules>
- Shows the current palette as a reorderable list of color swatches.
- Each row: color swatch, editable label, hex input, optional emoji.
- "Add color" action (visible when palette has < 10 colors).
- "Remove" action per row: blocked if any bookmark uses that `color_key`; surfaced as a count.
- Hex input validated to `/^#[0-9a-fA-F]{6}$/`; invalid input prevents save.
- Save validates via `PaletteCodec`; loud failure if codec rejects.
- Changes take effect only after "Save"; cancel reverts to the last saved palette.
</palette_editor_rules>

---

## Step 8A — Chat Message Markers

### Purpose

Let the user mark meaningful moments in a chat without turning them into captures.

Two marker kinds exist:
- message bookmark = a named jump point inside one chat
- color tag = a colored border + label for organizing messages across chats in a project

### Schema

```sql
CREATE TABLE chat_message_markers (
  id               TEXT PRIMARY KEY,
  project_id       TEXT NOT NULL,
  chat_id          TEXT NOT NULL,
  chat_message_id  TEXT NOT NULL,
  kind             TEXT NOT NULL CHECK (kind IN ('bookmark', 'color_tag')),
  label            TEXT,              -- required for bookmark; optional for color_tag display
  color_key        TEXT,              -- required for color_tag; null for bookmark
  created_at       INTEGER NOT NULL,
  updated_at       INTEGER NOT NULL
);

CREATE INDEX idx_chat_message_markers_chat
  ON chat_message_markers(chat_id, created_at ASC);

CREATE INDEX idx_chat_message_markers_project_color
  ON chat_message_markers(project_id, color_key, created_at DESC);

CREATE TABLE chat_message_color_palettes (
  project_id    TEXT PRIMARY KEY,
  palette_json  TEXT NOT NULL,
  updated_at    INTEGER NOT NULL
);
```

### Types

```ts
export type ChatMessageMarkerId = string & { readonly __brand: 'ChatMessageMarkerId' };
export const newChatMessageMarkerId = (): ChatMessageMarkerId =>
  makeId<ChatMessageMarkerId>('cmm');

export type ChatMessageMarkerKind = 'bookmark' | 'color_tag';
```

### Rules

<chat_message_marker_rules>
- A single message may have both a bookmark and a color tag.
- Message bookmarks are scoped to one chat.
- Color tags are scoped to a project and reusable across chats in that project.
- Message color palettes are distinct from reader bookmark palettes even if they share the same visual colors.
- Long-pressing a chat bubble opens marker actions for that bubble.
- Bookmarking asks for a short label; color-tagging shows the project message-color palette.
- Chat bookmarks open in a timeline view for the current chat.
- Color-tagged messages open in a project-level index grouped/filterable by color label.
- Message markers are navigation and organization only; they never create captures, concepts, or review events.
</chat_message_marker_rules>

---

## Step 9 — Settings

<settings_additions>

New settings keys (all stored in the existing app settings store per Stage 7 conventions):

| Key | Type | Default | Description |
|---|---|---|---|
| `defaultPersonaId` | `PersonaId \| null` | `null` | Persona applied to new chats. Null = no persona. |
| `miniChatEnabled` | `boolean` | `true` | When false, the gutter icon shows only "Bookmark"; mini chat entry is suppressed. |
| `selectedCodePreviewCollapsed` | `boolean` | `false` | If true, the selected-code preview starts collapsed in the composer. |
| `bookmarkDefaultColorKey` | `string \| null` | `null` | If set, overrides per-project last-used color with a fixed default key. |
| `cancelPreservesPartialThreshold` | `number` | `100` | Minimum chars received before a partial response is preserved on cancel. Not shown in the main settings screen (advanced). |

</settings_additions>

<settings_integration_rules>
- `defaultPersonaId` applies to new chat sessions; existing chats read `chats.persona_id` directly.
- `miniChatEnabled = false` suppresses the "Ask about this line" chip option but leaves "Bookmark this line" intact.
- Settings changes apply immediately; no restart, no destructive side effects.
- Settings are observable by hooks so the chat composer, gutter, and persona picker re-render on change.
</settings_integration_rules>

---

## Step 10 — Query Keys & Hooks

```ts
// src/features/personas/data/queryKeys.ts

export const personaKeys = {
  all:   () => ['personas'] as const,
  list:  () => [...personaKeys.all(), 'list'] as const,
  byId:  (id: PersonaId) => [...personaKeys.all(), id] as const,
};

// src/features/bookmarks/data/queryKeys.ts

export const bookmarkKeys = {
  all:       () => ['bookmarks'] as const,
  list:      (filter: BookmarkFilter) =>
    [...bookmarkKeys.all(), 'list', filter] as const,
  byId:      (id: BookmarkId) => [...bookmarkKeys.all(), id] as const,
  byFile:    (projectId: string, filePath: string) =>
    [...bookmarkKeys.all(), 'byFile', projectId, filePath] as const,
  byProject: (projectId: string) =>
    [...bookmarkKeys.all(), 'byProject', projectId] as const,
  palette:   (projectId: string) =>
    [...bookmarkKeys.all(), 'palette', projectId] as const,
};

// src/features/chat/messageMarkers/data/queryKeys.ts

export const chatMessageMarkerKeys = {
  all:      () => ['chatMessageMarkers'] as const,
  byChat:   (chatId: string) =>
    [...chatMessageMarkerKeys.all(), 'byChat', chatId] as const,
  byColor:  (projectId: string, colorKey?: string) =>
    [...chatMessageMarkerKeys.all(), 'byColor', projectId, colorKey ?? 'all'] as const,
  palette:  (projectId: string) =>
    [...chatMessageMarkerKeys.all(), 'palette', projectId] as const,
};
```

Required hooks:

**Personas:**

- `usePersonas()` — list ordered per Step 7.
- `usePersona(id: PersonaId)` — single persona.
- `useCreatePersona()` — mutation; validates not built-in; invalidates `personaKeys.list()`.
- `useUpdatePersona()` — mutation; validates not built-in; invalidates `personaKeys.byId(id)`, `personaKeys.list()`.
- `useDeletePersona()` — mutation; validates `!isBuiltIn`; on success invalidates `personaKeys.list()`.
- `useChatPersona(chatId: string)` — reads `chats.persona_id` + joins `personas`.
- `useSetChatPersona()` — mutation; updates `chats.persona_id`; invalidates `useChatPersona`.
- `usePersonaSettings()` / `useUpdatePersonaSettings()` — read/write `defaultPersonaId`.

**Model selection:**

- `useAvailableChatModels()` — returns the static visible model catalog in picker order.
- `useChatModel(chatId: string)` — resolves `chats.model_override_id` against the catalog and returns the effective chat model state.
- `useSetChatModel()` — mutation; updates `chats.model_override_id`; invalidates the active chat query/state.

**Reader bookmarks:**

- `useBookmarks(filter?: BookmarkFilter)` — list; ordered by `created_at DESC`, tie-breaker `id ASC`.
- `useBookmarksByFile(projectId, filePath)` — for gutter; ordered by `start_line ASC`, `id ASC`.
- `useBookmark(id: BookmarkId)` — single bookmark detail.
- `useCreateBookmark()` — mutation; seeds palette if first for project; dedup check; invalidates `bookmarkKeys.byFile(...)`, `bookmarkKeys.list(...)`.
- `useUpdateBookmark()` — mutation; invalidates `bookmarkKeys.byId(id)`, `bookmarkKeys.byFile(...)`.
- `useDeleteBookmark()` — mutation; invalidates `bookmarkKeys.byFile(...)`, `bookmarkKeys.list(...)`.
- `useBookmarkPalette(projectId)` — reads palette or seeds default.
- `useUpdateBookmarkPalette()` — mutation; validates `PaletteCodec`; blocks if a removed color is in use; invalidates `bookmarkKeys.palette(projectId)`.

**Chat message markers:**

- `useChatMessageMarkers(chatId)` — returns bookmarks and color tags for the active chat in message order.
- `useCreateChatMessageMarker()` — mutation; validates kind-specific rules; invalidates `chatMessageMarkerKeys.byChat(chatId)`.
- `useDeleteChatMessageMarker()` — mutation; invalidates `chatMessageMarkerKeys.byChat(chatId)` and color-index queries as needed.
- `useChatMessageColorPalette(projectId)` — reads the project message-color palette.
- `useUpdateChatMessageColorPalette()` — mutation; validates palette JSON; invalidates `chatMessageMarkerKeys.palette(projectId)`.
- `useProjectColoredMessages(projectId, colorKey?)` — returns color-tagged messages across chats for the current project.

---

## Error Handling

| Scenario | Behavior |
|---|---|
| Persona name conflict on save | Inline error "A persona with this name already exists." Confirm button disabled. |
| Delete built-in persona (client-side bypass) | Service throws `BuiltInPersonaDeletionError`. Surface "Cannot delete a built-in persona." |
| Persona deleted while active in a chat | `chats.persona_id` set to NULL via ON DELETE SET NULL. Chat continues with default behavior. |
| LLM stream aborted (`AbortError`) | Catch; set message status = `'stopped'`; apply partial-response preserve/discard rule. |
| Stop button tapped before stream starts | No-op; the abort controller is not yet set. Stop button should not be visible in this state. |
| Stored `model_override_id` is no longer present in the model catalog | Show the current model as unavailable, preserve the stored value, and let the user pick a replacement. |
| `buildChatSystemPrompt` receives `codeContext.text` > 800 chars | `buildCodeContextLayer` silently caps at 800; the layer is built from the capped text. |
| Selected-code preview text > 800 chars | Preview shows the first 5 lines (or 400 chars), with "… N more lines" truncation. The injected layer uses the 800-char cap. |
| Adjust-selection cancelled | Exit adjust mode; restore the original preview and active selection unchanged. |
| Mini chat exchange limit reached | Input hidden; "Continue in full chat →" shown. No auto-send or auto-expand. |
| Mini chat LLM error | Error rendered as a system message in the mini chat list. Allow retry. MUST NOT auto-expand to full chat. |
| Expand to full chat fails | Keep mini chat open. Show retry affordance. Do not auto-close. |
| Session reference token is malformed or stale | Render inert fallback text/chip; log diagnostics; do not navigate. |
| Bookmark duplicate on same location | `UNIQUE INDEX` violation at DB. Service surfaces "A bookmark already exists here — edit the existing one instead." |
| Bookmark note > 200 chars | Input field is length-limited in UI. Codec throws at service boundary. |
| Bookmark color_key not in current palette | Render with neutral fallback color. Log to diagnostics. Do NOT delete the bookmark. |
| Palette update removes a used color | UI blocks removal; shows "N bookmarks use this color — reassign them first." |
| Palette JSON malformed at read | `PaletteCodec` throws loudly. Palette is not applied; surface error. |
| Save capture from bookmark fails (extraction error) | Same behavior as Stage 2 `ExtractionFailedError`. Bookmark is unaffected. |
| Chat message marker references a missing palette color | Render the border with a neutral fallback; keep the marker row intact; log diagnostics. |
| Missing built-in persona at boot | Boot-time seeder reinserts the missing built-in persona. Existing user-defined personas are untouched. |
| `persona_id` in `chats` references a non-existent persona (race or corruption) | ON DELETE SET NULL means this shouldn't persist; if it does, treat as null (no persona) and log to diagnostics. |

---

## Architecture Contract Checks

| Constraint | How Stage 8 satisfies it |
|---|---|
| Feature co-location | Personas: `src/features/personas/`. Reader bookmarks: `src/features/bookmarks/`. Model selection: `src/features/chat/modelSelection/`. Chat prompt composition: `src/features/chat/promptComposition/`. Mini chat: `src/features/chat/mini/`. Message markers: `src/features/chat/messageMarkers/`. Barrel exports per architecture contract. |
| Extractor isolation | `buildChatSystemPrompt` is in `src/features/chat/promptComposition/`, never in `src/features/learning/extractor/`. No Stage 8 file imports from the extractor module. The extractor never imports from `src/features/personas/`. |
| Drizzle transactions | Reader bookmark create/update/delete and palette update are atomic. Persona CRUD is atomic. Chat message marker writes are atomic. |
| Embedding outside transaction | Stage 8 writes no embeddings. |
| Strict TS + branded IDs | `PersonaId`, `BookmarkId`, and `ChatMessageMarkerId` throughout. No raw strings cross service boundaries. External model IDs remain provider strings by design. |
| Zod at JSON boundaries | `PersonaRowCodec`, `BookmarkRowCodec`, `PaletteCodec`, `MarkColorCodec`, and message-marker palette codecs on every read/write. |
| Loud failures | Codec parse errors throw. Unique index violations throw. Built-in deletion throws. |
| TanStack query keys | `personaKeys`, `bookmarkKeys`, `chatMessageMarkerKeys` factories. No hardcoded arrays anywhere in Stage 8. |
| No silent reroute | Partial response threshold is declared and respected. Palette conflict blocks the UI action, never silently skips. |
| Thin route screens | All screens call hooks/services. No business logic in route files. |
| Card boundaries | No new capture or concept cards introduced. Mini chat uses simple message rows, not Stage 3 cards. No `variant`, `density`, `mode`, `isCompact`, or `isFull` props on any new component. |
| Capture immutability | Stage 8 never writes `rawSnippet`, `whatClicked`, `whyItMattered`, or `concept_hint_json`. |
| Stage 2 save contract | Mini chat saves and selected-code saves call the unchanged `prepareSaveCandidates` + `saveCapture` path. |
| Regression Guard | No flashcards, streaks, due queues, quiz language, or review pressure in any Stage 8 surface. Personas do not affect scores. Reader bookmarks and chat message markers do not affect scores. |

---

## Deliverables

### Persona system

1. `src/features/personas/data/schema.ts` — `personas` table definition
2. `src/features/personas/data/migrations/NNNN_personas.sql` — CREATE TABLE + ALTER TABLE chats ADD COLUMN persona_id and model_override_id
3. `src/features/personas/data/personaRepo.ts` — insert, update, delete (guards built-in), findById, findAll
4. `src/features/personas/data/seedBuiltInPersonas.ts` — seeds 4 built-ins; idempotent on rerun
5. `src/features/personas/data/queryKeys.ts` — `personaKeys`
6. `src/features/personas/codecs/persona.ts` — `PersonaRowCodec`, mappers
7. `src/features/personas/types/persona.ts` — `PersonaId`, branded ID + constructors + guards, `Persona`
8. `src/features/personas/hooks/usePersonas.ts`
9. `src/features/personas/hooks/usePersona.ts`
10. `src/features/personas/hooks/useCreatePersona.ts`
11. `src/features/personas/hooks/useUpdatePersona.ts`
12. `src/features/personas/hooks/useDeletePersona.ts`
13. `src/features/personas/hooks/useChatPersona.ts`
14. `src/features/personas/hooks/useSetChatPersona.ts`
15. `src/features/personas/hooks/usePersonaSettings.ts`
16. `src/features/personas/ui/PersonaListScreen.tsx`
17. `src/features/personas/ui/PersonaEditorScreen.tsx`
18. `src/features/personas/ui/ChatPersonaPickerSheet.tsx`

### Chat prompt composition

19. `src/features/chat/promptComposition/constants.ts` — `BASE_CHAT_SYSTEM_PROMPT`, `MINI_CHAT_SYSTEM_PROMPT`
20. `src/features/chat/promptComposition/types.ts` — `ChatPromptOptions`, `ChatCodeContext`, `ChatCodeContextKind`
21. `src/features/chat/promptComposition/buildChatSystemPrompt.ts`
22. `src/features/chat/promptComposition/buildCodeContextLayer.ts`
23. Update `src/features/learning/dot-connector/services/runSendInjection.ts` — add `persona` + `codeContext` params; call `buildChatSystemPrompt`
24. Update `src/features/learning/dot-connector/hooks/useSendWithInjection.ts` — forward new params

### Cancel in-flight

25. `src/features/chat/hooks/useCancelGeneration.ts`
26. `src/features/chat/ui/StopGeneratingButton.tsx`
27. Update `src/features/chat/hooks/useChatSend.ts` — integrate AbortController, `ChatMessageStatus`, partial-response threshold logic

### Selected-code preview

28. `src/features/chat/ui/SelectedCodePreview.tsx`
29. Update `src/features/chat/hooks/useChatComposer.ts` — add `codeContext` state + `setCodeContext()` + `removeCodeContext()` + adjust-selection state/handlers

### Line-level mini chat

30. `src/features/chat/mini/types.ts` — `MiniChatMessage`, `MiniChatSaveContext`
31. `src/features/chat/mini/constants.ts` — `MINI_CHAT_SYSTEM_PROMPT`, `MINI_CHAT_MAX_EXCHANGES = 5`
32. `src/features/chat/mini/buildMiniChatSystemPrompt.ts`
33. `src/features/chat/mini/buildLineRef.ts`
34. `src/features/chat/mini/useMiniChat.ts`
35. `src/features/chat/mini/LineMiniChat.tsx`
36. Update file viewer: add `GutterActionChip.tsx` (gutter tap → "Ask about this line" | "Bookmark this line")

### Reader bookmarks

37. `src/features/bookmarks/data/schema.ts` — `bookmarks` + `bookmark_palettes` tables
38. `src/features/bookmarks/data/migrations/NNNN_bookmarks.sql`
39. `src/features/bookmarks/data/bookmarkRepo.ts`
40. `src/features/bookmarks/data/paletteRepo.ts`
41. `src/features/bookmarks/data/defaultPalette.ts`
42. `src/features/bookmarks/data/queryKeys.ts` — `bookmarkKeys`
43. `src/features/bookmarks/codecs/bookmark.ts` — `BookmarkRowCodec`, `PaletteCodec`, `MarkColorCodec`, mappers
44. `src/features/bookmarks/types/bookmark.ts` — `BookmarkId`, `Bookmark`, `MarkColor`, `BookmarkFilter`
45. `src/features/bookmarks/hooks/useBookmarks.ts`
46. `src/features/bookmarks/hooks/useBookmarksByFile.ts`
47. `src/features/bookmarks/hooks/useBookmark.ts`
48. `src/features/bookmarks/hooks/useCreateBookmark.ts`
49. `src/features/bookmarks/hooks/useUpdateBookmark.ts`
50. `src/features/bookmarks/hooks/useDeleteBookmark.ts`
51. `src/features/bookmarks/hooks/useBookmarkPalette.ts`
52. `src/features/bookmarks/hooks/useUpdateBookmarkPalette.ts`
53. `src/features/bookmarks/ui/BookmarkSheet.tsx`
54. `src/features/bookmarks/ui/BookmarkListScreen.tsx`
55. `src/features/bookmarks/ui/PaletteEditorScreen.tsx`
56. `src/features/bookmarks/ui/GutterBookmarkDot.tsx`

### Model selection

57. `src/features/chat/modelSelection/modelCatalog.ts`
58. `src/features/chat/modelSelection/hooks/useAvailableChatModels.ts`
59. `src/features/chat/modelSelection/hooks/useChatModel.ts`
60. `src/features/chat/modelSelection/hooks/useSetChatModel.ts`
61. `src/features/chat/modelSelection/ui/ChatModelPickerSheet.tsx`

### Session references + flashback entry

62. `src/features/chat/messageRendering/parseSessionReferences.ts`
63. `src/features/chat/messageRendering/SessionReferenceChip.tsx`

### Code reader context polish

64. `src/features/chat/ui/SelectedCodeAdjuster.tsx`
65. Update file viewer / code reader surfaces to support syntax highlighting and the long-press selection-start indicator

### Chat message markers

66. `src/features/chat/messageMarkers/data/schema.ts`
67. `src/features/chat/messageMarkers/data/migrations/NNNN_chat_message_markers.sql`
68. `src/features/chat/messageMarkers/data/queryKeys.ts` — `chatMessageMarkerKeys`
69. `src/features/chat/messageMarkers/hooks/useChatMessageMarkers.ts`
70. `src/features/chat/messageMarkers/hooks/useCreateChatMessageMarker.ts`
71. `src/features/chat/messageMarkers/hooks/useDeleteChatMessageMarker.ts`
72. `src/features/chat/messageMarkers/hooks/useChatMessageColorPalette.ts`
73. `src/features/chat/messageMarkers/hooks/useUpdateChatMessageColorPalette.ts`
74. `src/features/chat/messageMarkers/ui/ChatMessageMarkerSheet.tsx`
75. `src/features/chat/messageMarkers/ui/ChatBookmarkTimeline.tsx`
76. `src/features/chat/messageMarkers/ui/ProjectMessageColorIndexScreen.tsx`
77. `src/features/chat/messageMarkers/types/messageMarker.ts`

---

## Tests

### Persona tests

- Built-in personas are seeded on first install; running the seeder a second time is idempotent
- Boot-time seeder reinserts a missing built-in persona without touching user-defined ones
- `personaRepo.delete` throws `BuiltInPersonaDeletionError` when `is_built_in = 1`
- `useDeletePersona` blocks the call if the target is built-in; surfaces an error
- User persona creation validates `PersonaRowCodec`; invalid `name` (too long) throws
- Duplicate persona name rejected by DB unique index and surfaced as inline error
- Cloning a built-in creates a user-defined persona (`is_built_in = 0`) with a new `PersonaId`
- Clone does not share an ID with the source built-in
- `usePersonas` returns built-in personas first (sort_order ASC), then user-defined (created_at ASC, name ASC tie-breaker)
- `useSetChatPersona` updates `chats.persona_id`; subsequent `useChatPersona` reflects the new value
- Persona deleted while active in a chat → `chats.persona_id = NULL` via ON DELETE SET NULL

### Prompt composition tests

- `buildChatSystemPrompt` with `persona = null` → output contains only LAYER 1 (no `---` separator)
- `buildChatSystemPrompt` with persona set → LAYER 2 appears after LAYER 1
- `buildChatSystemPrompt` with memories → LAYER 3 appears after LAYER 2 (or LAYER 1 if no persona)
- `buildChatSystemPrompt` with codeContext → LAYER 4 appears last
- `buildChatSystemPrompt` with all four layers → exact order: base → persona → memories → code
- `buildChatSystemPrompt` with empty memories array → LAYER 3 omitted; no double separator
- `buildChatSystemPrompt` with `codeContext = null` → LAYER 4 omitted
- Separator `\n\n---\n\n` appears exactly N-1 times for N non-empty layers
- No leading or trailing separator in the output
- `buildChatSystemPrompt` is deterministic: same inputs → identical output
- `buildCodeContextLayer` with `kind: 'line_anchor'` uses the correct header string
- `buildCodeContextLayer` with `kind: 'selected_code'` uses the correct header string
- `buildCodeContextLayer` with `kind: 'expanded_mini_chat'` uses the correct header string
- `codeContext.text` > 800 chars → truncated to 800 in the layer output
- `buildCodeContextLayer` with `filePath = null` and `startLine = null` → line info line omitted
- `BASE_CHAT_SYSTEM_PROMPT` is never referenced in any file under `src/features/learning/extractor/` (static import check)
- `BASE_APP_SYSTEM_PROMPT` (extractor constant) is never imported by any Stage 8 file (static import check)
- Mini chat uses `buildMiniChatSystemPrompt`, which does not call `buildChatSystemPrompt`
- `buildMiniChatSystemPrompt` output contains `MINI_CHAT_SYSTEM_PROMPT` and the code context layer and nothing else

### Model switching tests

- `useAvailableChatModels()` returns only visible catalog rows in picker order
- Selecting `Use default` sets `chats.model_override_id = NULL`
- Selecting a concrete model stores that model ID on the active chat
- Switching models does not clear persona selection
- Switching models does not clear the selected-code preview or current draft
- A missing `model_override_id` renders as unavailable instead of crashing the chat header

### Cancel tests

- `useCancelGeneration.startGeneration()` returns a new `AbortSignal` and stores the controller
- `useCancelGeneration.stopGenerating()` calls `abort()` on the current controller and clears the ref
- `useCancelGeneration.clearGeneration()` clears the ref without calling abort
- `AbortError` from the LLM stream sets message status to `'stopped'`
- Abort with 0 tokens received → no assistant message row is created; the user message remains; no `[Generation stopped]` bubble appears
- Partial response ≥ 100 chars preserved with `[Generation stopped]` appended
- Partial response > 0 and < 100 chars discarded; message content is `[Generation stopped]` only
- Stop button is visible when `messageStatus === 'streaming'`
- Stop button is invisible when `messageStatus !== 'streaming'`
- Send button and Stop button are never simultaneously visible
- Stopping a generation does not remove the user message from the list
- Stopping a generation does not trigger a retry (no auto-resend)
- A stopped message (`status: 'stopped'`) does not block the next message send

### Selected-code preview tests

- `SelectedCodePreview` renders language chip when `language` is set
- `SelectedCodePreview` renders `filePath:startLine–endLine` when all are set
- `SelectedCodePreview` truncates code to 5 lines in the preview; shows "… N more lines" if longer
- `SelectedCodePreview` caps preview at 400 chars (presentation limit)
- Tapping "×" calls `onRemove`; `codeContext` in `useChatComposer` is cleared to null
- Tapping `Adjust` enters adjust-selection mode
- Clearing code context does not affect any existing messages in the chat
- Code context with text > 800 chars → layer uses exactly 800 chars (not more)
- When `selectedCodePreviewCollapsed` is true, the preview starts collapsed; language chip and location line remain visible

### Code reader polish tests

- Adjust-selection `Confirm` updates both the file-viewer selection and active `codeContext`
- Adjust-selection `Cancel` leaves the original range unchanged
- Syntax highlighting fallback for unsupported file type still preserves exact text and line numbering
- Long-pressing to begin a selection shows the start indicator immediately
- Cancelling a selection removes the start indicator
- The selection-start indicator is not persisted across remount or app restart

### Mini chat tests

- `buildMiniChatSystemPrompt` uses `MINI_CHAT_SYSTEM_PROMPT` as the base (not `BASE_CHAT_SYSTEM_PROMPT`)
- `useMiniChat` does not call the Dot Connector retrieval service
- `useMiniChat` does not accept or apply a persona
- Exchange counter increments by 1 after each complete user + assistant pair
- After 5 exchanges, `isAtLimit` is true; input is hidden in `LineMiniChat`
- At limit, "Continue in full chat →" is visible and calls `onExpandToChat`
- `onExpandToChat` receives the full message history and the original `lineRef`
- Expanding mini chat to full chat sets `codeContext.kind = 'expanded_mini_chat'` in the full chat
- Expanding mini chat to full chat seeds message history in the full chat
- "Save what clicked" on an assistant message calls `onSaveCapture` with `selectedMessageId` set correctly
- Mini chat save does NOT auto-close the mini chat sheet
- Mini chat LLM error shows in the message list; does not auto-expand to full chat
- `buildLineRef` caps `text` at 800, `precedingLines` at 300, `followingLines` at 300
- Tapping "Bookmark this line" chip does NOT open the mini chat
- Tapping "Ask about this line" chip does NOT open the bookmark sheet

### Session reference tests

- `parseSessionReferences` extracts valid `[[SESSION_REF:<id>|<title>]]` tokens from assistant messages
- Malformed session reference tokens render inertly and do not crash message rendering
- Tapping a rendered session reference opens the Stage 4 flashback surface
- Returning from flashback restores the chat draft and scroll position

### Reader bookmark tests

- Creating a bookmark on a project with no palette seeds `DEFAULT_PALETTE` first
- Creating a second bookmark on the same project does not re-seed the palette
- Dedup check: creating a bookmark on `(projectId, filePath, startLine, endLine)` that already exists is rejected; UI offers "Edit existing"
- `BookmarkRowCodec.parse` throws on `note` > 200 chars
- `BookmarkRowCodec.parse` throws on `id` that doesn't start with `bm_`
- Deleting a bookmark does not delete the capture referenced by `linked_capture_id`
- Deleting a concept that a bookmark's `linked_capture_id` points to leaves the bookmark intact (capture survives concept deletion per Stage 1 rules; bookmark survives capture deletion via ON DELETE SET NULL)
- Palette update validates `PaletteCodec`; invalid hex string throws
- Attempting to remove a color key used by ≥ 1 bookmark is blocked at service level with a count
- Palette change does not retroactively update `color_key` on existing bookmarks
- Bookmark with stale `color_key` renders without error (neutral fallback); the row is not deleted
- `useBookmarksByFile` returns bookmarks ordered by `start_line ASC`, `id ASC`
- `useBookmarks` with no filter ordered by `created_at DESC`, `id ASC`
- `useBookmarks` with `colorKey` filter returns only bookmarks with that color
- Empty state for all-bookmarks: shows "Tap a line in the file viewer…" string
- Empty state for filtered bookmarks: shows color/project-specific string
- Bookmark does not appear in Recent Captures, Concept List, Session Cards, or Knowledge Health
- `useCreateBookmark` invalidates `bookmarkKeys.byFile` and `bookmarkKeys.list` on success
- `useDeleteBookmark` invalidates `bookmarkKeys.byFile` and `bookmarkKeys.list` on success
- "Save capture from here" in BookmarkSheet triggers Stage 2 flow; `linkedCaptureId` on the bookmark is NOT automatically updated to the new capture's ID

### Chat message marker tests

- Long-pressing a chat bubble opens marker actions without affecting the message content
- A single message can store both a bookmark marker and a color tag
- Message bookmarks are returned in chat order for the timeline view
- Color-tagged messages are filterable by `colorKey` across chats in a project
- Message color palette updates validate via Zod and do not mutate reader bookmark palettes
- Message markers do not appear in Learning Hub sections and do not create captures or concepts

---

## Acceptance Criteria

<acceptance_criteria>
- Four built-in personas (Deep Diver, Teach Me, Pattern Spotter, Rubber Duck) are seeded at install and cannot be deleted by any user action.
- User-defined personas can be created, edited, cloned from built-ins, and deleted.
- Per-chat persona selection is stored in `chats.persona_id` and persists across app restarts.
- Per-chat model override is stored in `chats.model_override_id`; `NULL` means use the default model behavior.
- The global `defaultPersonaId` setting applies to new chats; existing chats retain their stored persona.
- Chat prompt composition follows the LOCKED four-layer order: BASE_CHAT_SYSTEM_PROMPT → persona layer → memories → code context.
- The extractor prompt composition from Stage 2 is completely untouched by Stage 8.
- No Stage 8 file imports from `src/features/learning/extractor/`; no extractor file imports from `src/features/personas/` or `src/features/chat/promptComposition/`.
- A "Stop generating" button appears while the LLM stream is in progress and replaces the send button.
- Tapping Stop aborts the stream. Partial response ≥ 100 chars is preserved with a `[Generation stopped]` label. Partial response < 100 chars is discarded.
- Stop does not clear the draft text, roll back saves, or trigger a retry.
- Selected-code preview appears in the composer when code context is set; "×" removes it without affecting the session.
- Selected-code preview supports an `Adjust` flow that updates the active selection without leaving chat.
- Code context is injected as LAYER 4 in the outbound system prompt, capped at 800 chars.
- "Ask in chat" and "Save" are distinct actions on a selection and MUST NOT share a button.
- The code reader shows syntax highlighting and an immediate long-press selection-start indicator.
- Line-level mini chat opens from the file viewer gutter without navigating away from the file.
- Mini chat does NOT use Dot Connector retrieval in this stage and does NOT show a persona picker.
- Mini chat caps at 5 exchanges; at the limit, "Continue in full chat →" is shown.
- Expanding mini chat to full chat seeds history and sets `codeContext.kind = 'expanded_mini_chat'`.
- Saves from mini chat go through the Stage 2 flow; mini chat does NOT auto-save.
- Valid session reference markers inside assistant messages open the shared Stage 4 flashback surface.
- Reader bookmarks are created per-project with a color from the project palette.
- The default palette (5 colors) is seeded per project on first bookmark creation.
- Palette changes do not retroactively change existing bookmark colors.
- Removing a color used by bookmarks is blocked until the user reassigns affected bookmarks.
- Deleting a bookmark does not affect any linked capture.
- Reader bookmarks do not appear in any Learning Hub section.
- A bookmark with a stale `color_key` renders with a neutral fallback color and is not deleted.
- Chat message bookmarks and color tags exist as separate chat-organization tools and do not create knowledge objects.
- All Stage 8 TanStack queries use `personaKeys`, `bookmarkKeys`, and `chatMessageMarkerKeys` factories; no hardcoded query key arrays.
- All Stage 8 JSON columns round-trip through Zod codecs; loud failure on malformed data.
- No new component accepts `variant`, `density`, `mode`, `isCompact`, or `isFull` props.
- No flashcards, streaks, due queues, quiz language, or review pressure appears anywhere in Stage 8 UI.
- Personas do not modify `familiarity_score`, `importance_score`, or any capture content field.
- Reader bookmarks do not modify `familiarity_score`, `importance_score`, or any capture content field.
- Chat message markers do not modify `familiarity_score`, `importance_score`, or any capture content field.
</acceptance_criteria>

---

## Anti-Regression Rules

<anti_regression_rules>

**Extractor isolation:**
Stage 8 MUST NOT modify any file under `src/features/learning/extractor/`. Persona layers MUST NEVER reach the extractor prompt. `buildChatSystemPrompt` and the extractor composition in `extractorPrompt.ts` are separate functions in separate modules with no shared imports of their base constants.

**Save flow:**
Mini chat saves and selected-code saves use the unchanged Stage 2 `prepareSaveCandidates` and `saveCapture` functions. Stage 8 does not introduce a lighter or faster save bypass path.

**Model switching:**
Changing the active model in chat affects only future sends in that chat. It MUST NOT reset the transcript, remove persona context, or bypass the locked prompt-composition order.

**Concept graph:**
Personas, reader bookmarks, chat message markers, and mini chat do NOT create concepts, link captures to concepts, trigger promotion clustering, or modify `familiarity_score` or `importance_score`.

**Capture immutability:**
Stage 8 never writes to `rawSnippet`, `whatClicked`, `whyItMattered`, `concept_hint_json`, or any other capture content field.

**Hub surfaces:**
Reader bookmarks and chat message markers are NOT added to any Learning Hub section (Recent Captures, Concept List, Session Cards, Knowledge Health, Promotion Suggestions). The Stage 4 Hub layout is preserved exactly.

**Card system:**
Stage 8 introduces no new capture or concept card components. Mini chat uses simple message row components. No `variant`, `density`, `mode`, `isCompact`, or `isFull` props are added to any card. Stage 3 prohibitions carry forward without exception.

**Session flashback:**
Stage 8 does not create a second flashback implementation. Session reference markers MUST open the single shared Stage 4 flashback surface.

**Regression Guard language:**
No flashcard, streak, due-queue, quiz, or score language appears in any Stage 8 user-facing surface. The Rubber Duck persona does not grade, score, or evaluate the user.

**Stage 7 Dot Connector:**
Stage 7's typing-time retrieval, send-time injection, `DotConnectorIndicator`, and `MemoryPreviewSheet` are preserved unchanged in behavior. Stage 8 adds `persona` and `codeContext` as additional inputs to the prompt composition step only; it does not alter the retrieval or formatting logic.

**Code reader UI:**
Syntax highlighting, selection-start indicators, and adjust-selection controls are presentation and active-context tools only. They MUST NOT write persistent knowledge data.

**Familiarity:**
`familiarity_score` is NEVER updated by Stage 8. Only `applyReviewRating` in Stage 7 writes it. This is enforced by the Stage 1 familiarity lifecycle rule and Stage 7's transaction guard.

**Auto-creation:**
Stage 8 MUST NOT auto-create concepts, captures, reader bookmarks, chat message markers, or review events without explicit user action.

</anti_regression_rules>

---

## Open Questions

<locked_decisions_clean_copy>
- Built-in personas = 4 (Deep Diver, Teach Me, Pattern Spotter, Rubber Duck) — LOCKED.
- Partial-response threshold = 100 chars — LOCKED.
- Mini chat exchange cap = 5 exchanges — LOCKED.
- Default palette = 5 colors (yellow, blue, red, green, purple) — LOCKED.
- Palette constraints = min 1, max 10 colors — LOCKED.
- Persona system prompt cap = 3,000 chars — LOCKED.
- Chat prompt layer order = base → persona → memories → code context — LOCKED.
- Code context text cap = 800 chars (inherits from Stage 2 source-text rule) — LOCKED.
- In-chat model metadata comes from a static local catalog — LOCKED.
- Session reference token format = `[[SESSION_REF:<sessionId>|<short title>]]` — LOCKED.
- Session reference markers, Session Cards, and concept provenance rows all open the same Stage 4 flashback surface — LOCKED.
- Mini chat prompt = `MINI_CHAT_SYSTEM_PROMPT` + code context layer; no persona, no Dot Connector in this stage — LOCKED for Stage 8.
- Adjust-selection updates unsaved active context only; it does not mutate saved captures or sent messages — LOCKED.
- Syntax-highlighting target visual language = VS Code Dark+ style palette — LOCKED.
- Chat message color palettes are separate from reader bookmark palettes — LOCKED.
- Mini chat Dot Connector opt-in — no retrieval by default; a future spec MAY add lightweight retrieval (max 3 items, no injection UI). Not a Stage 8 blocker.
- Bookmark–capture auto-link — `linked_capture_id` is manual/informational for now; a future spec may define an auto-link flow.
- Per-project palette sync — single-device for now; deferred with any future cross-device sync stage.
- `cancelPreservesPartialThreshold` advanced setting — expose in main settings only if the default (100 chars) proves confusing in practice.
- Built-in persona prompt text — the four `systemPromptLayer` strings are starting points; may be refined after real usage data.
</locked_decisions_clean_copy>

Legacy encoded bullets below express the same decisions and are superseded by the clean copy above.

🟢 Built-in personas = 4 (Deep Diver, Teach Me, Pattern Spotter, Rubber Duck) — LOCKED.
🟢 Partial-response threshold = 100 chars — LOCKED.
🟢 Mini chat exchange cap = 5 exchanges — LOCKED.
🟢 Default palette = 5 colors (yellow, blue, red, green, purple) — LOCKED.
🟢 Palette constraints = min 1, max 10 colors — LOCKED.
🟢 Persona system prompt cap = 3,000 chars — LOCKED.
🟢 Chat prompt layer order = base → persona → memories → code context — LOCKED.
🟢 Code context text cap = 800 chars (inherits from Stage 2 source-text rule) — LOCKED.
🟢 Mini chat prompt = `MINI_CHAT_SYSTEM_PROMPT` + code context layer; no persona, no Dot Connector in this stage — LOCKED for Stage 8.
🟡 Mini chat Dot Connector opt-in — no retrieval by default; a future spec MAY add lightweight retrieval (max 3 items, no injection UI). Not a Stage 8 blocker.
🟡 Bookmark–capture auto-link — `linked_capture_id` is manual/informational for now; a future spec may define an auto-link flow.
🟡 Per-project palette sync — single-device for now; deferred with any future cross-device sync stage.
🟡 `cancelPreservesPartialThreshold` advanced setting — expose in main settings only if the default (100 chars) proves confusing in practice.
🟡 Built-in persona prompt text — the four `systemPromptLayer` strings are starting points; may be refined after real usage data.
