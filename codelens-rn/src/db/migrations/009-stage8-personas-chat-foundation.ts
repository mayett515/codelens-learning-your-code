import type { Migration } from './index';

export const migration009: Migration = {
  version: 9,
  up: [
    `CREATE TABLE IF NOT EXISTS personas (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      system_prompt_layer TEXT NOT NULL,
      icon_emoji TEXT,
      is_built_in INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 100,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_personas_name ON personas(name)`,
    `CREATE INDEX IF NOT EXISTS idx_personas_sort ON personas(sort_order ASC, name ASC)`,
    `ALTER TABLE chats ADD COLUMN persona_id TEXT REFERENCES personas(id) ON DELETE SET NULL`,
    `ALTER TABLE chats ADD COLUMN model_override_id TEXT`,
  ],
};
