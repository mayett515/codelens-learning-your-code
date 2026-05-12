import type { DomainProfile, OntologyCorrectionEvidence } from './types';

/** Validate a single ontology correction evidence record against an active domain profile.
 *
 * Checks:
 * - profileId matches the profile.id
 * - activeSelectionSnapshot records the base profile where the mistake happened
 * - correctedTypeNodeId is a valid ontology item type
 * - previousTypeNodeId (when non-null) is a valid ontology item type
 * - correction is not a no-op (previous != corrected)
 * - evidence id, subject id, and branch ids are non-empty
 *
 * Does not mutate the profile or the correction evidence object.
 *
 * Returns an array of validation error strings.
 * Empty array means the evidence is valid for the given profile.
 */
export function validateOntologyCorrection(
  evidence: Readonly<OntologyCorrectionEvidence>,
  profile: Readonly<DomainProfile>,
): ReadonlyArray<string> {
  const errors: string[] = [];

  // Non-empty evidence id
  if (!evidence.id || evidence.id.trim().length === 0) {
    errors.push('evidence id must not be empty');
  }

  // Non-empty subject id
  if (!evidence.subjectId || evidence.subjectId.trim().length === 0) {
    errors.push('subject id must not be empty');
  }

  // Non-empty corrected type node id
  if (!evidence.correctedTypeNodeId || evidence.correctedTypeNodeId.trim().length === 0) {
    errors.push('corrected type node id must not be empty');
  }

  // Profile id must match
  if (evidence.profileId !== profile.id) {
    errors.push(`profile id mismatch: evidence references '${evidence.profileId}', active profile is '${profile.id}'`);
  }

  if (!evidence.activeSelectionSnapshot?.baseProfileId?.trim()) {
    errors.push('active selection snapshot baseProfileId must not be empty');
  } else if (evidence.activeSelectionSnapshot.baseProfileId !== evidence.profileId) {
    errors.push(
      `active selection snapshot baseProfileId mismatch: snapshot references '${evidence.activeSelectionSnapshot.baseProfileId}', evidence profile is '${evidence.profileId}'`,
    );
  }

  for (const [label, branchIds] of [
    ['projectBranchIds', evidence.activeSelectionSnapshot?.projectBranchIds],
    ['learningBranchIds', evidence.activeSelectionSnapshot?.learningBranchIds],
    ['personalBranchIds', evidence.activeSelectionSnapshot?.personalBranchIds],
  ] as const) {
    if (!branchIds) continue;
    for (const branchId of branchIds) {
      if (branchId.trim().length === 0) {
        errors.push(`active selection snapshot ${label} must not contain empty branch ids`);
      }
    }
  }

  // Corrected type node id must be a valid ontology item type
  const allowedTypes = profile.ontology.itemTypeNodeIds;
  if (!allowedTypes.includes(evidence.correctedTypeNodeId)) {
    errors.push(`corrected type node id '${evidence.correctedTypeNodeId}' is not a valid ontology item type`);
  }

  // Previous type node id, when non-null, must also be valid
  if (evidence.previousTypeNodeId !== null) {
    if (!allowedTypes.includes(evidence.previousTypeNodeId)) {
      errors.push(`previous type node id '${evidence.previousTypeNodeId}' is not a valid ontology item type`);
    }
  }

  // No-op: previous and corrected must differ
  if (evidence.previousTypeNodeId === evidence.correctedTypeNodeId) {
    errors.push('no-op correction: previous and corrected type node ids are equal');
  }

  return errors;
}
