import type { ChatId, FileId, ProjectId } from '../domain/types';

export const chatKeys = {
  detail: (id: ChatId) => ['chat', id] as const,
  recent: ['recentChats'] as const,
} as const;

export const fileKeys = {
  root: ['file'] as const,
  detail: (id: FileId) => ['file', id] as const,
  byProject: (projectId: ProjectId) => ['files', projectId] as const,
} as const;

export const projectKeys = {
  all: ['projects'] as const,
  detail: (id: ProjectId) => ['project', id] as const,
} as const;
