import { nanoid } from 'nanoid';
import type { BookmarkId } from './bookmark';

export type { BookmarkId } from './bookmark';

const makeId = <T extends string>(prefix: string): T => `${prefix}_${nanoid(21)}` as T;

export const newBookmarkId = (): BookmarkId =>
  makeId<BookmarkId>('bm');

export const isBookmarkId = (value: unknown): value is BookmarkId =>
  typeof value === 'string' && /^bm_[A-Za-z0-9_-]{21}$/.test(value);

export const unsafeBookmarkId = (value: string): BookmarkId => {
  if (!isBookmarkId(value)) {
    throw new Error(`Invalid BookmarkId: ${value}`);
  }
  return value;
};
