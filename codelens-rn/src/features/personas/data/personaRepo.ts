import { asc, desc, eq } from 'drizzle-orm';
import { db, type DbOrTx } from '../../../db/client';
import { chats } from '../../../db/schema';
import { personas } from './schema';
import { validatePersonaDraft, validatePersonaRow } from '../codecs/persona';
import { newPersonaId, type PersonaId } from '../types/ids';
import type { ChatId } from '../../../domain/types';
import type { Persona, PersonaDraft } from '../types/persona';

export async function getPersonas(executor: DbOrTx = db): Promise<Persona[]> {
  const rows = await executor
    .select()
    .from(personas)
    .orderBy(
      desc(personas.isBuiltIn),
      asc(personas.sortOrder),
      asc(personas.createdAt),
      asc(personas.name),
    );
  return rows.map(personaRowToDomain);
}

export async function getPersonaById(
  id: PersonaId,
  executor: DbOrTx = db,
): Promise<Persona | undefined> {
  const rows = await executor.select().from(personas).where(eq(personas.id, id));
  return rows[0] ? personaRowToDomain(rows[0]) : undefined;
}

export async function createUserPersona(
  draft: PersonaDraft,
  now: number = Date.now(),
  executor: DbOrTx = db,
): Promise<Persona> {
  const valid = validatePersonaDraft(draft);
  const persona: Persona = {
    id: newPersonaId(),
    name: valid.name,
    description: valid.description,
    systemPromptLayer: valid.systemPromptLayer,
    iconEmoji: valid.iconEmoji,
    isBuiltIn: false,
    sortOrder: 100,
    createdAt: now,
    updatedAt: now,
  };

  await executor.insert(personas).values({
    id: persona.id,
    name: persona.name,
    description: persona.description,
    systemPromptLayer: persona.systemPromptLayer,
    iconEmoji: persona.iconEmoji,
    isBuiltIn: persona.isBuiltIn,
    sortOrder: persona.sortOrder,
    createdAt: persona.createdAt,
    updatedAt: persona.updatedAt,
  });
  return persona;
}

export async function clonePersona(
  sourceId: PersonaId,
  name: string,
  now: number = Date.now(),
  executor: DbOrTx = db,
): Promise<Persona> {
  const source = await getPersonaById(sourceId, executor);
  if (!source) throw new Error(`Cannot clone missing persona: ${sourceId}`);
  return createUserPersona(
    {
      name,
      description: source.description,
      systemPromptLayer: source.systemPromptLayer,
      iconEmoji: source.iconEmoji,
    },
    now,
    executor,
  );
}

export async function updateUserPersona(
  id: PersonaId,
  draft: PersonaDraft,
  now: number = Date.now(),
  executor: DbOrTx = db,
): Promise<void> {
  const existing = await getPersonaById(id, executor);
  if (!existing) throw new Error(`Cannot update missing persona: ${id}`);
  if (existing.isBuiltIn) throw new Error(`Built-in personas cannot be edited: ${id}`);

  const valid = validatePersonaDraft(draft);
  await executor
    .update(personas)
    .set({
      name: valid.name,
      description: valid.description,
      systemPromptLayer: valid.systemPromptLayer,
      iconEmoji: valid.iconEmoji,
      updatedAt: now,
    })
    .where(eq(personas.id, id));
}

export async function deleteUserPersona(
  id: PersonaId,
  executor: DbOrTx = db,
): Promise<void> {
  const existing = await getPersonaById(id, executor);
  if (!existing) throw new Error(`Cannot delete missing persona: ${id}`);
  if (existing.isBuiltIn) throw new Error(`Built-in personas cannot be deleted: ${id}`);

  await executor.delete(personas).where(eq(personas.id, id));
}

export async function setChatPersona(
  chatId: ChatId,
  personaId: PersonaId | null,
  executor: DbOrTx = db,
): Promise<void> {
  await executor
    .update(chats)
    .set({ personaId, updatedAt: new Date().toISOString() })
    .where(eq(chats.id, chatId));
}

export async function getChatPersonaId(
  chatId: ChatId,
  executor: DbOrTx = db,
): Promise<PersonaId | null> {
  const rows = await executor
    .select({ personaId: chats.personaId })
    .from(chats)
    .where(eq(chats.id, chatId));
  return rows[0]?.personaId ? (rows[0].personaId as PersonaId) : null;
}

function personaRowToDomain(row: typeof personas.$inferSelect): Persona {
  return validatePersonaRow({
    id: row.id,
    name: row.name,
    description: row.description,
    systemPromptLayer: row.systemPromptLayer,
    iconEmoji: row.iconEmoji ?? null,
    isBuiltIn: row.isBuiltIn,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}
