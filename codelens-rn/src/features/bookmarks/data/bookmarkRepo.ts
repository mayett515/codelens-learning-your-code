import { and, asc, desc, eq, type SQL } from 'drizzle-orm';
import { db, type DbOrTx } from '../../../db/client';
import { bookmarks } from './schema';
import { ensureBookmarkPalette } from './paletteRepo';
import { validateBookmarkRow, validateBookmarkUpsert } from '../codecs/bookmark';
import { newBookmarkId } from '../types/ids';
import type { Bookmark, BookmarkFilter, BookmarkId, BookmarkUpsertInput } from '../types/bookmark';

export async function getBookmarks(
  filter: BookmarkFilter = {},
  executor: DbOrTx = db,
): Promise<Bookmark[]> {
  const conditions = bookmarkFilterConditions(filter);
  const query = executor.select().from(bookmarks);
  const rows = conditions.length > 0
    ? await query.where(and(...conditions)).orderBy(desc(bookmarks.createdAt), asc(bookmarks.id))
    : await query.orderBy(desc(bookmarks.createdAt), asc(bookmarks.id));
  return rows.map(bookmarkRowToDomain);
}

export async function getBookmarksByFile(
  projectId: string,
  filePath: string,
  executor: DbOrTx = db,
): Promise<Bookmark[]> {
  const rows = await executor
    .select()
    .from(bookmarks)
    .where(and(eq(bookmarks.projectId, projectId), eq(bookmarks.filePath, filePath)))
    .orderBy(asc(bookmarks.startLine), asc(bookmarks.id));
  return rows.map(bookmarkRowToDomain);
}

export async function getBookmarkById(
  id: BookmarkId,
  executor: DbOrTx = db,
): Promise<Bookmark | undefined> {
  const rows = await executor.select().from(bookmarks).where(eq(bookmarks.id, id));
  return rows[0] ? bookmarkRowToDomain(rows[0]) : undefined;
}

export async function createBookmark(
  input: BookmarkUpsertInput,
  now: number = Date.now(),
): Promise<Bookmark> {
  const valid = validateBookmarkUpsert(input);

  return db.transaction(async (tx) => {
    const palette = await ensureBookmarkPalette(valid.projectId, now, tx);
    if (!palette.some((color) => color.key === valid.colorKey)) {
      throw new Error(`Palette color is not available: ${valid.colorKey}`);
    }

    const existing = await findBookmarkAtLocation(
      valid.projectId,
      valid.filePath,
      valid.startLine,
      valid.endLine,
      tx,
    );
    if (existing) {
      throw new Error('A bookmark already exists here - edit the existing one instead.');
    }

    const bookmark: Bookmark = {
      id: newBookmarkId(),
      ...valid,
      linkedCaptureId: null,
      createdAt: now,
      updatedAt: now,
    };

    await tx.insert(bookmarks).values(domainToInsert(bookmark));
    return bookmark;
  });
}

export async function updateBookmark(
  id: BookmarkId,
  input: BookmarkUpsertInput,
  now: number = Date.now(),
  executor: DbOrTx = db,
): Promise<void> {
  const valid = validateBookmarkUpsert(input);
  await executor
    .update(bookmarks)
    .set({
      projectId: valid.projectId,
      filePath: valid.filePath,
      startLine: valid.startLine,
      endLine: valid.endLine,
      colorKey: valid.colorKey,
      note: valid.note,
      sessionId: valid.sessionId,
      updatedAt: now,
    })
    .where(eq(bookmarks.id, id));
}

export async function deleteBookmark(
  id: BookmarkId,
  executor: DbOrTx = db,
): Promise<void> {
  await executor.delete(bookmarks).where(eq(bookmarks.id, id));
}

export async function findBookmarkAtLocation(
  projectId: string,
  filePath: string,
  startLine: number,
  endLine: number,
  executor: DbOrTx = db,
): Promise<Bookmark | undefined> {
  const rows = await executor
    .select()
    .from(bookmarks)
    .where(
      and(
        eq(bookmarks.projectId, projectId),
        eq(bookmarks.filePath, filePath),
        eq(bookmarks.startLine, startLine),
        eq(bookmarks.endLine, endLine),
      ),
    )
    .limit(1);
  return rows[0] ? bookmarkRowToDomain(rows[0]) : undefined;
}

function bookmarkFilterConditions(filter: BookmarkFilter): SQL[] {
  const conditions: SQL[] = [];
  if (filter.projectId) conditions.push(eq(bookmarks.projectId, filter.projectId));
  if (filter.colorKey) conditions.push(eq(bookmarks.colorKey, filter.colorKey));
  if (filter.sessionId) conditions.push(eq(bookmarks.sessionId, filter.sessionId));
  return conditions;
}

function bookmarkRowToDomain(row: typeof bookmarks.$inferSelect): Bookmark {
  return validateBookmarkRow({
    id: row.id,
    projectId: row.projectId,
    filePath: row.filePath,
    startLine: row.startLine,
    endLine: row.endLine,
    colorKey: row.colorKey,
    note: row.note,
    linkedCaptureId: row.linkedCaptureId,
    sessionId: row.sessionId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

function domainToInsert(bookmark: Bookmark): typeof bookmarks.$inferInsert {
  return {
    id: bookmark.id,
    projectId: bookmark.projectId,
    filePath: bookmark.filePath,
    startLine: bookmark.startLine,
    endLine: bookmark.endLine,
    colorKey: bookmark.colorKey,
    note: bookmark.note,
    linkedCaptureId: bookmark.linkedCaptureId,
    sessionId: bookmark.sessionId,
    createdAt: bookmark.createdAt,
    updatedAt: bookmark.updatedAt,
  };
}
