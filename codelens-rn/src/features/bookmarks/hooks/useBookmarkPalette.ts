import { useQuery } from '@tanstack/react-query';
import { getBookmarkPalette } from '../data/paletteRepo';
import { bookmarkKeys } from '../data/queryKeys';
import { DEFAULT_PALETTE } from '../data/defaultPalette';

export function useBookmarkPalette(projectId: string | null | undefined) {
  return useQuery({
    queryKey: bookmarkKeys.palette(projectId),
    queryFn: () => (projectId ? getBookmarkPalette(projectId) : DEFAULT_PALETTE),
    enabled: Boolean(projectId),
  });
}
