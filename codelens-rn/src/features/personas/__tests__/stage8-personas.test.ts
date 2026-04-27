import { describe, expect, it, vi } from 'vitest';
import { PersonaDraftCodec, PersonaRowCodec } from '../codecs/persona';
import { BUILT_IN_PERSONAS, seedBuiltInPersonasSync } from '../data/seedBuiltInPersonas';
import { isPersonaId } from '../types/ids';
import { migration009 } from '../../../db/migrations/009-stage8-personas-chat-foundation';
import type { DB } from '@op-engineering/op-sqlite';

describe('Stage 8 persona foundation', () => {
  it('defines the four locked built-in personas with branded ids', () => {
    expect(BUILT_IN_PERSONAS.map((persona) => persona.name)).toEqual([
      'Deep Diver',
      'Teach Me',
      'Pattern Spotter',
      'Rubber Duck',
    ]);
    expect(BUILT_IN_PERSONAS.every((persona) => isPersonaId(persona.id))).toBe(true);
    expect(BUILT_IN_PERSONAS.every((persona) => persona.isBuiltIn)).toBe(true);
    expect(BUILT_IN_PERSONAS.map((persona) => persona.sortOrder)).toEqual([0, 1, 2, 3]);
  });

  it('rejects persona prompt layers over the locked length cap', () => {
    expect(() =>
      PersonaDraftCodec.parse({
        name: 'Too Much',
        description: 'Prompt is too long.',
        systemPromptLayer: 'x'.repeat(3001),
      }),
    ).toThrow();
  });

  it('allows an empty persona prompt layer so the editor can warn without blocking save', () => {
    const parsed = PersonaDraftCodec.parse({
      name: 'Quiet',
      description: 'No extra behavior.',
      systemPromptLayer: '   ',
    });

    expect(parsed.systemPromptLayer).toBe('');
  });

  it('round-trips a valid persona row through the codec', () => {
    const parsed = PersonaRowCodec.parse(BUILT_IN_PERSONAS[0]);

    expect(parsed.name).toBe('Deep Diver');
    expect(parsed.systemPromptLayer.length).toBeLessThanOrEqual(3000);
  });

  it('seeds built-ins by canonical name and marks them immutable', () => {
    const executeSync = vi.fn();
    seedBuiltInPersonasSync({ executeSync } as unknown as DB);

    expect(executeSync).toHaveBeenCalledTimes(4);
    const firstSql = executeSync.mock.calls[0]?.[0] as string;
    expect(firstSql).toContain('ON CONFLICT(name) DO NOTHING');
  });

  it('adds the Stage 8 persona and per-chat selection columns in migration 009', () => {
    expect(migration009.version).toBe(9);
    expect(migration009.up.join('\n')).toContain('CREATE TABLE IF NOT EXISTS personas');
    expect(migration009.up.join('\n')).toContain('ALTER TABLE chats ADD COLUMN persona_id');
    expect(migration009.up.join('\n')).toContain('ALTER TABLE chats ADD COLUMN model_override_id');
  });
});
