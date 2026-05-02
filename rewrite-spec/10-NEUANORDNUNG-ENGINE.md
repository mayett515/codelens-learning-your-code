# Phase 10: "Neuanordnung" (Rearrangement) Engine

## 1. Core Intent
The "Neuanordnung" engine is CodeLens's mobile-first visual code refactoring planner. It addresses the friction of performing complex structural code changes on a mobile device by shifting the paradigm from "text editing" to "visual intent mapping". 

Using a highly tactile "Slime & Glass" UI, developers can reorder functions, extract logic, and apply project-wide pattern sweeps using simple taps and gestures. These interactions generate a strict, deterministic schema (Semantic Refactor JSON - SRJ) which is then executed by the LLM backend (either locally or on desktop handoff).

## 2. Technical Stack & Research Findings (2025/2026 Standards)

### What the Research Showed
To make the "Slime & Glass" UI perfectly fluid without dropping frames on mobile, we must build on the React Native "New Architecture" (Fabric). The 2025/2026 landscape points clearly to these cutting-edge tools:
1.  **Animations (The "Slime" & Layout swaps):** **Reanimated 3/4** using `LinearTransition`. This makes tap-to-swap Up/Down arrows animate the layout instantly without complex math.
2.  **The "Glass" (Bottom Sheets):** **Gorhom Bottom Sheet (v5+)**. It hooks directly into Reanimated to give us perfectly smooth, frosted glass overlays for the "Merge/Extract" standard refactoring questions.
3.  **Drag & Drop (If needed):** **Reanimated DnD**. A modern library built specifically for the New Architecture that avoids the classic React Native list "jank" for drag operations.

### Implementation Stack
To achieve 60fps+ fluid animations on mobile while handling complex state, the engine relies on:

*   **Animations & Layout Transitions:** `react-native-reanimated` (v3/4).
*   **Gestures:** `react-native-gesture-handler` for fluid, physics-based interactions.
*   **Bottom Sheets ("Glass" UI):** `@gorhom/bottom-sheet` (v5+).
*   **Drag and Drop (Optional / Progressive Enhancement):** `react-native-reanimated-dnd`.
*   **State Management:** `zustand`. A dedicated, localized store to construct the `Semantic Refactor JSON` strictly in memory as the user taps, preventing UI thread blockage.

## 3. UI Paradigm: Slime & Glass, Nudge & Sweep
The UX is built around reducing drag-and-drop fatigue, which is common in mobile tree-view editors.

### 3.1 The "Bubble" (Node Representation)
Code blocks (functions, classes, interfaces) are represented as tactile "bubbles". 
Instead of forcing the user to long-press and drag a bubble across a 2000-line file:
*   **The Nudge Controls:** Each bubble features prominent `↑` and `↓` tap targets. Tapping these utilizes Reanimated's `LinearTransition` to instantly and smoothly swap the node with its neighbor.
*   **The "Slime" Tension:** When a node is moved, visual cues (SVG curves or layout spring animations) represent the dependencies (imports/exports) stretching or breaking.

### 3.2 The "Glass" (Quick Actions Bottom Sheet)
Tapping a bubble summons a frosted-glass bottom sheet (`@gorhom/bottom-sheet`) containing standard, high-level refactoring intents. This removes the need to type prompts for common tasks:
*   **Merge (Inline):** Inline the function into its callers.
*   **Extract:** Split the node into smaller helpers.
*   **Move to File...:** Relocate the node to a new or existing module.
*   **Modernize:** Convert paradigms (e.g., Classes to Hooks, Callbacks to Async/Await).

### 3.3 The "Vermerken" System (Project-Wide Sweeps)
A critical feature for making mobile refactoring powerful. When a user applies a structural or stylistic change to a single node, the engine prompts the user to convert this local change into a global rule.
*   **Local Action:** User selects "Update to use Theme Context" on a specific React component.
*   **The Sweep Prompt:** "Apply this pattern project-wide? [Just Here] [Entire Project]"
*   **Result:** This doesn't trigger heavy mobile AST parsing. Instead, it adds a `global_sweeps` directive to the JSON schema, instructing the LLM to hunt for and apply the pattern across the codebase during the execution phase.

## 4. State Model & Output Schema
The Zustand store maps 1:1 with the **Semantic Refactor JSON (SRJ)** format. This ensures that what the user sees is exactly what the LLM gets.

```typescript
// Zustand Store Model / Output Schema
interface RefactoringJob {
  file_path: string;
  node_mutations: NodeMutation[];
  global_sweeps: GlobalSweep[];
}

interface NodeMutation {
  node_id: string; // e.g., "renderAvatar"
  action: "move" | "standard_intent" | "custom_prompt";
  
  // For 'move' actions (The Nudge controls)
  position?: "above" | "below" | "inside";
  target_node_id?: string;
  
  // For 'standard_intent' actions (The Glass bottom sheet)
  intent_type?: "MERGE_INTO_CALLER" | "EXTRACT_HELPERS" | "MOVE_TO_FILE" | "MODERNIZE";
  
  human_directive?: string; // Optional context added by user
}

interface GlobalSweep {
  trigger_node: string; // The reference implementation node
  detected_pattern: string; // Brief description (e.g., "Hardcoded hex colors")
  sweep_instruction: string; // The LLM directive (e.g., "Replace all hex with theme.colors.*")
}
```

## 5. Mobile Performance Strategy (JSI / Rust)
To populate the initial "Bubbles", the app must parse the source code.
*   **Avoid:** Running Babel/TypeScript parsers on the JS thread. It will crash or freeze the mobile app on large files.
*   **Adopt:** Use lightweight Rust-based parsers (like `swc` or `oxc`) exposed to React Native via JSI (JavaScript Interface).
*   **Scope:** The mobile app only performs *shallow, local* AST parsing. It extracts function signatures, class names, and immediate imports to render the UI. Deep, project-wide dependency resolution is deferred to the execution environment (desktop or cloud) where the SRJ is processed.
