# CodeLens Design & UI Prompt for Google Stitch

> **Context:** This document provides the locked design system, component architecture, and product constraints for CodeLens. Use this as your system prompt or reference when generating UI for the React Native app.

## 1. Product Identity & Core Truths
CodeLens is a capture-first code understanding app.
- **Captures are primary:** A capture is one moment of understanding grounded in real code or chat context.
- **Concepts emerge later:** A concept is a pattern across captures, organized explicitly by the user.
- **No flashcards:** There is no Anki, quiz, streak, or due-queue system.
- **Graph is concept-only:** The visual graph only shows concepts, never captures.

## 2. Design System (Theme Specs)

Adhere strictly to these design tokens.

### Colors
- `background`: `#0f1117` (Root view, splash)
- `surface`: `#1a1d27` (Card / input background)
- `surfaceLight`: `#252836` (Elevated surface, chips)
- `primary`: `#608bdb` (Primary actions, accent)
- `primaryLight`: `#7ea3e8` (Pressed / hover state)
- `text`: `#f4f7ff` (Primary text)
- `textSecondary`: `#8b92a8` (Hints, metadata)
- `border`: `#2a2d3a` (Dividers, outlines)
- `red`: `#e06c75` (Destructive / error)
- `green`: `#98c379` (Success / saved)
- `yellow`: `#e5c07b` (Warning)
- `blue`: `#61afef` (Info / link)
- `purple`: `#c678dd` (Learning scope accent)

### Typography
- System fonts only (no custom family). Monospace reserved for code/models.
- `sm`: 12px, 400 weight (Small labels, hints)
- `md`: 14px, 400 weight (Body default)
- `lg`: 16px, 500–600 weight (Subtitles, card titles)
- `xl`: 20px, 700 weight (Section titles)
- `xxl`: 24px, 700 weight (Screen titles)

### Spacing & Radii
- **Spacing:** `xs: 4px`, `sm: 8px`, `md: 16px`, `lg: 24px`, `xl: 32px`
- **Radii:** `sm: 6px`, `md: 8px`, `lg: 12px`, `pill: 28px`
- **Elevation/Opacity:** 
  - Card Shadow: `{ offset: {width: 0, height: 2}, opacity: 0.25, radius: 4, elevation: 4 }`
  - Disabled opacity: `0.5`
  - Overlay opacity: `0.6`

## 3. Component Architecture (Locked Decisions)

### The Card System
We use **purpose-built cards**. Do NOT create a generic "BaseCard" and pass `variant` or `density` props. Each card type must be an independent component:
1. `CandidateCaptureCard`: For the save modal. Truncates long content.
2. `CaptureCardCompact`: For lists. Scans quickly, no inline expansion.
3. `CaptureCardFull`: For detail views. Shows full snippets, scrolls on mobile.
4. `ConceptCardCompact`: For the Learning Hub. 
5. `ConceptCardFull`: Detail view for a concept.
6. `CaptureChip`: Small inline representation.

**Shared Primitives** (allowed inside cards):
- `ConceptTypeChip`, `StrengthIndicator`, `StateChip`, `SourceBreadcrumb`, `LanguageChip`.

### Key UI Surfaces
- **Save Modal:** Shows 1-3 `CandidateCaptureCard`s. Saving one candidate does not save others. No "Save All" button.
- **Learning Hub:**
  - **Recent Captures:** Uses compact cards, shows unresolved and linked captures.
  - **Concept List:** Uses compact cards, ordered weakest-first by default.
  - **Session Cards:** Secondary metadata only.
  - **Knowledge Health:** A dashboard entry, but absolutely NO quiz/streak language.
- **Review Mode:** An explicit screen to review weak concepts and update familiarity (via self-rating, not a quiz).
- **Dot Connector:** Additive chat injection UI. Shows a `DotConnectorIndicator` and a preview sheet for retrieved context.
- **Mini Chat:** Capped at 5 exchanges, line-level code chat.
- **Graph Canvas:** Read-only concept graph using Skia. Maximum 300 nodes. Features Structure, Recency, and Strength modes.

## 4. Layout & Technical Constraints
- **Framework:** React Native.
- **Layout:** Flexbox (Yoga) for normal UI. Use `FlashList` for large lists instead of `ScrollView`.
- **Performance:** Avoid dynamic height reflows where possible.
- **Component Rules:** Keep cards callback-driven only. Cards must never call the database or repositories directly.
- **Visual Aesthetics:** Dark mode by default (using the tokens above). Ensure the UI feels modern, "alive," and polished with consistent spacing and interactive feedback (e.g., pressed states using `primaryLight`).

## 5. Instructions for Stitch
When generating UI code based on this prompt:
1. Only use the color hex codes and spacing values provided above.
2. Create separate components for compact vs. full cards rather than using complex conditional rendering inside a single card.
3. Keep the styling clean and strictly aligned to the dark theme tokens.
4. Assume standard React Native primitives (`View`, `Text`, `Pressable`, `StyleSheet` or inline styles using the tokens).
