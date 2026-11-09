// Public deterministic domain API. No default profile or storage initialization.
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
  changeProfileSelectionBase,
  createProfileSelectionDraftModel,
  moveProfileSelectionBranch,
  removeProfileSelectionBranch,
  setProfileSelectionBranchSelected,
} from './profileSelectionDraft';
export type {
  CreateProfileSelectionDraftModelInput,
  ProfileSelectionBranchMoveDirection,
  ProfileSelectionBaseOption,
  ProfileSelectionBranchGroups,
  ProfileSelectionBranchOption,
  ProfileSelectionCheckerTargetOption,
  ProfileSelectionCheckerTargetState,
  ProfileSelectionDraftError,
  ProfileSelectionDraftErrorCode,
  ProfileSelectionDraftModel,
} from './profileSelectionDraft';
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
  BASE_PROFILE_ADDITIVE_TARGET_SWITCH_RISK_SCORE,
  createProposalTargetSwitchModel,
  formatTargetSwitchBlockReason,
  targetSwitchBlockReason,
} from './profileProposalTargetSwitch';
export type {
  CreateProposalTargetSwitchModelInput,
  ProposalTargetSwitchBlockReason,
  ProposalTargetSwitchModel,
  ProposalTargetSwitchReplacementPreview,
} from './profileProposalTargetSwitch';
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
export { validateOntologyCorrectionEvidenceForWrite } from './codecs/ontologyCorrectionEvidence';
export { validateProfileBranch } from './codecs/profileBranch';
export { parseProfilePatch, parseProposalEvidenceIds, validateProfileChangeProposal, isTerminalProposalStatus } from './codecs/profileChangeProposal';
export { validateProfileDefinition } from './codecs/profileDefinition';
export { parseProfileProposalEventDetails, validateProfileProposalEvent } from './codecs/profileProposalEvent';
export { validateProjectProfileSelection } from './codecs/profileSelection';
export { profileTrustSettingScopeKey, validateProfileTrustSetting, makeSuggestFirstProfileTrustSetting } from './codecs/profileTrustSetting';
