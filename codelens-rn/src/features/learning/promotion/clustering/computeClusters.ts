import { normalizeConceptKey } from '../../codecs/concept';
import type { ConceptId, LearningCaptureId } from '../../types/ids';
import type { ConceptType, LearningCapture } from '../../types/learning';
import type { ClusterCandidate, PromotionDismissal } from '../types/promotion';
import { clusterFingerprint } from './fingerprint';

const EDGE_THRESHOLD = 0.75;
const MAX_CLUSTER_SIZE = 12;
const LANGUAGE_OR_RUNTIME_TOKENS = new Set([
  'javascript',
  'typescript',
  'java',
  'kotlin',
  'swift',
  'python',
  'react',
  'react native',
  'sql',
  'sqlite',
]);

interface SimilarityEdge {
  left: LearningCaptureId;
  right: LearningCaptureId;
  similarity: number;
}

export interface ComputeClustersDeps {
  findEligibleCaptures: () => Promise<LearningCapture[]>;
  topMatches: (capture: LearningCapture, candidateIds: LearningCaptureId[]) => Promise<Array<{ id: string; cosine: number }>>;
  dismissals: () => Promise<PromotionDismissal[]>;
}

const defaultDeps: ComputeClustersDeps = {
  findEligibleCaptures: async () => {
    const { findEligibleCapturesForClustering } = await import('../../data/captureRepo');
    return findEligibleCapturesForClustering();
  },
  topMatches: async (capture, candidateIds) => {
    const vector = await loadStoredCaptureVector(capture.id);
    if (!vector) return [];
    const { vectorStore } = await import('../../../../composition');
    const matches = await vectorStore.topMatches({
      vector,
      candidateIds: candidateIds as unknown as ConceptId[],
      limit: Math.max(candidateIds.length, 1),
    });
    return matches
      .filter((match) => match.id !== (capture.id as unknown as ConceptId))
      .map((match) => ({ id: match.id as unknown as string, cosine: match.cosine }));
  },
  dismissals: async () => [],
};

async function loadStoredCaptureVector(captureId: LearningCaptureId): Promise<Float32Array | null> {
  try {
    const { getRawDb } = await import('../../../../db/client');
    const result = await getRawDb().execute(
      'SELECT embedding FROM embeddings_vec WHERE concept_id = ? LIMIT 1',
      [captureId],
    );
    const raw = result.rows[0]?.embedding;
    if (raw instanceof ArrayBuffer) return new Float32Array(raw);
    if (raw instanceof Uint8Array) {
      return new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4);
    }
    return null;
  } catch (error) {
    console.warn('[learning/promotion] failed to load capture embedding', error);
    return null;
  }
}

export async function computeClusters(
  deps: Partial<ComputeClustersDeps> = {},
): Promise<ClusterCandidate[]> {
  const resolvedDeps = { ...defaultDeps, ...deps };
  const eligible = await resolvedDeps.findEligibleCaptures();
  if (eligible.length < 3) return [];

  const captureById = new Map(eligible.map((capture) => [capture.id, capture]));
  const candidateIds = eligible.map((capture) => capture.id);
  const edges = await buildSimilarityEdges(eligible, candidateIds, resolvedDeps.topMatches);
  const components = connectedComponents(candidateIds, edges)
    .flatMap((component) => splitIfOversized(component, edges));
  const dismissals = await resolvedDeps.dismissals();

  const clusters: ClusterCandidate[] = [];
  for (const component of components) {
    const captures = component.map((id) => captureById.get(id)).filter((capture): capture is LearningCapture => !!capture);
    const candidate = await buildClusterCandidate(captures, edges);
    if (!candidate) continue;
    if (isDismissed(candidate, dismissals)) continue;
    clusters.push(candidate);
  }

  const assignedClusters = await assignCaptureOnce(clusters, captureById, edges);
  return assignedClusters.sort((left, right) => {
    const byScore = right.clusterScore - left.clusterScore;
    if (byScore !== 0) return byScore;
    const byCount = right.captureIds.length - left.captureIds.length;
    if (byCount !== 0) return byCount;
    const byCreatedAt = right.maxCreatedAt - left.maxCreatedAt;
    if (byCreatedAt !== 0) return byCreatedAt;
    return left.fingerprint.localeCompare(right.fingerprint);
  });
}

