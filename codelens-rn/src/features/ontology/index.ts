import { codingProfile } from './profiles/codingProfile';
import { resolveActiveDomainProfile } from './profileActivation';
import type { CodingConceptTypeNodeId } from './profiles/codingProfile';
import type { DomainProfile, OntologyNode, ProfileOverlay } from './types';

export type {
  BoundaryRule,
  DomainLabels,
  DomainProfile,
  EmbeddingProfile,
  ExtractionProfile,
  GraphProfile,
  MetadataFieldDefinition,
  OntologyNode,
  OntologyNodeCreator,
  OntologyNodeKind,
  OntologyNodeStatus,
  OntologyProfile,
  PromotionProfile,
  RetrievalProfile,
  ReviewProfile,
  OntologyCorrectionActiveSelectionSnapshot,
  OntologyCorrectionEvidence,
  OntologyCorrectionField,
  OntologyCorrectionNearMissCandidate,
  OntologyCorrectionSource,
  OntologyCorrectionSubjectKind,
  ProfileChangeProposal,
  ProfileChangeProposalKind,
  ProfileChangeProposalSourceKind,
  ProfileChangeProposalStatus,
  ProfileChangeProposalTarget,
  ProfileChangeProposalTargetKind,
  ProfilePatch,
  ProfileProposalEvent,
  ProfileProposalEventAction,
  ProfileProposalEventActorKind,
  ProfileTrustMode,
  ProfileTrustSetting,
} from './types';

export {
  CODING_CONCEPT_TYPE_COLORS,
  CODING_CONCEPT_TYPE_NODE_IDS,
  codingOntologyNodes,
  codingProfile,
} from './profiles/codingProfile';
export type { CodingConceptTypeNodeId } from './profiles/codingProfile';

export { composeDomainProfile } from './profileComposition';
export type { ProfileOverlay, ProfileOverlayKind } from './types';
export { resolveActiveDomainProfile } from './profileActivation';
export type { ActiveDomainProfileSource } from './types';
export { createActiveDomainProfileSource, resolveActiveDomainProfileFromActivationInput } from './profileActivation';
export type { ActiveDomainProfileActivationInput } from './types';

export { composeRuntimeDomainProfile } from './runtimeProfileCoordinator';
export type { RuntimeProfileCoordinatorInput } from './runtimeProfileCoordinator';

export type { ProfileBranch, ProfileBranchKind, ProfileSelection } from './types';
export {
  composeRuntimeDomainProfileFromBranches,
  createActiveDomainProfileSourceFromBranches,
  groupProfileBranchesByKind,
  profileBranchToOverlay,
} from './profileBranches';
export {
  BaseProfileVersioningError,
  assertBaseProfileProposalTargetsCurrentVersion,
} from './baseProfileVersioning';
export type {
  AssertBaseProfileProposalTargetVersionInput,
  BaseProfileVersioningErrorCode,
} from './baseProfileVersioning';
export { evaluateProfileProposalFreshness } from './profileProposalFreshness';
export type {
  ProfileProposalFreshness,
  ProfileProposalFreshnessReason,
  ProfileProposalFreshnessStatus,
  ProfileProposalPatchValidation,
  ProfileProposalTargetFacts,
} from './profileProposalFreshness';
export {
  BaseProfileProposalApplyError,
  applyBaseProfileChangeProposal,
  applyBaseProfilePatchOperation,
  compileBaseProfileProposalApplyOperation,
} from './baseProfileProposalApply';
export type {
  BaseProfilePatchOperation,
  BaseProfileProposalApplyErrorCode,
  BaseProfileProposalApplyInput,
  BaseProfileProposalApplyResult,
} from './baseProfileProposalApply';
export {
  BranchLocalProposalApplyError,
  applyBranchLocalProfileChangeProposal,
  applyBranchLocalProfilePatchOperation,
  compileBranchLocalProposalApplyOperation,
} from './branchLocalProposalApply';
export type {
  BranchLocalProfilePatchOperation,
  BranchLocalProposalApplyErrorCode,
  BranchLocalProposalApplyInput,
  BranchLocalProposalApplyResult,
} from './branchLocalProposalApply';

export type { ResolvedProfileSelection } from './profileSelection';
export {
  composeRuntimeDomainProfileFromSelection,
  resolveProfileSelection,
} from './profileSelection';

export {
  DuplicateProfileIdError,
  ProfileNotFoundError,
  createProfileDefinitionSource,
  createProfileRegistry,
  createStaticProfileSource,
  toDomainProfileSummary,
} from './profileRegistry';
export type {
  DomainProfileSummary,
  ProfileDefinition,
  ProfileDefinitionSourceKind,
  ProfileRegistry,
  ProfileSource,
} from './types';

export type { ProfileBranchStore } from './types';
export { createStaticProfileBranchStore } from './profileBranchStore';

export {
  DEFAULT_RUNTIME_PROFILE_BASE_PROFILE_ID,
  RuntimeProfileActivationError,
  resolveRuntimeProfileForProject,
} from './runtimeProfileActivation';
export type {
  ProjectProfileSelectionStore,
  ProjectRuntimeProfileActivationInput,
  ProjectRuntimeProfileActivationResult,
  RuntimeProfileActivationErrorCode,
} from './runtimeProfileActivation';

