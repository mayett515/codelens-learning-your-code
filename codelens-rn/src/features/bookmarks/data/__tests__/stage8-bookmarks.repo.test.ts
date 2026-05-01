import { beforeEach, describe, expect, it, vi } from 'vitest';
import { bookmarks, bookmarkPalettes, learningCaptures } from '../../../../db/schema';
import { DEFAULT_PALETTE } from '../defaultPalette';
import type { DbOrTx } from '../../../../db/client';

const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    transaction: vi.fn(),
  },
}));

vi.mock('../../../../db/client', () => ({
  db: mockDb,
}));

import { createBookmark, deleteBookmark, updateBookmark } from '../bookmarkRepo';
import { updateBookmarkPalette } from '../paletteRepo';
import type { BookmarkId } from '../../types/bookmark';

type BookmarkRow = typeof bookmarks.$inferSelect;
type PaletteRow = typeof bookmarkPalettes.$inferSelect;
type CaptureRow = typeof learningCaptures.$inferSelect;

function makeBookmarkRow(overrides: Partial<BookmarkRow> = {}): BookmarkRow {
  return {
    id: 'bm_aaaaaaaaaaaaaaaaaaaaa',
    projectId: 'project-1',
    filePath: 'src/example.ts',
    startLine: 7,
    endLine: 7,
    colorKey: 'yellow',
    note: null,
    linkedCaptureId: null,
    sessionId: null,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

function makePaletteRow(overrides: Partial<PaletteRow> = {}): PaletteRow {
  return {
    projectId: 'project-1',
    paletteJson: JSON.stringify(DEFAULT_PALETTE),
    updatedAt: 1,
    ...overrides,
  };
}

function makeCaptureRow(): CaptureRow {
  return {
    id: 'lc_aaaaaaaaaaaaaaaaaaaaa',
    title: 'Capture',
    whatClicked: 'Clicked',
    whyItMattered: null,
    rawSnippet: 'const value = 1;',
    snippetLang: 'ts',
    snippetSourcePath: 'src/example.ts',
    snippetStartLine: 7,
    snippetEndLine: 7,
    chatMessageId: null,
    sessionId: null,
    state: 'unresolved',
    linkedConceptId: null,
    editableUntil: 1,
    extractionConfidence: null,
    derivedFromCaptureId: null,
    embeddingStatus: 'pending',
    embeddingRetryCount: 0,
    embeddingTier: 'hot',
    lastAccessedAt: null,
    conceptHint: null,
    keywords: [],
    createdAt: 1,
    updatedAt: 1,
  };
}

function makeExecutor(initial?: {
  bookmarkRows?: BookmarkRow[];
  paletteRows?: PaletteRow[];
  captureRows?: CaptureRow[];
}) {
  const state = {
    bookmarkRows: [...(initial?.bookmarkRows ?? [])],
    paletteRows: [...(initial?.paletteRows ?? [])],
    captureRows: [...(initial?.captureRows ?? [])],
  };

  const rowsFor = (table: unknown): unknown[] => {
    if (table === bookmarks) return state.bookmarkRows;
    if (table === bookmarkPalettes) return state.paletteRows;
    if (table === learningCaptures) return state.captureRows;
    return [];
  };

  const queryResult = (rows: unknown[]) => ({
    then: <TResult1 = unknown[], TResult2 = never>(
      onfulfilled?: ((value: unknown[]) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
    ) => Promise.resolve(rows).then(onfulfilled, onrejected),
    orderBy: () => Promise.resolve(rows),
    limit: (count: number) => Promise.resolve(rows.slice(0, count)),
  });

  const executor = {
    select: () => ({
      from: (table: unknown) => ({
        where: () => queryResult(rowsFor(table)),
        orderBy: () => Promise.resolve(rowsFor(table)),
      }),
    }),
    insert: (table: unknown) => ({
      values: (values: unknown) => {
        const incoming = Array.isArray(values) ? values : [values];
        if (table === bookmarks) {
          state.bookmarkRows.push(...(incoming as BookmarkRow[]));
        } else if (table === bookmarkPalettes) {
          state.paletteRows.push(...(incoming as PaletteRow[]));
        } else if (table === learningCaptures) {
          state.captureRows.push(...(incoming as CaptureRow[]));
        }
        return Promise.resolve();
      },
    }),
    update: (table: unknown) => ({
      set: (values: Record<string, unknown>) => ({
        where: () => {
          if (table === bookmarkPalettes && state.paletteRows[0]) {
            state.paletteRows[0] = { ...state.paletteRows[0], ...values };
          } else if (table === bookmarks && state.bookmarkRows[0]) {
            state.bookmarkRows[0] = { ...state.bookmarkRows[0], ...values };
          }
          return Promise.resolve();
        },
      }),
    }),
    delete: (table: unknown) => ({
      where: () => {
        if (table === bookmarks) state.bookmarkRows = [];
        return Promise.resolve();
      },
    }),
  };

  return { executor: executor as unknown as DbOrTx, state };
}

describe('bookmark repository behavior', () => {
  beforeEach(() => {
    mockDb.transaction.mockReset();
  });

  it('createBookmark rejects duplicate project/file/range locations', async () => {
    const { executor } = makeExecutor({
      bookmarkRows: [makeBookmarkRow()],
      paletteRows: [makePaletteRow()],
    });
    mockDb.transaction.mockImplementation((fn: (tx: DbOrTx) => Promise<unknown>) => fn(executor));

    await expect(createBookmark({
      projectId: 'project-1',
      filePath: 'src/example.ts',
      startLine: 7,
      endLine: 7,
      colorKey: 'yellow',
      note: null,
      sessionId: null,
    })).rejects.toThrow(/A bookmark already exists here/);
  });

  it('updateBookmarkPalette blocks removing colors used by bookmarks and allows unused removals', async () => {
    const blocked = makeExecutor({
      bookmarkRows: [makeBookmarkRow({ colorKey: 'yellow' })],
      paletteRows: [makePaletteRow()],
    });
    await expect(
      updateBookmarkPalette(
        'project-1',
        DEFAULT_PALETTE.filter((color) => color.key !== 'yellow'),
        2,
        blocked.executor,
      ),
    ).rejects.toThrow(/bookmark\(s\) use removed palette color/);

    const allowed = makeExecutor({
      bookmarkRows: [makeBookmarkRow({ colorKey: 'yellow' })],
      paletteRows: [makePaletteRow()],
    });
    await updateBookmarkPalette(
      'project-1',
      DEFAULT_PALETTE.filter((color) => color.key !== 'purple'),
      3,
      allowed.executor,
    );

    expect(allowed.state.paletteRows[0]?.updatedAt).toBe(3);
    expect(allowed.state.paletteRows[0]?.paletteJson).not.toContain('"purple"');
  });

  it('updateBookmark rejects colors outside the project palette', async () => {
    const { executor, state } = makeExecutor({
      bookmarkRows: [makeBookmarkRow()],
      paletteRows: [makePaletteRow()],
    });

    await expect(updateBookmark(
      'bm_aaaaaaaaaaaaaaaaaaaaa' as BookmarkId,
      {
        projectId: 'project-1',
        filePath: 'src/example.ts',
        startLine: 7,
        endLine: 7,
        colorKey: 'missing',
        note: null,
        sessionId: null,
      },
      4,
      executor,
    )).rejects.toThrow(/Palette color is not available/);

    expect(state.bookmarkRows[0]?.colorKey).toBe('yellow');
  });

  it('updateBookmarkPalette runs validation and write in a transaction by default', async () => {
    const { executor, state } = makeExecutor({
      bookmarkRows: [makeBookmarkRow({ colorKey: 'yellow' })],
      paletteRows: [makePaletteRow()],
    });
    mockDb.transaction.mockImplementation((fn: (tx: DbOrTx) => Promise<unknown>) => fn(executor));

    await updateBookmarkPalette(
      'project-1',
      DEFAULT_PALETTE.filter((color) => color.key !== 'purple'),
      5,
    );

    expect(mockDb.transaction).toHaveBeenCalledTimes(1);
    expect(state.paletteRows[0]?.updatedAt).toBe(5);
    expect(state.paletteRows[0]?.paletteJson).not.toContain('"purple"');
  });

  it('deleteBookmark removes the bookmark row without deleting the linked capture row', async () => {
    const capture = makeCaptureRow();
    const { executor, state } = makeExecutor({
      bookmarkRows: [makeBookmarkRow({ linkedCaptureId: capture.id })],
      captureRows: [capture],
    });

    await deleteBookmark('bm_aaaaaaaaaaaaaaaaaaaaa' as BookmarkId, executor);

    expect(state.bookmarkRows).toHaveLength(0);
    expect(state.captureRows).toHaveLength(1);
    expect(state.captureRows[0]?.id).toBe(capture.id);
  });
});
