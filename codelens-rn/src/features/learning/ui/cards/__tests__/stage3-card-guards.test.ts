import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(__dirname, '..', '..', '..', '..', '..', '..');
const cardsDir = path.join(repoRoot, 'src', 'features', 'learning', 'ui', 'cards');

function read(relativePath: string): string {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

describe('Stage 3 card component guards', () => {
  it('defines the six distinct card components', () => {
    const expected = [
      'CandidateCaptureCard.tsx',
      'CaptureCardCompact.tsx',
      'CaptureCardFull.tsx',
      'ConceptCardCompact.tsx',
      'ConceptCardFull.tsx',
      'CaptureChip.tsx',
    ];

    expect(expected.filter((file) => !fs.existsSync(path.join(cardsDir, file)))).toEqual([]);
  });

  it('does not add forbidden card shape props or base cards', () => {
    const forbidden = /\b(variant|density|mode|isCompact|isFull)\??\s*:|CardBase|LearningCard/;
    const offenders = fs
      .readdirSync(cardsDir)
      .filter((file) => file.endsWith('.tsx'))
      .filter((file) => forbidden.test(fs.readFileSync(path.join(cardsDir, file), 'utf8')));

    expect(offenders).toEqual([]);
  });

  it('keeps compact card components free of raw snippet rendering', () => {
    expect(read('src/features/learning/ui/cards/CaptureCardCompact.tsx')).not.toMatch(/rawSnippet/);
    expect(read('src/features/learning/ui/cards/ConceptCardCompact.tsx')).not.toMatch(/rawSnippet|linkedCaptures/);
  });

  it('uses candidate cards and Stage 2 services in the save modal', () => {
    const modal = read('src/features/learning/ui/SaveAsLearningModal.tsx');

    expect(modal).toMatch(/CandidateCaptureCard/);
    expect(modal).toMatch(/prepareSaveCandidates/);
    expect(modal).toMatch(/saveCapture/);
    expect(modal).not.toMatch(/commitLearningSession|extractConcepts|findMergeCandidates/);
    expect(modal).not.toMatch(/Save All/);
  });
});
