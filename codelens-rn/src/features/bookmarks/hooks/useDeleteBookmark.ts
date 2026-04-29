import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteBookmark } from '../data/bookmarkRepo';
import { bookmarkKeys } from '../data/queryKeys';
import type { BookmarkId } from '../types/bookmark';

export interface DeleteBookmarkInput {
  id: BookmarkId;
  projectId: string;
  filePath: string;
}

export function useDeleteBookmark() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: DeleteBookmarkInput) => deleteBookmark(id),
    onSuccess: (_, input) => {
      queryClient.invalidateQueries({ queryKey: bookmarkKeys.byId(input.id) });
      queryClient.invalidateQueries({ queryKey: bookmarkKeys.byFile(input.projectId, input.filePath) });
      queryClient.invalidateQueries({ queryKey: bookmarkKeys.list() });
      queryClient.invalidateQueries({ queryKey: bookmarkKeys.byProject(input.projectId) });
    },
  });
}
