import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateBookmarkPalette } from '../data/paletteRepo';
import { bookmarkKeys } from '../data/queryKeys';
import type { MarkColor } from '../types/bookmark';

export interface UpdateBookmarkPaletteInput {
  projectId: string;
  palette: MarkColor[];
}

export function useUpdateBookmarkPalette() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, palette }: UpdateBookmarkPaletteInput) =>
      updateBookmarkPalette(projectId, palette),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: bookmarkKeys.palette(projectId) });
      queryClient.invalidateQueries({ queryKey: bookmarkKeys.byProject(projectId) });
      queryClient.invalidateQueries({ queryKey: bookmarkKeys.all() });
    },
  });
}
