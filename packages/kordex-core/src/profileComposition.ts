import { composeLearningProfileFields } from './extensions/learningProfileComposition';
import type {
  BoundaryRule,
  DomainProfile,
  OntologyNode,
  OntologyProfile,
  ProfileOverlay,
  ProfileOverlayKind,
} from './types';

export type { ProfileOverlayKind, ProfileOverlay };

// ---------------------------------------------------------------------------
// Deep-clone helpers (shallow where sufficient, deep only for nested arrays)
// ---------------------------------------------------------------------------

function cloneOntologyNode(node: OntologyNode): OntologyNode {
  return {
    ...node,
    doNotUseWhen: node.doNotUseWhen.map(cloneBoundaryRule),
    useWhen: [...node.useWhen],
    examples: [...node.examples],
    relatedNodeIds: [...node.relatedNodeIds],
    contrastNodeIds: [...node.contrastNodeIds],
  };
}

function cloneBoundaryRule(rule: BoundaryRule): BoundaryRule {
  return {
    ...rule,
    evidenceIds: [...rule.evidenceIds],
  };
}

function dedupStrings(arr: readonly string[]): string[] {
  return [...new Set(arr)];
}

// ---------------------------------------------------------------------------
// Composition precedence
// ---------------------------------------------------------------------------
//
// base first
// project/learning overlays next in provided order
// personal overlays last
// later overlays of the same priority win deterministically
//
// ---------------------------------------------------------------------------

/**
 * Compose a runtime `DomainProfile` from a base profile plus ordered overlays.
 *
 * Does **not** mutate the base profile or any overlay input.
 *
 * Precedence:
 * 1. Base profile (lowest priority)
 * 2. Project/learning overlays in the order provided
 * 3. Personal overlays last, also in the order provided
 */
export function composeDomainProfile<TItemTypeNodeId extends string = string, TExtension extends object = object>(
  base: DomainProfile<TItemTypeNodeId, TExtension>,
  overlays: readonly ProfileOverlay<TItemTypeNodeId>[],
): DomainProfile<TItemTypeNodeId, TExtension> {
  // Deep-clone base ontology nodes
  const composedNodes: OntologyNode[] = base.ontology.nodes.map(cloneOntologyNode);
  const nodeIndex = new Map<string, number>();
  for (let i = 0; i < composedNodes.length; i++) {
    nodeIndex.set(composedNodes[i].id, i);
  }

  let composedItemTypeNodeIds: TItemTypeNodeId[] = [...base.ontology.itemTypeNodeIds];
  let composedRelTypeNodeIds: string[] = [...base.ontology.relationshipTypeNodeIds];
  const orderedOverlays = orderOverlaysForComposition(overlays);
  const learningFields = composeLearningProfileFields(base, orderedOverlays);

  for (const overlay of orderedOverlays) {
    // Add new ontology nodes
    if (overlay.addOntologyNodes) {
      for (const node of overlay.addOntologyNodes) {
        if (!nodeIndex.has(node.id)) {
          const cloned = cloneOntologyNode(node);
          nodeIndex.set(cloned.id, composedNodes.length);
          composedNodes.push(cloned);
        }
      }
    }

    // Override existing ontology nodes by id (full replacement)
    if (overlay.overrideOntologyNodes) {
      for (const node of overlay.overrideOntologyNodes) {
        const idx = nodeIndex.get(node.id);
        if (idx !== undefined) {
          composedNodes[idx] = cloneOntologyNode(node);
        } else {
          // If the node doesn't exist in the composed profile yet, add it
          const cloned = cloneOntologyNode(node);
          nodeIndex.set(cloned.id, composedNodes.length);
          composedNodes.push(cloned);
        }
      }
    }

    // Add item type node ids
    if (overlay.addItemTypeNodeIds) {
      composedItemTypeNodeIds = dedupStrings([
        ...composedItemTypeNodeIds,
        ...(overlay.addItemTypeNodeIds as readonly string[]),
      ]) as TItemTypeNodeId[];
    }

    // Add relationship type node ids (merge + dedup)
    if (overlay.addRelationshipTypeNodeIds) {
      composedRelTypeNodeIds = dedupStrings([
        ...composedRelTypeNodeIds,
        ...overlay.addRelationshipTypeNodeIds,
      ]);
    }

    // Override ontology partially (currently only supports adding/overriding nodes
    // that were not handled above, but this allows future extension)
    if (overlay.overrideOntology) {
      if (overlay.overrideOntology.nodes) {
        // Additional ontology nodes from overrideOntology (treated as additions)
        for (const node of overlay.overrideOntology.nodes) {
          if (!nodeIndex.has(node.id)) {
            const cloned = cloneOntologyNode(node);
            nodeIndex.set(cloned.id, composedNodes.length);
            composedNodes.push(cloned);
          }
        }
      }
      if (overlay.overrideOntology.itemTypeNodeIds) {
        composedItemTypeNodeIds = dedupStrings([
          ...composedItemTypeNodeIds,
          ...(overlay.overrideOntology.itemTypeNodeIds as readonly string[]),
        ]) as TItemTypeNodeId[];
      }
      if (overlay.overrideOntology.relationshipTypeNodeIds) {
        composedRelTypeNodeIds = dedupStrings([
          ...composedRelTypeNodeIds,
          ...overlay.overrideOntology.relationshipTypeNodeIds,
        ]);
      }
    }
  }

  const composedOntology: OntologyProfile<TItemTypeNodeId> = {
    nodes: composedNodes,
    itemTypeNodeIds: composedItemTypeNodeIds,
    relationshipTypeNodeIds: composedRelTypeNodeIds,
  };

  return {
    ...base,
    ...learningFields,
    ontology: composedOntology,
  };
}

function orderOverlaysForComposition<TItemTypeNodeId extends string>(
  overlays: readonly ProfileOverlay<TItemTypeNodeId>[],
): ProfileOverlay<TItemTypeNodeId>[] {
  return overlays
    .map((overlay, index) => ({ overlay, index }))
    .sort((a, b) => {
      const priorityDelta = overlayPriority(a.overlay.kind) - overlayPriority(b.overlay.kind);
      return priorityDelta === 0 ? a.index - b.index : priorityDelta;
    })
    .map((entry) => entry.overlay);
}

function overlayPriority(kind: ProfileOverlayKind): number {
  return kind === 'personal' ? 1 : 0;
}
