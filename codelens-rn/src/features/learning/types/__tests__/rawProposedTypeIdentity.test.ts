import { describe, expect, it } from 'vitest';
import {
  createScopedRawProposedTypeIdentity,
  createUnresolvedRawProposedTypeIdentity,
  rawProposedTypeIdentityToLegacyString,
} from '../rawProposedTypeIdentity';

describe('raw proposed type identity', () => {
  it('serializes scoped ontology refs to the legacy string projection', () => {
    const identity = createScopedRawProposedTypeIdentity(
      { scopeId: 'coding', nodeId: 'pattern' },
      'conceptualize',
    );

    expect(identity).toEqual({
      kind: 'scoped_ref',
      scopeId: 'coding',
      nodeId: 'pattern',
      source: 'conceptualize',
    });
    expect(rawProposedTypeIdentityToLegacyString(identity)).toBe('coding:pattern');
  });

  it('keeps unresolved extractor ids as factual raw evidence with scope context', () => {
    const identity = createUnresolvedRawProposedTypeIdentity({
      rawNodeId: ' hallucinated_runtime_kind ',
      activeScopeId: 'coding',
    });

    expect(identity).toEqual({
      kind: 'unresolved_raw',
      rawNodeId: 'hallucinated_runtime_kind',
      source: 'extractor',
      activeScopeId: 'coding',
    });
    expect(rawProposedTypeIdentityToLegacyString(identity)).toBe('hallucinated_runtime_kind');
  });

  it('drops blank unresolved extractor ids', () => {
    expect(createUnresolvedRawProposedTypeIdentity({
      rawNodeId: '   ',
      activeScopeId: 'coding',
    })).toBeNull();
    expect(rawProposedTypeIdentityToLegacyString(null)).toBeNull();
  });
});
