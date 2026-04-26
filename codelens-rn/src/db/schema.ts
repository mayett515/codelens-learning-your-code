import { sqliteTable, text, integer, real, primaryKey, index, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  source: text('source', { enum: ['github', 'paste'] }).notNull(),
  githubUrl: text('github_url'),
  createdAt: text('created_at').notNull(),
  recentFileIds: text('recent_file_ids', { mode: 'json' })
    .notNull()
    .$type<string[]>()
    .default([]),
});

export const files = sqliteTable('files', {
  id: text('id').primaryKey(),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  path: text('path').notNull(),
  content: text('content').notNull(),
  marks: text('marks', { mode: 'json' }).notNull().$type<
    Array<{ line: number; color: string; depth: number }>
  >().default([]),
  ranges: text('ranges', { mode: 'json' }).notNull().$type<
    Array<{
      startLine: number;
      endLine: number;
      color: string;
      depth: number;
    }>
  >().default([]),
});

export const chats = sqliteTable('chats', {
  id: text('id').primaryKey(),
  scope: text('scope', { enum: ['section', 'general', 'learning'] }).notNull(),
  projectId: text('project_id'),
  fileId: text('file_id'),
  startLine: integer('start_line'),
  endLine: integer('end_line'),
  folderId: text('folder_id'),
  conceptId: text('concept_id'),
  modelOverride: text('model_override', { mode: 'json' }).$type<{
    provider: 'openrouter' | 'siliconflow';
    model: string;
    fallbackModels?: {
      openrouter: string[];
      siliconflow: string[];
    } | undefined;
    allowCrossProviderFallback?: boolean | undefined;
    freeTierFallbacksOnly?: boolean | undefined;
  } | null>(),
  title: text('title').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const chatMessages = sqliteTable('chat_messages', {
  id: text('id').primaryKey(),
  chatId: text('chat_id')
    .notNull()
    .references(() => chats.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['user', 'assistant', 'system'] }).notNull(),
  content: text('content').notNull(),
  createdAt: text('created_at').notNull(),
});

export const learningSessions = sqliteTable('learning_sessions', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  source: text('source', { enum: ['chat', 'bubble'] }).notNull(),
  sourceChatId: text('source_chat_id').notNull(),
  conceptIds: text('concept_ids', { mode: 'json' })
    .notNull()
    .$type<string[]>()
    .default([]),
  createdAt: text('created_at').notNull(),
  rawSnippet: text('raw_snippet').notNull(),
});

export const concepts = sqliteTable('concepts', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  summary: text('summary').notNull(),
  normalizedKey: text('normalized_key').notNull().default(''),
  canonicalSummary: text('canonical_summary'),
  conceptType: text('concept_type', {
    enum: [
      'mechanism',
      'mental_model',
      'pattern',
      'architecture_principle',
      'language_feature',
      'api_idiom',
      'data_structure',
      'algorithmic_idea',
      'performance_principle',
      'debugging_heuristic',
      'failure_mode',
      'testing_principle',
    ],
  }).notNull().default('mental_model'),
  coreConcept: text('core_concept'),
  architecturalPattern: text('architectural_pattern'),
  programmingParadigm: text('programming_paradigm'),
  languageOrRuntime: text('language_or_runtime_json', { mode: 'json' }).notNull().$type<string[]>().default([]),
  surfaceFeatures: text('surface_features_json', { mode: 'json' }).notNull().$type<string[]>().default([]),
  prerequisites: text('prerequisites_json', { mode: 'json' }).notNull().$type<string[]>().default([]),
  relatedConcepts: text('related_concepts_json', { mode: 'json' }).notNull().$type<string[]>().default([]),
  contrastConcepts: text('contrast_concepts_json', { mode: 'json' }).notNull().$type<string[]>().default([]),
  representativeCaptureIds: text('representative_capture_ids_json', { mode: 'json' }).notNull().$type<string[]>().default([]),
  familiarityScore: real('familiarity_score').notNull().default(0),
  importanceScore: real('importance_score').notNull().default(0),
  languageSyntaxLegacy: text('language_syntax_legacy'),
  taxonomy: text('taxonomy', { mode: 'json' }).notNull().$type<{
    domain?: string | undefined;
    subdomain?: string | undefined;
    pattern?: string | undefined;
    language?: string | undefined;
    tags: string[];
  }>().default({ tags: [] }),
  sessionIds: text('session_ids', { mode: 'json' })
    .notNull()
    .$type<string[]>()
    .default([]),
  strength: real('strength').notNull().default(0.5),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (t) => [
  uniqueIndex('unique_concepts_normalized_key').on(t.normalizedKey),
  index('idx_concepts_concept_type').on(t.conceptType),
]);

export const learningCaptures = sqliteTable('learning_captures', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  whatClicked: text('what_clicked').notNull(),
  whyItMattered: text('why_it_mattered'),
  rawSnippet: text('raw_snippet').notNull(),
  snippetLang: text('snippet_lang'),
  snippetSourcePath: text('snippet_source_path'),
  snippetStartLine: integer('snippet_start_line'),
  snippetEndLine: integer('snippet_end_line'),
  chatMessageId: text('chat_message_id'),
  sessionId: text('session_id'),
  state: text('state', { enum: ['unresolved', 'linked', 'proposed_new'] }).notNull().default('unresolved'),
  linkedConceptId: text('linked_concept_id').references(() => concepts.id, { onDelete: 'set null' }),
  editableUntil: integer('editable_until').notNull(),
  extractionConfidence: real('extraction_confidence'),
  derivedFromCaptureId: text('derived_from_capture_id'),
  embeddingStatus: text('embedding_status', { enum: ['pending', 'ready', 'failed'] }).notNull().default('pending'),
  embeddingRetryCount: integer('embedding_retry_count').notNull().default(0),
  conceptHint: text('concept_hint_json', { mode: 'json' }).$type<unknown | null>(),
  keywords: text('keywords_json', { mode: 'json' }).notNull().$type<string[]>().default([]),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (t) => [
  index('idx_captures_state').on(t.state),
  index('idx_captures_linked_concept').on(t.linkedConceptId),
  index('idx_captures_session').on(t.sessionId),
  index('idx_captures_created_at').on(t.createdAt),
]);

export const conceptLinks = sqliteTable('concept_links', {
  fromId: text('from_id').notNull(),
  toId: text('to_id').notNull(),
  kind: text('kind', {
    enum: ['related', 'prereq', 'example-of'],
  }).notNull(),
  weight: real('weight').notNull().default(0.5),
}, (t) => [
  primaryKey({ columns: [t.fromId, t.toId] }),
]);

export const embeddingsMeta = sqliteTable('embeddings_meta', {
  conceptId: text('concept_id').primaryKey(),
  model: text('model').notNull(),
  api: text('api').notNull(),
  signature: text('signature').notNull(),
  updatedAt: text('updated_at').notNull(),
});
