import { describe, expect, it } from 'vitest';
import { getActiveDomainProfile } from '../index';
import { codingProfile } from '../profiles/codingProfile';
import type { ProfileOverlay } from '../types';

describe('getActiveDomainProfile compatibility via resolver', () => {
  it('returns codingProfile by reference for no-arg call', () => {
    expect(getActiveDomainProfile()).toBe(codingProfile);
  });

  it('returns codingProfile by reference for empty-array call', () => {
    expect(getActiveDomainProfile([])).toBe(codingProfile);
  });

  it('composes explicit overlays through the resolver', () => {
    const overlay: ProfileOverlay<string> = {
      id: 'compat-overlay',
      kind: 'project',
      overrideLabels: { hubTitle: 'Compat Hub' },
    };
    const composed = getActiveDomainProfile([overlay]);
    expect(composed).not.toBe(codingProfile);
    expect(composed.labels.hubTitle).toBe('Compat Hub');
  });
});
