import {
  scopedNodeRefKey,
  type ScopedNodeRef,
} from '../../ontology/contextAssembly';

export type RawProposedTypeIdentity =
  | {
      kind: 'scoped_ref';
      scopeId: string;
      nodeId: string;
      source: 'conceptualize' | 'extractor';
    }
  | {
      kind: 'unresolved_raw';
      rawNodeId: string;
      source: 'extractor';
      activeScopeId: string | null;
    };

export function createScopedRawProposedTypeIdentity(
  ref: ScopedNodeRef,
  source: 'conceptualize' | 'extractor',
): RawProposedTypeIdentity {
  return {
    kind: 'scoped_ref',
    scopeId: ref.scopeId,
    nodeId: ref.nodeId,
    source,
  };
}

export function createUnresolvedRawProposedTypeIdentity(input: {
  rawNodeId: string | null | undefined;
  activeScopeId: string | null | undefined;
}): RawProposedTypeIdentity | null {
  const rawNodeId = input.rawNodeId?.trim() ?? '';
  if (!rawNodeId) return null;

  return {
    kind: 'unresolved_raw',
    rawNodeId,
    source: 'extractor',
    activeScopeId: input.activeScopeId ?? null,
  };
}

export function rawProposedTypeIdentityToLegacyString(
  identity: RawProposedTypeIdentity | null | undefined,
): string | null {
  if (!identity) return null;
  if (identity.kind === 'scoped_ref') return scopedNodeRefKey(identity);
  return identity.rawNodeId;
}
