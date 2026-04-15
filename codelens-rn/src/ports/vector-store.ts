import type { ConceptId, Provider, TopMatch, TopMatchesQuery } from '../domain/types';

export interface VectorStorePort {
  upsert(input: {
    id: ConceptId;
    vector: Float32Array;
    model: string;
    api: Provider;
    signature: string;
    updatedAt: string;
  }): Promise<void>;

  topMatches(query: TopMatchesQuery): Promise<TopMatch[]>;

  delete(id: ConceptId): Promise<void>;

  deleteAll(): Promise<void>;
}