export { getMetadataField, getMetadataFieldLabel, getMetadataFieldPlaceholder } from './metadata';
export {
  canonicalizeOntologyDisplayLabel,
  createScopedOntologyNodeReferences,
  findSameLabelScopedMeanings,
  formatOntologyNodeLabelForContext,
  formatScopedOntologyNodeLabel,
  normalizeOntologyDisplayLabel,
} from './scopedMeaning';
export type {
  SameLabelScopedMeaningGroup,
  ScopedOntologyNodeReference,
} from './scopedMeaning';
export {
  DEFAULT_CONTEXT_BUDGET_CAPS,
  assembleContextPack,
  assertValidContextPack,
  scopedNodeRefKey,
  serializeContextPack,
  validateContextPack,
} from './contextAssembly';
export type {
  AssembleContextPackInput,
  ContextBudgetCaps,
  ContextBudgetReport,
  ContextBudgetSection,
  ContextBudgetTruncation,
  ContextCompositionStamp,
  ContextEvidenceClaim,
  ContextEvidenceClaimInput,
  ContextEvidenceSection,
  ContextExpandHandle,
  ContextFocal,
  ContextGraphSection,
  ContextGraphSectionInput,
  ContextOntologyNode,
  ContextOntologyNodeInput,
  ContextOntologySection,
  ContextPack,
  ContextPackConsumer,
  ContextPackValidationCode,
  ContextPackValidationError,
  ContextPackValidationResult,
  ContextPolicy,
  ContextProposalAggregatedSignals,
  ContextProposalEventSection,
  ContextProposalEventSignal,
  ContextProposalEventSignalInput,
  ContextProposalSection,
  ContextProposalSnapshot,
  ContextProposalSnapshotInput,
  ContextRelationshipRef,
  ContextSameLabelSiblingGroup,
  ContextScopeLegend,
  ContextScopeLegendEntry,
  ContextUserFitNodeSignal,
  ContextUserFitNodeSignalInput,
  ContextUserFitProposalSignal,
  ContextUserFitProposalSignalInput,
  ContextUserFitSection,
  ScopedNodeRef,
} from './contextAssembly';
export {
  createCheckerContextSelector,
  createConceptualizeContextSelector,
  selectCheckerContext,
  selectConceptualizeContext,
} from './contextSelector';
export type {
  CheckerContextSelectorInput,
  ConceptualizeContextSelectorInput,
  ContextSelection,
  ContextSelectionBucket,
  ContextSelectionReason,
  ContextSelectionSection,
  ContextSelectionTraceEntry,
  ContextSelector,
  SharedContextSelectorInput,
} from './contextSelector';
export {
  CHECKER_PROMPT_OUTPUT_VERSION,
  CHECKER_PROMPT_VERSION,
  MAX_CHECKER_FINDINGS_HARD_CAP,
  buildCheckerPrompt,
  validateCheckerPromptOutput,
} from './checkerPromptBuilder';
export type {
  BuildCheckerPromptInput,
  CheckerPromptBuildResult,
  CheckerPromptFinding,
  CheckerPromptFindingKind,
  CheckerPromptOutput,
  CheckerPromptOutputValidationCode,
  CheckerPromptOutputValidationError,
  CheckerPromptOutputValidationResult,
  CheckerPromptPayload,
} from './checkerPromptBuilder';
export {
  CHECKER_BRANCH_LOCAL_ADDITIVE_RISK_SCORE,
  CHECKER_MAX_PROPOSALS_PER_RUN,
  makeCheckerNodeId,
  mapCheckerOutputToProfileChangeProposals,
} from './checkerProposalMapper';
export type {
  CheckerProposalMapperExplanation,
  CheckerProposalMapperResult,
  CheckerProposalSkipReason,
  CheckerProposalSkippedFinding,
  CheckerTargetBranchSnapshot,
  MapCheckerOutputToProfileChangeProposalsInput,
} from './checkerProposalMapper';
export {
  profileChangeProposalTargetKey,
  projectUserFitSignals,
  userFitActiveSelectionScopeKey,
} from './userFitProjection';
export type {
  UserFitNodeSignal,
  UserFitNormalizedActiveSelectionSnapshot,
  UserFitProjection,
  UserFitProjectionInput,
  UserFitProposalSignal,
} from './userFitProjection';
export { validateOntologyCorrection } from './corrections';

export function getActiveDomainProfile(): DomainProfile<CodingConceptTypeNodeId>;
export function getActiveDomainProfile(overlays: readonly ProfileOverlay<string>[]): DomainProfile<string>;
export function getActiveDomainProfile(
  overlays?: readonly ProfileOverlay<string>[],
): DomainProfile<string> {
  return resolveActiveDomainProfile<string>({
    baseProfile: codingProfile as DomainProfile<string>,
    overlays,
  });
}

export function getOntologyNode(
  nodeId: string,
  profile: DomainProfile = getActiveDomainProfile(),
): OntologyNode | undefined {
  return profile.ontology.nodes.find((node) => node.id === nodeId);
}

export function getOntologyNodeLabel(
  nodeId: string,
  profile: DomainProfile = getActiveDomainProfile(),
): string {
  return getOntologyNode(nodeId, profile)?.label ?? nodeId.replace(/_/g, ' ');
}
