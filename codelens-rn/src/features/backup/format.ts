/**
 * Single source of truth for archive + schema + app versioning.
 *
 * - FORMAT_VERSION: bump when the zip layout changes (new files, renames).
 * - SCHEMA_VERSION: must match the highest migration in src/db/migrations/index.ts.
 * - APP_VERSION: mirror package.json and app.json.
 */
export const FORMAT_VERSION = 1;
export const SCHEMA_VERSION = 2;
export const APP_VERSION = '1.0.0';

export const ARCHIVE_MAGIC = 'codelens-backup';
export const ARCHIVE_EXT = 'codelens';
