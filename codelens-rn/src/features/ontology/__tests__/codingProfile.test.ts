import { describe, expect, it } from 'vitest';
import { CONCEPT_TYPES } from '../../learning/types/learning';
import { CODING_CONCEPT_TYPE_NODE_IDS, codingProfile } from '../profiles/codingProfile';

describe('coding profile', () => {
  it('owns the existing coding concept taxonomy used by learning compatibility exports', () => {
    expect(codingProfile.ontology.itemTypeNodeIds).toEqual(CONCEPT_TYPES);
    expect(CODING_CONCEPT_TYPE_NODE_IDS).toEqual([
      'mechanism',
      'mental_model',
      'pattern',
      'architecture_principle',
      'language_feature',
      'api_idiom',
      'data_structure',
      'algorithmic_idea',
      'performance_principle',
      'debugging_heuristic',
      'failure_mode',
      'testing_principle',
    ]);
  });
});
