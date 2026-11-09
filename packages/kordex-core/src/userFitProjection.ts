import type {
  OntologyCorrectionActiveSelectionSnapshot,
  OntologyCorrectionEvidence,
  ProfileChangeProposalKind,
  ProfileChangeProposalTarget,
  ProfileProposalEvent,
} from './types';

const DEFAULT_USER_FIT_SIGNAL_LIMIT = 20;
const MISSING_CONCEPT_POSITIVE_WEIGHT = 0.5;
const NEAR_MISS_POSITIVE_WEIGHT = 0.25;
const POSTPONED_NEGATIVE_WEIGHT = 0.35;

export interface UserFitProjectionInput {
  baseProfileId: string;
  correctionEvidence?: readonly OntologyCorrectionEvidence[] | undefined;
  proposalEvents?: readonly ProfileProposalEvent[] | undefined;
  maxNodeSignals?: number | undefined;
  maxProposalSignals?: number | undefined;
}

export interface UserFitNodeSignal {
  baseProfileId: string;
  /** Active profile selection where the correction happened. */
  scopeId: string;
  activeSelectionSnapshot: UserFitNormalizedActiveSelectionSnapshot;
  nodeId: string;
  userFitConfidence: number;
  score: number;
  positiveCorrectionCount: number;
  negativeCorrectionCount: number;
  missingConceptCorrectionCount: number;
  nearMissHitCount: number;
  evidenceIds: readonly string[];
  latestAt: number;
}

export interface UserFitProposalSignal {
  baseProfileId: string;
  proposalKind: ProfileChangeProposalKind;
  target: ProfileChangeProposalTarget;
  targetKey: string;
  userFitConfidence: number;
  score: number;
  appliedCount: number;
  rejectedCount: number;
  postponedCount: number;
  askedWhyCount: number;
  eventIds: readonly string[];
  latestAt: number;
}

export interface UserFitProjection {
  baseProfileId: string;
  nodeSignals: readonly UserFitNodeSignal[];
  proposalSignals: readonly UserFitProposalSignal[];
  summary: {
    correctionEvidenceCount: number;
    proposalEventCount: number;
    missingConceptCorrectionCount: number;
    nearMissHitCount: number;
    omittedNodeSignalCount: number;
    omittedProposalSignalCount: number;
  };
}

export interface UserFitNormalizedActiveSelectionSnapshot {
  baseProfileId: string;
  projectBranchIds: readonly string[];
  learningBranchIds: readonly string[];
  personalBranchIds: readonly string[];
}

interface MutableNodeSignal {
  baseProfileId: string;
  scopeId: string;
  activeSelectionSnapshot: UserFitNormalizedActiveSelectionSnapshot;
  nodeId: string;
  positiveCorrectionCount: number;
  negativeCorrectionCount: number;
  missingConceptCorrectionCount: number;
  nearMissHitCount: number;
  evidenceIds: Set<string>;
  latestAt: number;
}

interface MutableProposalSignal {
  baseProfileId: string;
  proposalKind: ProfileChangeProposalKind;
  target: ProfileChangeProposalTarget;
  targetKey: string;
  appliedCount: number;
  rejectedCount: number;
  postponedCount: number;
  askedWhyCount: number;
  eventIds: Set<string>;
  latestAt: number;
}

