import { sqliteTable, text, integer, real, primaryKey } from 'drizzle-orm/sqlite-core';

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
});

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
