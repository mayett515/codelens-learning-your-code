# State Model (TypeScript Types)

These types are the contract between layers. Put them in `src/domain/types.ts`. Every other file imports from here.

```ts
// ===== Identity =====

export type ProjectId = string & { readonly __brand: 'ProjectId' };
export type FileId = string & { readonly __brand: 'FileId' };
export type ChatId = string & { readonly __brand: 'ChatId' };
export type MessageId = string & { readonly __brand: 'MessageId' };
export type ConceptId = string & { readonly __brand: 'ConceptId' };
export type SessionId = string & { readonly __brand: 'SessionId' };
export type FolderId = string & { readonly __brand: 'FolderId' };

// ===== Color / Marks =====

export type MarkColor = 'red' | 'green' | 'yellow' | 'blue' | 'purple';

export interface ColorLabels {
  red: string; green: string; yellow: string; blue: string; purple: string;
}

export interface LineMark {
  line: number;       // 1-based
  color: MarkColor;
  depth: number;      // for nested same-color marks; 0 = base
}

export interface RangeMark {
  startLine: number;
  endLine: number;
  color: MarkColor;
  depth: number;
}

// ===== Project / File =====

export interface Project {
  id: ProjectId;
  name: string;
  source: 'github' | 'paste';
  githubUrl?: string;
  createdAt: string;
  recentFileIds: FileId[];   // most-recent-first, max 8
}

export interface SourceFile {
  id: FileId;
  projectId: ProjectId;
  path: string;
  content: string;
  marks: LineMark[];
  ranges: RangeMark[];
}

// ===== Chat =====

export type ChatScope = 'section' | 'general' | 'learning';

export interface Chat {
  id: ChatId;
  scope: ChatScope;
  projectId?: ProjectId;     // section/line chats only
  fileId?: FileId;
  startLine?: number;
  endLine?: number;
  folderId?: FolderId;       // general chats only
  conceptId?: ConceptId;     // learning chats only
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

export interface ChatMessage {
  id: MessageId;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
}

// ===== Provider config =====

export type Provider = 'openrouter' | 'siliconflow';

export interface ScopeModelConfig {
  provider: Provider;
  models: Record<Provider, string>;
}

export interface ChatConfig {
  section: ScopeModelConfig;
  general: ScopeModelConfig;
  learning: ScopeModelConfig;
}

// ===== Learning Hub =====

export interface LearningSession {
  id: SessionId;
  title: string;
  source: 'chat' | 'bubble';
  sourceChatId: ChatId;
  conceptIds: ConceptId[];
  createdAt: string;
  rawSnippet: string;        // for reference view
}

export interface Concept {
  id: ConceptId;
  name: string;
  summary: string;
  taxonomy: ConceptTaxonomy;
  sessionIds: SessionId[];
  strength: number;          // 0..1, decays/grows over time
  createdAt: string;
  updatedAt: string;
}

export interface ConceptTaxonomy {
  domain?: string;
  subdomain?: string;
  pattern?: string;
  language?: string;
  tags: string[];
}

export interface ConceptLink {
  fromId: ConceptId;
  toId: ConceptId;
  kind: 'related' | 'prereq' | 'example-of';
  weight: number;            // 0..1
}

export interface Embedding {
  conceptId: ConceptId;
  model: string;
  api: Provider;
  signature: string;         // hash of (name + summary), used for staleness
  vector: Float32Array;      // 384 or 768 dims depending on model
  updatedAt: string;
}

// ===== Vector store query =====

export interface TopMatchesQuery {
  vector: Float32Array;
  candidateIds?: ConceptId[];   // if set, restrict search to these
  limit: number;
}

export interface TopMatch {
  id: ConceptId;
  cosine: number;            // raw cosine similarity
  score: number;             // post-weighting score (recency-boosted, etc.)
}

// ===== UI state (zustand, not persisted to SQLite) =====

export type CodeInteractionMode = 'view' | 'mark';

export interface SelectionState {
  isRangeSelectMode: boolean;
  startLine: number | null;
  endLine: number | null;
  lastClickedLine: number | null;
}
```

## Persistence Mapping (Drizzle)

| Domain type | Table | Notes |
|---|---|---|
| Project | `projects` | `recentFileIds` stored as JSON column |
| SourceFile | `files` | `marks` / `ranges` JSON columns; consider splitting if perf hurts |
| Chat | `chats` | header row |
| ChatMessage | `chat_messages` | FK to chats, indexed `(chatId, createdAt)` |
| LearningSession | `learning_sessions` | `conceptIds` JSON |
| Concept | `concepts` | `taxonomy` and `sessionIds` JSON |
| ConceptLink | `concept_links` | composite PK `(fromId, toId)` |
| Embedding | `embeddings` (vec0 virtual table) | `vec` column is the vector |
| ChatConfig | MMKV key `chat_config` | small, sync-read at boot |
| ColorLabels | MMKV key `color_labels` | |
| API keys | `expo-secure-store`, key per provider | |

## Branded ID Pattern

All IDs are branded strings. Construct them with a single helper:

```ts
export const id = <T extends string>(brand: T) => (raw: string) => raw as string & { __brand: T };
export const projectId = id<'ProjectId'>('ProjectId');
```

Prevents passing a `ChatId` where a `ProjectId` is expected. Catches a real bug class at compile time.
