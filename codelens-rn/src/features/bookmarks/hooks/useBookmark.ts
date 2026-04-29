import { useQuery } from '@tanstack/react-query';
import { getBookmarkById } from '../data/bookmarkRepo';
import { bookmarkKeys } from '../data/queryKeys';
import type { BookmarkId } from '../types/bookmark';

export function useBookmark(id: BookmarkId | null | undefined) {
  return useQuery({
    queryKey: bookmarkKeys.byId(id ?? null),
    queryFn: () => (id ? getBookmarkById(id) : undefined),
    enabled: Boolean(id),
  });
}
