import type { Migration } from './index';

export const migration010: Migration = {
  version: 10,
  up: [
    `CREATE TABLE IF NOT EXISTS bookmarks (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      file_path TEXT NOT NULL,
      start_line INTEGER NOT NULL,
      end_line INTEGER NOT NULL,
      color_key TEXT NOT NULL,
      note TEXT,
      linked_capture_id TEXT REFERENCES learning_captures(id) ON DELETE SET NULL,
      session_id TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_bookmarks_location
      ON bookmarks(project_id, file_path, start_line, end_line)`,
    `CREATE INDEX IF NOT EXISTS idx_bookmarks_created ON bookmarks(created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_bookmarks_session ON bookmarks(session_id)`,
    `CREATE INDEX IF NOT EXISTS idx_bookmarks_project_file
      ON bookmarks(project_id, file_path, start_line ASC)`,
    `CREATE INDEX IF NOT EXISTS idx_bookmarks_color ON bookmarks(project_id, color_key)`,
    `CREATE TABLE IF NOT EXISTS bookmark_palettes (
      project_id TEXT PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
      palette_json TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    )`,
  ],
};
