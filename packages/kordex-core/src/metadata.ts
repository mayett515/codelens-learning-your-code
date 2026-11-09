import type { LearningDomainProfile, MetadataFieldDefinition } from './extensions/learningProfile';

export function getMetadataField(
  profile: LearningDomainProfile,
  fieldId: string,
): MetadataFieldDefinition | undefined {
  return profile.metadataFields.find((f) => f.id === fieldId);
}

export function getMetadataFieldLabel(
  profile: LearningDomainProfile,
  fieldId: string,
  fallback: string,
): string {
  return getMetadataField(profile, fieldId)?.label ?? fallback;
}

export function getMetadataFieldPlaceholder(
  profile: LearningDomainProfile,
  fieldId: string,
  fallback: string,
): string {
  const field = getMetadataField(profile, fieldId);
  return field?.placeholder ?? field?.label ?? fallback;
}
