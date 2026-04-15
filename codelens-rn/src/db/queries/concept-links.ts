import { eq, and } from 'drizzle-orm';
import { db } from '../client';
import { conceptLinks } from '../schema';
import type { ConceptId, ConceptLink } from '../../domain/types';

function rowToLink(row: typeof conceptLinks.$inferSelect): ConceptLink {
  return {
    fromId: row.fromId as ConceptId,
    toId: row.toId as ConceptId,
    kind: row.kind as ConceptLink['kind'],
    weight: row.weight,
  };
}

export async function getLinksByConceptId(
  conceptId: ConceptId,
): Promise<ConceptLink[]> {
  const fromRows = await db
    .select()
    .from(conceptLinks)
    .where(eq(conceptLinks.fromId, conceptId));
  const toRows = await db
    .select()
    .from(conceptLinks)
    .where(eq(conceptLinks.toId, conceptId));
  return [...fromRows, ...toRows].map(rowToLink);
}

export async function getAllLinks(): Promise<ConceptLink[]> {
  const rows = await db.select().from(conceptLinks);
  return rows.map(rowToLink);
}

export async function insertLink(link: ConceptLink): Promise<void> {
  await db.insert(conceptLinks).values({
    fromId: link.fromId,
    toId: link.toId,
    kind: link.kind,
    weight: link.weight,
  });
}

export async function deleteLink(
  fromId: ConceptId,
  toId: ConceptId,
): Promise<void> {
  await db
    .delete(conceptLinks)
    .where(
      and(eq(conceptLinks.fromId, fromId), eq(conceptLinks.toId, toId)),
    );
}