export function projectUserFitSignals(
  input: UserFitProjectionInput,
): UserFitProjection {
  const maxNodeSignals = normalizeLimit(
    input.maxNodeSignals,
    DEFAULT_USER_FIT_SIGNAL_LIMIT,
  );
  const maxProposalSignals = normalizeLimit(
    input.maxProposalSignals,
    DEFAULT_USER_FIT_SIGNAL_LIMIT,
  );
  const nodeSignals = new Map<string, MutableNodeSignal>();
  const proposalSignals = new Map<string, MutableProposalSignal>();
  let missingConceptCorrectionCount = 0;
  let nearMissHitCount = 0;

  for (const evidence of input.correctionEvidence ?? []) {
    if (evidence.profileId !== input.baseProfileId) continue;

    const activeSelectionSnapshot = normalizeActiveSelectionSnapshot(
      evidence.activeSelectionSnapshot,
    );
    const correctedScopeId = userFitActiveSelectionScopeKey(activeSelectionSnapshot);
    const corrected = getOrCreateNodeSignal(
      nodeSignals,
      input.baseProfileId,
      correctedScopeId,
      activeSelectionSnapshot,
      evidence.correctedTypeNodeId,
    );
    corrected.positiveCorrectionCount += 1;
    corrected.evidenceIds.add(evidence.id);
    corrected.latestAt = Math.max(corrected.latestAt, evidence.createdAt);

    if (evidence.previousTypeNodeId !== null) {
      const previous = getOrCreateNodeSignal(
        nodeSignals,
        input.baseProfileId,
        correctedScopeId,
        activeSelectionSnapshot,
        evidence.previousTypeNodeId,
      );
      previous.negativeCorrectionCount += 1;
      previous.evidenceIds.add(evidence.id);
      previous.latestAt = Math.max(previous.latestAt, evidence.createdAt);
    } else {
      corrected.missingConceptCorrectionCount += 1;
      missingConceptCorrectionCount += 1;
    }

    const nearMissHit = evidence.nearMissCandidates?.find((candidate) =>
      candidate.nodeId === evidence.correctedTypeNodeId);
    if (nearMissHit) {
      corrected.nearMissHitCount += 1;
      nearMissHitCount += 1;
    }
  }

  for (const event of input.proposalEvents ?? []) {
    if (event.baseProfileId !== input.baseProfileId) continue;
    if (event.action === 'superseded') continue;

    const targetKey = profileChangeProposalTargetKey(event.target);
    const key = `${event.baseProfileId}:${event.proposalKind}:${targetKey}`;
    const signal = proposalSignals.get(key) ?? {
      baseProfileId: event.baseProfileId,
      proposalKind: event.proposalKind,
      target: cloneTarget(event.target),
      targetKey,
      appliedCount: 0,
      rejectedCount: 0,
      postponedCount: 0,
      askedWhyCount: 0,
      eventIds: new Set<string>(),
      latestAt: 0,
    };

    switch (event.action) {
      case 'applied':
        signal.appliedCount += 1;
        break;
      case 'rejected':
        signal.rejectedCount += 1;
        break;
      case 'postponed':
        signal.postponedCount += 1;
        break;
      case 'asked_why':
        signal.askedWhyCount += 1;
        break;
    }

    signal.eventIds.add(event.id);
    signal.latestAt = Math.max(signal.latestAt, event.createdAt);
    proposalSignals.set(key, signal);
  }

  const allNodeSignals = [...nodeSignals.values()]
    .map(toNodeSignal)
    .sort(compareUserFitNodeSignals);
  const allProposalSignals = [...proposalSignals.values()]
    .map(toProposalSignal)
    .sort(compareUserFitProposalSignals);

  return {
    baseProfileId: input.baseProfileId,
    nodeSignals: allNodeSignals.slice(0, maxNodeSignals),
    proposalSignals: allProposalSignals.slice(0, maxProposalSignals),
    summary: {
      correctionEvidenceCount: (input.correctionEvidence ?? [])
        .filter((evidence) => evidence.profileId === input.baseProfileId).length,
      proposalEventCount: (input.proposalEvents ?? [])
        .filter((event) => event.baseProfileId === input.baseProfileId).length,
      missingConceptCorrectionCount,
      nearMissHitCount,
      omittedNodeSignalCount: Math.max(0, allNodeSignals.length - maxNodeSignals),
      omittedProposalSignalCount: Math.max(0, allProposalSignals.length - maxProposalSignals),
    },
  };
}

export function profileChangeProposalTargetKey(target: ProfileChangeProposalTarget): string {
  if (target.kind === 'profile_branch') return `profile_branch:${target.branchId ?? '<missing>'}`;
  return `base_profile:${target.profileId ?? '<missing>'}`;
}

export function userFitActiveSelectionScopeKey(
  snapshot: OntologyCorrectionActiveSelectionSnapshot,
): string {
  const normalized = normalizeActiveSelectionSnapshot(snapshot);
  return [
    `base:${encodeURIComponent(normalized.baseProfileId)}`,
    `project:${formatBranchKeyPart(normalized.projectBranchIds)}`,
    `learning:${formatBranchKeyPart(normalized.learningBranchIds)}`,
    `personal:${formatBranchKeyPart(normalized.personalBranchIds)}`,
  ].join('|');
}

function getOrCreateNodeSignal(
  signals: Map<string, MutableNodeSignal>,
  baseProfileId: string,
  scopeId: string,
  activeSelectionSnapshot: UserFitNormalizedActiveSelectionSnapshot,
  nodeId: string,
): MutableNodeSignal {
  const key = `${baseProfileId}:${scopeId}:${nodeId}`;
  const existing = signals.get(key);
  if (existing) return existing;

  const created: MutableNodeSignal = {
    baseProfileId,
    scopeId,
    activeSelectionSnapshot,
    nodeId,
    positiveCorrectionCount: 0,
    negativeCorrectionCount: 0,
    missingConceptCorrectionCount: 0,
    nearMissHitCount: 0,
    evidenceIds: new Set<string>(),
    latestAt: 0,
  };
  signals.set(key, created);
  return created;
}

