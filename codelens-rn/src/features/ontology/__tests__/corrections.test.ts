import { describe, expect, it } from 'vitest';
import { codingProfile } from '../profiles/codingProfile';
import type { DomainProfile, OntologyCorrectionEvidence } from '../types';
import { validateOntologyCorrection } from '../corrections';

function validCorrection(overrides: Partial<OntologyCorrectionEvidence> = {}): OntologyCorrectionEvidence {
  return {
    id: 'ev_1',
    profileId: 'coding',
    subjectKind: 'item',
    subjectId: 'concept_abc',
    field: 'typeNodeId',
    previousTypeNodeId: 'mechanism',
    correctedTypeNodeId: 'pattern',
    reason: 'Reclassified after review',
    source: 'user',
    createdAt: 1_700_000_000_000,
    ...overrides,
  };
}

describe('validateOntologyCorrection', () => {
  it('passes valid item type correction for the coding profile', () => {
    const ev = validCorrection();
    expect(validateOntologyCorrection(ev, codingProfile)).toEqual([]);
  });

  it('passes valid capture type correction for the coding profile', () => {
    const ev = validCorrection({ subjectKind: 'capture', subjectId: 'cap_xyz' });
    expect(validateOntologyCorrection(ev, codingProfile)).toEqual([]);
  });

  it('passes when previousTypeNodeId is null', () => {
    const ev = validCorrection({ previousTypeNodeId: null });
    expect(validateOntologyCorrection(ev, codingProfile)).toEqual([]);
  });

  it('passes when reason is omitted', () => {
    const { reason: _reason, ...ev } = validCorrection();
    expect(validateOntologyCorrection(ev, codingProfile)).toEqual([]);
  });

  it('rejects unknown corrected type node id', () => {
    const ev = validCorrection({ correctedTypeNodeId: 'unknown_type' });
    const errors = validateOntologyCorrection(ev, codingProfile);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("corrected type node id 'unknown_type'");
  });

  it('rejects unknown previous type node id when non-null', () => {
    const ev = validCorrection({ previousTypeNodeId: 'bogus' });
    const errors = validateOntologyCorrection(ev, codingProfile);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("previous type node id 'bogus'");
  });

  it('rejects mismatched profile id', () => {
    const ev = validCorrection({ profileId: 'other_profile' });
    const errors = validateOntologyCorrection(ev, codingProfile);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('profile id mismatch');
  });

  it('rejects no-op correction where previous and corrected are equal', () => {
    const ev = validCorrection({ correctedTypeNodeId: 'pattern', previousTypeNodeId: 'pattern' });
    const errors = validateOntologyCorrection(ev, codingProfile);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('no-op');
  });

  it('rejects empty evidence id', () => {
    const ev = validCorrection({ id: '' });
    const errors = validateOntologyCorrection(ev, codingProfile);
    expect(errors.some((e) => e.includes('evidence id'))).toBe(true);
  });

  it('rejects empty subject id', () => {
    const ev = validCorrection({ subjectId: '' });
    const errors = validateOntologyCorrection(ev, codingProfile);
    expect(errors.some((e) => e.includes('subject id'))).toBe(true);
  });

  it('does not mutate the input correction evidence object', () => {
    const ev = validCorrection();
    const frozen = JSON.parse(JSON.stringify(ev)) as Readonly<OntologyCorrectionEvidence>;
    validateOntologyCorrection(ev, codingProfile);
    expect(ev).toEqual(frozen);
  });

  it('does not mutate the profile', () => {
    const profile = codingProfile as DomainProfile;
    const frozenProfile = JSON.parse(JSON.stringify(profile)) as DomainProfile;
    const ev = validCorrection();
    validateOntologyCorrection(ev, profile);
    expect(profile).toEqual(frozenProfile);
  });

  it('reports multiple errors simultaneously', () => {
    const ev = validCorrection({
      id: '',
      subjectId: '',
      profileId: 'wrong',
      correctedTypeNodeId: 'nonexistent',
      previousTypeNodeId: 'nonexistent',
    });
    const errors = validateOntologyCorrection(ev, codingProfile);
    expect(errors.length).toBeGreaterThanOrEqual(4);
  });
});
