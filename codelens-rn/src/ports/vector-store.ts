import type { ConceptId, Provider, TopMatch, TopMatchesQuery } from '../domain/types';

export interface VectorStorePort {
  upsert(input: {
    id: string;
    vector: Float32Array;
    model: string;
    api: Provider;
    signature: string;
    updatedAt: string;
  }): Promise<void>;

  topMatches(query: TopMatchesQuery): Promise<TopMatch[]>;

  delete(id: ConceptId | string): Promise<void>;

  deleteAll(): Promise<void>;
}
