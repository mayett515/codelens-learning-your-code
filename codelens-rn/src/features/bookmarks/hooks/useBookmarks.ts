import { useQuery } from '@tanstack/react-query';
import { getBookmarks } from '../data/bookmarkRepo';
import { bookmarkKeys } from '../data/queryKeys';
import type { BookmarkFilter } from '../types/bookmark';

export function useBookmarks(filter: BookmarkFilter = {}) {
  return useQuery({
    queryKey: bookmarkKeys.list(filter),
    queryFn: () => getBookmarks(filter),
  });
}
