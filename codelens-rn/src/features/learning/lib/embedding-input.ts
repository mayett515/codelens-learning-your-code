import type { ConceptTaxonomy } from '../../../domain/types';

export function buildEmbeddingInput(
  name: string,
  summary: string,
  taxonomy?: ConceptTaxonomy,
): string {
  let text = `${name}\n${summary}`;
  if (taxonomy?.domain) text += `\nDomain: ${taxonomy.domain}`;
  if (taxonomy?.subdomain) text += `\nSubdomain: ${taxonomy.subdomain}`;
  if (taxonomy?.tags && taxonomy.tags.length > 0) {
    text += `\nTags: ${taxonomy.tags.join(', ')}`;
  }
  return text;
}
