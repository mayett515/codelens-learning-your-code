import { z } from 'zod';
import { isPersonaId } from '../types/ids';
import type { Persona, PersonaDraft } from '../types/persona';

export const PersonaRowCodec = z.object({
  id: z.string().refine(isPersonaId),
  name: z.string().min(1).max(80),
  description: z.string().min(1).max(150),
  systemPromptLayer: z.string().max(3000),
  iconEmoji: z.string().max(8).nullable(),
  isBuiltIn: z.boolean(),
  sortOrder: z.number().int(),
  createdAt: z.number().int().positive(),
  updatedAt: z.number().int().positive(),
});

export const PersonaDraftCodec = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().min(1).max(150),
  systemPromptLayer: z.string().trim().max(3000),
  iconEmoji: z.string().trim().max(8).nullable().optional(),
});

export function validatePersonaRow(value: unknown): Persona {
  return PersonaRowCodec.parse(value);
}

export function validatePersonaDraft(value: PersonaDraft): {
  name: string;
  description: string;
  systemPromptLayer: string;
  iconEmoji: string | null;
} {
  const parsed = PersonaDraftCodec.parse(value);
  return {
    name: parsed.name,
    description: parsed.description,
    systemPromptLayer: parsed.systemPromptLayer,
    iconEmoji: parsed.iconEmoji ?? null,
  };
}
