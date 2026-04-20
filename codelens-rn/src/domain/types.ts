// ===== Identity =====

export type ProjectId = string & { readonly __brand: 'ProjectId' };
export type FileId = string & { readonly __brand: 'FileId' };
export type ChatId = string & { readonly __brand: 'ChatId' };
export type MessageId = string & { readonly __brand: 'MessageId' };
export type ConceptId = string & { readonly __brand: 'ConceptId' };
export type SessionId = string & { readonly __brand: 'SessionId' };
export type FolderId = string & { readonly __brand: 'FolderId' };

export const id =
  <T extends string>(_brand: T) =>
  (raw: string) =>
    raw as string & { __brand: T };

export const projectId = id<'ProjectId'>('ProjectId');
export const fileId = id<'FileId'>('FileId');
export const chatId = id<'ChatId'>('ChatId');
export const messageId = id<'MessageId'>('MessageId');
export const conceptId = id<'ConceptId'>('ConceptId');
export const sessionId = id<'SessionId'>('SessionId');
export const folderId = id<'FolderId'>('FolderId');

// ===== Color / Marks =====

export type MarkColor = 'red' | 'green' | 'yellow' | 'blue' | 'purple';

export interface ColorLabels {
  red: string;
  green: string;
  yellow: string;
  blue: string;
  purple: string;
}

export interface LineMark {
  line: number;
  color: MarkColor;
  depth: number;
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
  githubUrl?: string | undefined;
  createdAt: string;
  recentFileIds: FileId[];
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
  projectId?: ProjectId | undefined;
  fileId?: FileId | undefined;
  startLine?: number | undefined;
  endLine?: number | undefined;
  folderId?: FolderId | undefined;
  conceptId?: ConceptId | undefined;
  modelOverride?: ChatModelOverride | undefined;
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
  fallbackModels: Record<Provider, string[]>;
  allowCrossProviderFallback: boolean;
  freeTierFallbacksOnly: boolean;
}

export interface ChatModelOverride {
  provider: Provider;
  model: string;
  fallbackModels?: Record<Provider, string[]> | undefined;
  allowCrossProviderFallback?: boolean | undefined;
  freeTierFallbacksOnly?: boolean | undefined;
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
  rawSnippet: string;
}

export interface Concept {
  id: ConceptId;
  name: string;
  summary: string;
  taxonomy: ConceptTaxonomy;
  sessionIds: SessionId[];
  strength: number;
  createdAt: string;
  updatedAt: string;
}

export interface ConceptTaxonomy {
  domain?: string | undefined;
  subdomain?: string | undefined;
  pattern?: string | undefined;
  language?: string | undefined;
  tags: string[];
}

export interface ConceptLink {
  fromId: ConceptId;
  toId: ConceptId;
  kind: 'related' | 'prereq' | 'example-of';
  weight: number;
}

export interface Embedding {
  conceptId: ConceptId;
  model: string;
  api: Provider;
  signature: string;
  vector: Float32Array;
  updatedAt: string;
}

// ===== Vector store query =====

export interface TopMatchesQuery {
  vector: Float32Array;
  candidateIds?: ConceptId[] | undefined;
  limit: number;
}

export interface TopMatch {
  id: ConceptId;
  cosine: number;
  score: number;
}

// ===== UI state (zustand, not persisted to SQLite) =====

export type CodeInteractionMode = 'view' | 'mark';

export interface SelectionState {
  isRangeSelectMode: boolean;
  startLine: number | null;
  endLine: number | null;
  lastClickedLine: number | null;
}
