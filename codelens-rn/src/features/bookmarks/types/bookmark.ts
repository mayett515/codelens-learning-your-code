export type BookmarkId = string & { readonly __brand: 'BookmarkId' };

export interface MarkColor {
  key: string;
  label: string;
  hex: string;
  emoji?: string | undefined;
}

export interface Bookmark {
  id: BookmarkId;
  projectId: string;
  filePath: string;
  startLine: number;
  endLine: number;
  colorKey: string;
  note: string | null;
  linkedCaptureId: string | null;
  sessionId: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface BookmarkFilter {
  projectId?: string | undefined;
  colorKey?: string | undefined;
  sessionId?: string | undefined;
}

export interface BookmarkUpsertInput {
  projectId: string;
  filePath: string;
  startLine: number;
  endLine: number;
  colorKey: string;
  note: string | null;
  sessionId: string | null;
}
