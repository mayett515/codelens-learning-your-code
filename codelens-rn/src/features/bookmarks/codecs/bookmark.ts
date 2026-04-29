import { z } from 'zod';
import { isLearningCaptureId } from '../../learning/types/ids';
import { isBookmarkId } from '../types/ids';
import type { Bookmark, BookmarkUpsertInput, MarkColor } from '../types/bookmark';

export const MarkColorCodec = z.object({
  key: z.string().min(1).max(40).regex(/^[a-z0-9-]+$/),
  label: z.string().min(1).max(40),
  hex: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  emoji: z.string().max(8).optional(),
});

export const PaletteCodec = z.array(MarkColorCodec).min(1).max(10);

export const BookmarkRowCodec = z.object({
  id: z.string().refine(isBookmarkId),
  projectId: z.string().min(1),
  filePath: z.string().min(1),
  startLine: z.number().int().positive(),
  endLine: z.number().int().positive(),
  colorKey: z.string().min(1),
  note: z.string().max(200).nullable(),
  linkedCaptureId: z.string().refine(isLearningCaptureId).nullable(),
  sessionId: z.string().nullable(),
  createdAt: z.number().int().positive(),
  updatedAt: z.number().int().positive(),
}).refine((row) => row.endLine >= row.startLine, {
  message: 'endLine must be greater than or equal to startLine',
  path: ['endLine'],
});

export const BookmarkUpsertCodec = z.object({
  projectId: z.string().min(1),
  filePath: z.string().min(1),
  startLine: z.number().int().positive(),
  endLine: z.number().int().positive(),
  colorKey: z.string().min(1),
  note: z.string().trim().max(200).nullable(),
  sessionId: z.string().trim().nullable(),
}).refine((row) => row.endLine >= row.startLine, {
  message: 'endLine must be greater than or equal to startLine',
  path: ['endLine'],
});

export function validateBookmarkRow(value: unknown): Bookmark {
  return BookmarkRowCodec.parse(value) as Bookmark;
}

export function validateBookmarkUpsert(input: BookmarkUpsertInput): BookmarkUpsertInput {
  const parsed = BookmarkUpsertCodec.parse(input);
  return {
    ...parsed,
    note: parsed.note && parsed.note.length > 0 ? parsed.note : null,
    sessionId: parsed.sessionId && parsed.sessionId.length > 0 ? parsed.sessionId : null,
  };
}

export function validatePalette(value: unknown): MarkColor[] {
  return PaletteCodec.parse(value);
}

export function parsePaletteJson(raw: string): MarkColor[] {
  return validatePalette(JSON.parse(raw));
}

export function stringifyPalette(palette: MarkColor[]): string {
  return JSON.stringify(validatePalette(palette));
}
