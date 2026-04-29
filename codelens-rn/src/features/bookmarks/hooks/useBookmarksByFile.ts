import { useQuery } from '@tanstack/react-query';
import { getBookmarksByFile } from '../data/bookmarkRepo';
import { bookmarkKeys } from '../data/queryKeys';

export function useBookmarksByFile(projectId: string | null | undefined, filePath: string | null | undefined) {
  return useQuery({
    queryKey: bookmarkKeys.byFile(projectId, filePath),
    queryFn: () => {
      if (!projectId || !filePath) return [];
      return getBookmarksByFile(projectId, filePath);
    },
    enabled: Boolean(projectId && filePath),
  });
}
