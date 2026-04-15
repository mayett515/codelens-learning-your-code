import { eq } from 'drizzle-orm';
import { db } from '../client';
import { projects } from '../schema';
import type { Project, ProjectId, FileId } from '../../domain/types';

function rowToProject(row: typeof projects.$inferSelect): Project {
  return {
    id: row.id as ProjectId,
    name: row.name,
    source: row.source,
    githubUrl: row.githubUrl ?? undefined,
    createdAt: row.createdAt,
    recentFileIds: (row.recentFileIds ?? []) as FileId[],
  };
}

export async function getAllProjects(): Promise<Project[]> {
  const rows = await db.select().from(projects);
  return rows.map(rowToProject);
}

export async function getProjectById(
  id: ProjectId,
): Promise<Project | undefined> {
  const rows = await db.select().from(projects).where(eq(projects.id, id));
  return rows[0] ? rowToProject(rows[0]) : undefined;
}

export async function insertProject(
  project: Omit<Project, 'recentFileIds'> & { recentFileIds?: FileId[] },
): Promise<void> {
  await db.insert(projects).values({
    id: project.id,
    name: project.name,
    source: project.source,
    githubUrl: project.githubUrl ?? null,
    createdAt: project.createdAt,
    recentFileIds: project.recentFileIds ?? [],
  });
}

export async function updateProject(
  id: ProjectId,
  data: Partial<Pick<Project, 'name' | 'recentFileIds'>>,
): Promise<void> {
  await db.update(projects).set(data).where(eq(projects.id, id));
}

export async function deleteProject(id: ProjectId): Promise<void> {
  await db.delete(projects).where(eq(projects.id, id));
}
