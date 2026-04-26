import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(__dirname, '..', '..', '..', '..', '..');

function read(relativePath: string): string {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

describe('Stage 4 Learning Hub guards', () => {
  it('defines the required hub surfaces and hooks', () => {
    const expected = [
      'src/features/learning/ui/LearningHubScreen.tsx',
      'src/features/learning/ui/RecentCapturesSection.tsx',
      'src/features/learning/ui/ConceptListSection.tsx',
      'src/features/learning/ui/SessionCardsSection.tsx',
      'src/features/learning/ui/SessionFlashbackScreen.tsx',
      'src/features/learning/ui/KnowledgeHealthEntry.tsx',
      'src/features/learning/ui/KnowledgeHealthScreen.tsx',
      'src/features/learning/hooks/useRecentCaptures.ts',
      'src/features/learning/hooks/useConceptList.ts',
      'src/features/learning/hooks/useRecentSessions.ts',
      'src/features/learning/hooks/useSessionFlashback.ts',
      'src/features/learning/hooks/useKnowledgeHealthConcepts.ts',
    ];

    expect(expected.filter((file) => !fs.existsSync(path.join(repoRoot, file)))).toEqual([]);
  });

  it('keeps the route thin and data access behind hooks', () => {
    const route = read('app/learning/index.tsx');
    const hub = read('src/features/learning/ui/LearningHubScreen.tsx');

    expect(route).toMatch(/LearningHubScreen/);
    expect(route).not.toMatch(/\bdb\b|select\(|from\(/);
    expect(hub).toMatch(/useRecentCaptures/);
    expect(hub).toMatch(/useConceptList/);
    expect(hub).toMatch(/useRecentSessions/);
    expect(hub).toMatch(/useSessionFlashback/);
    expect(hub).toMatch(/useKnowledgeHealthConcepts/);
    expect(hub).toMatch(/useConceptCaptures/);
  });

  it('uses compact cards in hub lists and full cards only in detail modal', () => {
    expect(read('src/features/learning/ui/RecentCapturesSection.tsx')).toMatch(/CaptureCardCompact/);
    expect(read('src/features/learning/ui/ConceptListSection.tsx')).toMatch(/ConceptCardCompact/);
    expect(read('src/features/learning/ui/RecentCapturesSection.tsx')).not.toMatch(/rawSnippet/);
    expect(read('src/features/learning/ui/ConceptListSection.tsx')).not.toMatch(/linkedCaptures/);
    expect(read('src/features/learning/ui/LearningHubScreen.tsx')).toMatch(/CaptureCardFull/);
    expect(read('src/features/learning/ui/LearningHubScreen.tsx')).toMatch(/ConceptCardFull/);
  });

  it('keeps flashback read-only and health language out of review mechanics', () => {
    const flashback = read('src/features/learning/ui/SessionFlashbackScreen.tsx');
    const health = read('src/features/learning/ui/KnowledgeHealthScreen.tsx');
    const entry = read('src/features/learning/ui/KnowledgeHealthEntry.tsx');

    expect(flashback).not.toMatch(/TextInput|onSubmitEditing|sendMessage|updateConcept|familiarityScore\s*=/);
    expect(`${health}\n${entry}`).not.toMatch(/quiz|streak|due/i);
  });
});
