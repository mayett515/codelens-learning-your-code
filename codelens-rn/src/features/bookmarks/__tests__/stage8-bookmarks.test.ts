import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { migration010 } from '../../../db/migrations/010-stage8-reader-bookmarks';
import { BookmarkRowCodec, PaletteCodec } from '../codecs/bookmark';
import { DEFAULT_PALETTE } from '../data/defaultPalette';

const testDir = dirname(fileURLToPath(import.meta.url));
const validBookmarkId = `bm_${'a'.repeat(21)}`;
const validCaptureId = `lc_${'b'.repeat(21)}`;

describe('Stage 8 reader bookmarks', () => {
  it('defines the reader bookmark migration with location uniqueness and palette storage', () => {
    const migrationIndex = readFileSync(join(testDir, '../../../db/migrations/index.ts'), 'utf8');
    const sql = migration010.up.join('\n');

    expect(migration010.version).toBe(10);
    expect(migrationIndex).toContain('migration010');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS bookmarks');
    expect(sql).toContain('linked_capture_id TEXT REFERENCES learning_captures(id) ON DELETE SET NULL');
    expect(sql).toContain('CREATE UNIQUE INDEX IF NOT EXISTS idx_bookmarks_location');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS bookmark_palettes');
  });

  it('validates bookmark rows, ids, note length, and optional linked captures', () => {
    const row = BookmarkRowCodec.parse({
      id: validBookmarkId,
      projectId: 'project-1',
      filePath: 'src/example.ts',
      startLine: 3,
      endLine: 3,
      colorKey: 'yellow',
      note: 'look again',
      linkedCaptureId: validCaptureId,
      sessionId: null,
      createdAt: 1,
      updatedAt: 1,
    });

    expect(row.id).toBe(validBookmarkId);
    expect(() => BookmarkRowCodec.parse({ ...row, id: 'bad' })).toThrow();
    expect(() => BookmarkRowCodec.parse({ ...row, note: 'x'.repeat(201) })).toThrow();
    expect(() => BookmarkRowCodec.parse({ ...row, endLine: 2 })).toThrow();
  });

  it('validates palette constraints and keeps the default palette in spec shape', () => {
    expect(PaletteCodec.parse(DEFAULT_PALETTE)).toHaveLength(5);
    expect(DEFAULT_PALETTE.map((color) => color.key)).toEqual([
      'yellow',
      'blue',
      'red',
      'green',
      'purple',
    ]);
    expect(() =>
      PaletteCodec.parse([{ key: 'bad key', label: 'Bad', hex: '#FFFFFF' }]),
    ).toThrow();
    expect(() =>
      PaletteCodec.parse([{ key: 'ok', label: 'Bad', hex: 'white' }]),
    ).toThrow();
  });

  it('wires the project viewer chip into bookmark create/edit and save-capture flow', () => {
    const projectSource = readFileSync(join(testDir, '../../../../app/project/[id].tsx'), 'utf8');

    expect(projectSource).toContain('useBookmarksByFile');
    expect(projectSource).toContain('BookmarkSheet');
    expect(projectSource).toContain('bookmarkIndicators');
    expect(projectSource).toContain('TODO(stage8-followup): persist bookmark provenance on captures');
    expect(projectSource).toContain("mode={bookmarkTarget.bookmark ? 'edit' : 'create'}");
  });

  it('renders gutter bookmark dots through CodeViewer without changing mark storage', () => {
    const codeViewerSource = readFileSync(join(testDir, '../../../ui/components/CodeViewer.tsx'), 'utf8');
    const projectSource = readFileSync(join(testDir, '../../../../app/project/[id].tsx'), 'utf8');

    expect(codeViewerSource).toContain('bookmarkIndicators');
    expect(codeViewerSource).toContain('GutterBookmarkDot');
    expect(projectSource).not.toContain('updateFileMarks(currentFile.id, bookmark');
  });
});
