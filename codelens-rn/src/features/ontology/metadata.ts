import type { DomainProfile, MetadataFieldDefinition } from './types';

export function getMetadataField(
  profile: DomainProfile,
  fieldId: string,
): MetadataFieldDefinition | undefined {
  return profile.metadataFields.find((f) => f.id === fieldId);
}

export function getMetadataFieldLabel(
  profile: DomainProfile,
  fieldId: string,
  fallback: string,
): string {
  return getMetadataField(profile, fieldId)?.label ?? fallback;
}

export function getMetadataFieldPlaceholder(
  profile: DomainProfile,
  fieldId: string,
  fallback: string,
): string {
  const field = getMetadataField(profile, fieldId);
  return field?.placeholder ?? field?.label ?? fallback;
}
