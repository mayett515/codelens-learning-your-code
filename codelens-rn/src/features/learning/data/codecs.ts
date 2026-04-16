import { z } from 'zod';
import type { ConceptTaxonomy, ConceptId, SessionId } from '../../../domain/types';

export const ConceptTaxonomyCodec = z.object({
  domain: z.string().optional(),
  subdomain: z.string().optional(),
  pattern: z.string().optional(),
  language: z.string().optional(),
  tags: z.array(z.string()).default([]),
});

export function parseTaxonomy(raw: unknown): ConceptTaxonomy {
  return ConceptTaxonomyCodec.parse(raw ?? { tags: [] }) as ConceptTaxonomy;
}

export function parseConceptIds(raw: unknown): ConceptId[] {
  return z.array(z.string()).parse(raw ?? []) as ConceptId[];
}

export function parseSessionIds(raw: unknown): SessionId[] {
  return z.array(z.string()).parse(raw ?? []) as SessionId[];
}