function toNodeSignal(signal: MutableNodeSignal): UserFitNodeSignal {
  const positiveWeight =
    signal.positiveCorrectionCount +
    signal.missingConceptCorrectionCount * MISSING_CONCEPT_POSITIVE_WEIGHT +
    signal.nearMissHitCount * NEAR_MISS_POSITIVE_WEIGHT;
  const negativeWeight = signal.negativeCorrectionCount;
  const userFitConfidence = betaConfidence(positiveWeight, negativeWeight);

  return {
    baseProfileId: signal.baseProfileId,
    scopeId: signal.scopeId,
    activeSelectionSnapshot: cloneActiveSelectionSnapshot(signal.activeSelectionSnapshot),
    nodeId: signal.nodeId,
    userFitConfidence,
    score: confidenceToScore(userFitConfidence),
    positiveCorrectionCount: signal.positiveCorrectionCount,
    negativeCorrectionCount: signal.negativeCorrectionCount,
    missingConceptCorrectionCount: signal.missingConceptCorrectionCount,
    nearMissHitCount: signal.nearMissHitCount,
    evidenceIds: [...signal.evidenceIds].sort(),
    latestAt: signal.latestAt,
  };
}

function toProposalSignal(signal: MutableProposalSignal): UserFitProposalSignal {
  const positiveWeight = signal.appliedCount;
  const negativeWeight =
    signal.rejectedCount +
    signal.postponedCount * POSTPONED_NEGATIVE_WEIGHT;
  const userFitConfidence = betaConfidence(positiveWeight, negativeWeight);

  return {
    baseProfileId: signal.baseProfileId,
    proposalKind: signal.proposalKind,
    target: cloneTarget(signal.target),
    targetKey: signal.targetKey,
    userFitConfidence,
    score: confidenceToScore(userFitConfidence),
    appliedCount: signal.appliedCount,
    rejectedCount: signal.rejectedCount,
    postponedCount: signal.postponedCount,
    askedWhyCount: signal.askedWhyCount,
    eventIds: [...signal.eventIds].sort(),
    latestAt: signal.latestAt,
  };
}

function betaConfidence(positiveWeight: number, negativeWeight: number): number {
  return roundConfidence((positiveWeight + 1) / (positiveWeight + negativeWeight + 2));
}

function confidenceToScore(confidence: number): number {
  return roundScore(confidence * 2 - 1);
}

function roundConfidence(value: number): number {
  return Math.round(clamp(value, 0, 1) * 1000) / 1000;
}

function roundScore(value: number): number {
  return Math.round(clamp(value, -1, 1) * 1000) / 1000;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function compareUserFitNodeSignals(a: UserFitNodeSignal, b: UserFitNodeSignal): number {
  // Strong rejects are as useful to future callers as strong accepts.
  return Math.abs(b.score) - Math.abs(a.score)
    || b.latestAt - a.latestAt
    || a.scopeId.localeCompare(b.scopeId)
    || a.nodeId.localeCompare(b.nodeId);
}

function compareUserFitProposalSignals(a: UserFitProposalSignal, b: UserFitProposalSignal): number {
  // Strong rejects are as useful to future callers as strong accepts.
  return Math.abs(b.score) - Math.abs(a.score)
    || b.latestAt - a.latestAt
    || a.proposalKind.localeCompare(b.proposalKind)
    || a.targetKey.localeCompare(b.targetKey);
}

function cloneTarget(target: ProfileChangeProposalTarget): ProfileChangeProposalTarget {
  return {
    kind: target.kind,
    ...(target.profileId === undefined ? {} : { profileId: target.profileId }),
    ...(target.branchId === undefined ? {} : { branchId: target.branchId }),
  };
}

function normalizeActiveSelectionSnapshot(
  snapshot: OntologyCorrectionActiveSelectionSnapshot,
): UserFitNormalizedActiveSelectionSnapshot {
  return {
    baseProfileId: snapshot.baseProfileId,
    projectBranchIds: [...(snapshot.projectBranchIds ?? [])],
    learningBranchIds: [...(snapshot.learningBranchIds ?? [])],
    personalBranchIds: [...(snapshot.personalBranchIds ?? [])],
  };
}

function cloneActiveSelectionSnapshot(
  snapshot: UserFitNormalizedActiveSelectionSnapshot,
): UserFitNormalizedActiveSelectionSnapshot {
  return {
    baseProfileId: snapshot.baseProfileId,
    projectBranchIds: [...snapshot.projectBranchIds],
    learningBranchIds: [...snapshot.learningBranchIds],
    personalBranchIds: [...snapshot.personalBranchIds],
  };
}

function formatBranchKeyPart(ids: readonly string[]): string {
  return ids.length > 0
    ? ids.map((id) => encodeURIComponent(id)).join(',')
    : '-';
}

function normalizeLimit(value: number | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0, Math.floor(value));
}
