import type { BookmarkFilter, BookmarkId } from '../types/bookmark';

export const bookmarkKeys = {
  all: () => ['bookmarks'] as const,
  list: (filter: BookmarkFilter = {}) =>
    [...bookmarkKeys.all(), 'list', filter] as const,
  byId: (id: BookmarkId | null) => [...bookmarkKeys.all(), 'detail', id ?? 'none'] as const,
  byFile: (projectId: string | null | undefined, filePath: string | null | undefined) =>
    [...bookmarkKeys.all(), 'byFile', projectId ?? 'none', filePath ?? 'none'] as const,
  byProject: (projectId: string | null | undefined) =>
    [...bookmarkKeys.all(), 'byProject', projectId ?? 'none'] as const,
  palette: (projectId: string | null | undefined) =>
    [...bookmarkKeys.all(), 'palette', projectId ?? 'none'] as const,
} as const;
