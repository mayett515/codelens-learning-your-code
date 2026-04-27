import type { PersonaId } from './ids';

export interface Persona {
  id: PersonaId;
  name: string;
  description: string;
  systemPromptLayer: string;
  iconEmoji: string | null;
  isBuiltIn: boolean;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

export interface PersonaDraft {
  name: string;
  description: string;
  systemPromptLayer: string;
  iconEmoji?: string | null | undefined;
}
