import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateBookmark } from '../data/bookmarkRepo';
import { bookmarkKeys } from '../data/queryKeys';
import type { BookmarkId, BookmarkUpsertInput } from '../types/bookmark';

export interface UpdateBookmarkInput {
  id: BookmarkId;
  data: BookmarkUpsertInput;
}

export function useUpdateBookmark() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: UpdateBookmarkInput) => updateBookmark(id, data),
    onSuccess: (_, { id, data }) => {
      queryClient.invalidateQueries({ queryKey: bookmarkKeys.byId(id) });
      queryClient.invalidateQueries({ queryKey: bookmarkKeys.byFile(data.projectId, data.filePath) });
      queryClient.invalidateQueries({ queryKey: bookmarkKeys.list() });
      queryClient.invalidateQueries({ queryKey: bookmarkKeys.byProject(data.projectId) });
    },
  });
}