async function buildSimilarityEdges(
  captures: LearningCapture[],
  candidateIds: LearningCaptureId[],
  topMatches: ComputeClustersDeps['topMatches'],
): Promise<SimilarityEdge[]> {
  const seen = new Set<string>();
  const edges: SimilarityEdge[] = [];
  for (const capture of captures) {
    const matches = await topMatches(capture, candidateIds);
    for (const match of matches) {
      if (match.cosine < EDGE_THRESHOLD) continue;
      if (!captureById(candidateIds, match.id)) continue;
      const pair = [capture.id, match.id].sort().join('|');
      if (seen.has(pair)) continue;
      seen.add(pair);
      edges.push({
        left: capture.id,
        right: match.id as LearningCaptureId,
        similarity: match.cosine,
      });
    }
  }
  return edges;
}

function captureById(ids: LearningCaptureId[], value: string): boolean {
  return ids.some((id) => id === value);
}

function connectedComponents(ids: LearningCaptureId[], edges: SimilarityEdge[]): LearningCaptureId[][] {
  const neighbors = new Map<LearningCaptureId, LearningCaptureId[]>();
  ids.forEach((id) => neighbors.set(id, []));
  edges.forEach((edge) => {
    neighbors.get(edge.left)?.push(edge.right);
    neighbors.get(edge.right)?.push(edge.left);
  });

  const seen = new Set<LearningCaptureId>();
  const components: LearningCaptureId[][] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    const stack = [id];
    const component: LearningCaptureId[] = [];
    seen.add(id);
    while (stack.length > 0) {
      const current = stack.pop()!;
      component.push(current);
      for (const next of neighbors.get(current) ?? []) {
        if (seen.has(next)) continue;
        seen.add(next);
        stack.push(next);
      }
    }
    components.push(component);
  }
  return components;
}

function splitIfOversized(component: LearningCaptureId[], edges: SimilarityEdge[]): LearningCaptureId[][] {
  if (component.length <= MAX_CLUSTER_SIZE) return [component];
  const edgeScore = new Map<string, number>();
  edges.forEach((edge) => {
    edgeScore.set([edge.left, edge.right].sort().join('|'), edge.similarity);
  });
  return component
    .slice()
    .sort((left, right) => meanForId(right, component, edgeScore) - meanForId(left, component, edgeScore))
    .reduce<LearningCaptureId[][]>((groups, id) => {
      const last = groups[groups.length - 1];
      if (!last || last.length >= MAX_CLUSTER_SIZE) groups.push([id]);
      else last.push(id);
      return groups;
    }, []);
}

async function buildClusterCandidate(
  captures: LearningCapture[],
  edges: SimilarityEdge[],
): Promise<ClusterCandidate | null> {
  if (captures.length < 3) return null;
  const sessionIds = new Set(captures.map((capture) => capture.sessionId).filter(Boolean));
  if (sessionIds.size < 2) return null;

  const sharedKeywords = getSharedKeywords(captures);
  if (sharedKeywords.length < 1) return null;

  const meanSimilarity = meanPairwiseSimilarity(captures.map((capture) => capture.id), edges);
  if (meanSimilarity < EDGE_THRESHOLD) return null;

  const avgExtractionConfidence = average(
    captures.map((capture) => capture.extractionConfidence ?? 0),
  );
  const proposedName = mostCommonName(captures);
  const proposedConceptType = mostCommonConceptType(captures);
  const captureIds = captures.map((capture) => capture.id).sort();
  const fingerprint = await clusterFingerprint(captureIds);
  return {
    fingerprint,
    captureIds,
    meanSimilarity,
    sessionCount: sessionIds.size,
    sharedKeywords,
    avgExtractionConfidence,
    proposedName,
    proposedNormalizedKey: normalizeConceptKey(proposedName),
    proposedConceptType,
    clusterScore: avgExtractionConfidence * Math.log(1 + captures.length),
    maxCreatedAt: Math.max(...captures.map((capture) => capture.createdAt)),
  };
}

