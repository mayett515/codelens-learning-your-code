import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createBookmark } from '../data/bookmarkRepo';
import { bookmarkKeys } from '../data/queryKeys';
import type { BookmarkUpsertInput } from '../types/bookmark';

export function useCreateBookmark() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: BookmarkUpsertInput) => createBookmark(input),
    onSuccess: (bookmark) => {
      queryClient.invalidateQueries({
        queryKey: bookmarkKeys.byFile(bookmark.projectId, bookmark.filePath),
      });
      queryClient.invalidateQueries({ queryKey: bookmarkKeys.list() });
      queryClient.invalidateQueries({ queryKey: bookmarkKeys.byProject(bookmark.projectId) });
      queryClient.invalidateQueries({ queryKey: bookmarkKeys.palette(bookmark.projectId) });
    },
  });
}
