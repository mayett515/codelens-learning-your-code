import { eq, and } from 'drizzle-orm';
import { db } from '../client';
import { files } from '../schema';
import type {
  SourceFile,
  FileId,
  ProjectId,
  LineMark,
  RangeMark,
} from '../../domain/types';

function rowToSourceFile(row: typeof files.$inferSelect): SourceFile {
  return {
    id: row.id as FileId,
    projectId: row.projectId as ProjectId,
    path: row.path,
    content: row.content,
    marks: (row.marks ?? []) as LineMark[],
    ranges: (row.ranges ?? []) as RangeMark[],
  };
}

export async function getFileById(
  id: FileId,
): Promise<SourceFile | undefined> {
  const rows = await db.select().from(files).where(eq(files.id, id));
  return rows[0] ? rowToSourceFile(rows[0]) : undefined;
}

export async function getFilesByProject(
  projectId: ProjectId,
): Promise<SourceFile[]> {
  const rows = await db
    .select()
    .from(files)
    .where(eq(files.projectId, projectId));
  return rows.map(rowToSourceFile);
}

export async function insertFile(file: SourceFile): Promise<void> {
  await db.insert(files).values({
    id: file.id,
    projectId: file.projectId,
    path: file.path,
    content: file.content,
    marks: file.marks as any,
    ranges: file.ranges as any,
  });
}

export async function updateFileMarks(
  id: FileId,
  marks: LineMark[],
  ranges: RangeMark[],
): Promise<void> {
  await db
    .update(files)
    .set({ marks: marks as any, ranges: ranges as any })
    .where(eq(files.id, id));
}

export async function deleteFile(id: FileId): Promise<void> {
  await db.delete(files).where(eq(files.id, id));
}

export async function deleteFilesByProject(
  projectId: ProjectId,
): Promise<void> {
  await db.delete(files).where(eq(files.projectId, projectId));
}