function getSharedKeywords(captures: LearningCapture[]): string[] {
  const counts = new Map<string, number>();
  captures.flatMap((capture) => capture.keywords).forEach((keyword) => {
    const normalized = keyword.trim().toLowerCase();
    if (!normalized || LANGUAGE_OR_RUNTIME_TOKENS.has(normalized)) return;
    counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
  });
  return [...counts.entries()]
    .filter(([, count]) => count >= 2)
    .map(([keyword]) => keyword)
    .sort();
}

function meanPairwiseSimilarity(ids: LearningCaptureId[], edges: SimilarityEdge[]): number {
  const edgeMap = new Map(edges.map((edge) => [[edge.left, edge.right].sort().join('|'), edge.similarity]));
  const values: number[] = [];
  for (let leftIndex = 0; leftIndex < ids.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < ids.length; rightIndex += 1) {
      values.push(edgeMap.get([ids[leftIndex], ids[rightIndex]].sort().join('|')) ?? 0);
    }
  }
  return average(values);
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function meanForId(id: LearningCaptureId, component: LearningCaptureId[], edgeScore: Map<string, number>): number {
  return average(
    component
      .filter((other) => other !== id)
      .map((other) => edgeScore.get([id, other].sort().join('|')) ?? 0),
  );
}

function mostCommonName(captures: LearningCapture[]): string {
  const scored = new Map<string, number>();
  captures.forEach((capture) => {
    const name = capture.conceptHint?.proposedName ?? capture.title;
    scored.set(name, (scored.get(name) ?? 0) + (capture.extractionConfidence ?? 0.1));
  });
  return [...scored.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0]?.[0] ?? 'New Concept';
}

function mostCommonConceptType(captures: LearningCapture[]): ConceptType {
  const typeOrder: ConceptType[] = [
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
  ];
  const scored = new Map<ConceptType, number>();
  captures.forEach((capture) => {
    const type = capture.conceptHint?.proposedConceptType ?? 'mental_model';
    scored.set(type, (scored.get(type) ?? 0) + (capture.extractionConfidence ?? 0.1));
  });
  return [...scored.entries()]
    .sort((left, right) => right[1] - left[1] || typeOrder.indexOf(left[0]) - typeOrder.indexOf(right[0]))[0]?.[0] ?? 'mental_model';
}

function isDismissed(candidate: ClusterCandidate, dismissals: PromotionDismissal[]): boolean {
  const relevantDismissals = dismissals.filter(
    (item) => item.proposedNormalizedKey === candidate.proposedNormalizedKey,
  );
  if (relevantDismissals.some((item) => item.isPermanent)) {
    return true;
  }
  const dismissal = relevantDismissals
    .filter((item) => !item.isPermanent)
    .sort((left, right) => right.dismissedAt - left.dismissedAt)[0];
  if (!dismissal) return false;
  if (Date.now() - dismissal.dismissedAt >= 30 * 24 * 60 * 60 * 1000) return false;
  if (candidate.captureIds.length >= dismissal.captureCount + 2) return false;
  const previous = new Set(dismissal.captureIds);
  const gained = candidate.captureIds.filter((id) => !previous.has(id)).length;
  const current = new Set(candidate.captureIds);
  const lost = dismissal.captureIds.filter((id) => !current.has(id)).length;
  if (gained >= 2 && lost >= 2) return false;
  return true;
}

async function assignCaptureOnce(
  clusters: ClusterCandidate[],
  captureById: Map<LearningCaptureId, LearningCapture>,
  edges: SimilarityEdge[],
): Promise<ClusterCandidate[]> {
  const assigned = new Set<LearningCaptureId>();
  const assignedClusters = clusters
    .slice()
    .sort((left, right) => right.meanSimilarity - left.meanSimilarity || right.captureIds.length - left.captureIds.length || left.fingerprint.localeCompare(right.fingerprint))
    .map((cluster) => ({
      ...cluster,
      captureIds: cluster.captureIds.filter((id) => {
        if (assigned.has(id)) return false;
        assigned.add(id);
        return true;
      }),
    }));

  const rebuilt: ClusterCandidate[] = [];
  for (const cluster of assignedClusters) {
    const captures = cluster.captureIds
      .map((id) => captureById.get(id))
      .filter((capture): capture is LearningCapture => !!capture);
    const candidate = await buildClusterCandidate(captures, edges);
    if (candidate) rebuilt.push(candidate);
  }
  return rebuilt;
}
