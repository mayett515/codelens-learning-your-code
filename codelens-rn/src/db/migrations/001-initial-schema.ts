import type { Migration } from './index';

export const migration001: Migration = {
  version: 1,
  up: [
    `CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      source TEXT NOT NULL CHECK(source IN ('github', 'paste')),
      github_url TEXT,
      created_at TEXT NOT NULL,
      recent_file_ids TEXT NOT NULL DEFAULT '[]'
    )`,

    `CREATE TABLE IF NOT EXISTS files (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      path TEXT NOT NULL,
      content TEXT NOT NULL,
      marks TEXT NOT NULL DEFAULT '[]',
      ranges TEXT NOT NULL DEFAULT '[]'
    )`,

    `CREATE TABLE IF NOT EXISTS chats (
      id TEXT PRIMARY KEY,
      scope TEXT NOT NULL CHECK(scope IN ('section', 'general', 'learning')),
      project_id TEXT,
      file_id TEXT,
      start_line INTEGER,
      end_line INTEGER,
      folder_id TEXT,
      concept_id TEXT,
      title TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,

    `CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      chat_id TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
      content TEXT NOT NULL,
      created_at TEXT NOT NULL
    )`,

    `CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_created
    ON chat_messages(chat_id, created_at)`,

    `CREATE TABLE IF NOT EXISTS learning_sessions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      source TEXT NOT NULL CHECK(source IN ('chat', 'bubble')),
      source_chat_id TEXT NOT NULL,
      concept_ids TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      raw_snippet TEXT NOT NULL
    )`,

    `CREATE TABLE IF NOT EXISTS concepts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      summary TEXT NOT NULL,
      taxonomy TEXT NOT NULL DEFAULT '{"tags":[]}',
      session_ids TEXT NOT NULL DEFAULT '[]',
      strength REAL NOT NULL DEFAULT 0.5,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,

    `CREATE TABLE IF NOT EXISTS concept_links (
      from_id TEXT NOT NULL,
      to_id TEXT NOT NULL,
      kind TEXT NOT NULL CHECK(kind IN ('related', 'prereq', 'example-of')),
      weight REAL NOT NULL DEFAULT 0.5,
      PRIMARY KEY (from_id, to_id)
    )`,

    `CREATE TABLE IF NOT EXISTS embeddings_meta (
      concept_id TEXT PRIMARY KEY,
      model TEXT NOT NULL,
      api TEXT NOT NULL,
      signature TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,

    `CREATE UNIQUE INDEX IF NOT EXISTS idx_chats_concept_learning
    ON chats(concept_id) WHERE scope = 'learning' AND concept_id IS NOT NULL`,
  ],
};
