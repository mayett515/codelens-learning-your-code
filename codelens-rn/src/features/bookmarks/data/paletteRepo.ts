import { eq } from 'drizzle-orm';
import { db, type DbOrTx } from '../../../db/client';
import { bookmarks, bookmarkPalettes } from './schema';
import { DEFAULT_PALETTE } from './defaultPalette';
import { parsePaletteJson, stringifyPalette, validatePalette } from '../codecs/bookmark';
import type { MarkColor } from '../types/bookmark';

export async function getBookmarkPalette(
  projectId: string,
  executor: DbOrTx = db,
): Promise<MarkColor[]> {
  const rows = await executor
    .select()
    .from(bookmarkPalettes)
    .where(eq(bookmarkPalettes.projectId, projectId));
  if (!rows[0]) return DEFAULT_PALETTE;
  return parsePaletteJson(rows[0].paletteJson);
}

export async function ensureBookmarkPalette(
  projectId: string,
  now: number = Date.now(),
  executor: DbOrTx = db,
): Promise<MarkColor[]> {
  const rows = await executor
    .select()
    .from(bookmarkPalettes)
    .where(eq(bookmarkPalettes.projectId, projectId));
  if (rows[0]) return parsePaletteJson(rows[0].paletteJson);

  await executor.insert(bookmarkPalettes).values({
    projectId,
    paletteJson: stringifyPalette(DEFAULT_PALETTE),
    updatedAt: now,
  });
  return DEFAULT_PALETTE;
}

export async function updateBookmarkPalette(
  projectId: string,
  palette: MarkColor[],
  now: number = Date.now(),
  executor: DbOrTx = db,
): Promise<void> {
  const validPalette = validatePalette(palette);
  const nextKeys = new Set(validPalette.map((color) => color.key));
  const usage = await getBookmarkColorUsage(projectId, executor);
  const removedUsed = usage.filter((item) => !nextKeys.has(item.colorKey));
  if (removedUsed.length > 0) {
    const count = removedUsed.reduce((sum, item) => sum + item.count, 0);
    throw new Error(`${count} bookmark(s) use removed palette color(s) - reassign them first.`);
  }

  const existing = await executor
    .select({ projectId: bookmarkPalettes.projectId })
    .from(bookmarkPalettes)
    .where(eq(bookmarkPalettes.projectId, projectId));

  if (existing[0]) {
    await executor
      .update(bookmarkPalettes)
      .set({ paletteJson: stringifyPalette(validPalette), updatedAt: now })
      .where(eq(bookmarkPalettes.projectId, projectId));
    return;
  }

  await executor.insert(bookmarkPalettes).values({
    projectId,
    paletteJson: stringifyPalette(validPalette),
    updatedAt: now,
  });
}

export async function getBookmarkColorUsage(
  projectId: string,
  executor: DbOrTx = db,
): Promise<Array<{ colorKey: string; count: number }>> {
  const rows = await executor
    .select({ colorKey: bookmarks.colorKey })
    .from(bookmarks)
    .where(eq(bookmarks.projectId, projectId));

  const counts = new Map<string, number>();
  for (const row of rows) counts.set(row.colorKey, (counts.get(row.colorKey) ?? 0) + 1);
  return [...counts.entries()].map(([colorKey, count]) => ({ colorKey, count }));
}
