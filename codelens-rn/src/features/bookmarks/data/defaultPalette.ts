import type { MarkColor } from '../types/bookmark';

export const DEFAULT_PALETTE: MarkColor[] = [
  { key: 'yellow', label: 'Interesting', hex: '#FACC15' },
  { key: 'blue', label: 'Important', hex: '#3B82F6' },
  { key: 'red', label: 'Confused', hex: '#EF4444' },
  { key: 'green', label: 'I get this', hex: '#22C55E' },
  { key: 'purple', label: 'Return to', hex: '#A855F7' },
];

export const FALLBACK_BOOKMARK_COLOR = '#9CA3AF';
