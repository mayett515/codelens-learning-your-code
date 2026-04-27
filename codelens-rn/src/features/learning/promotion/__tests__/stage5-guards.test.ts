import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(__dirname, '..', '..', '..', '..', '..');

function read(relativePath: string): string {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

describe('Stage 5 promotion guards', () => {
  it('keeps promotion code under the promotion module', () => {
    const required = [
      'src/features/learning/promotion/data/schema.ts',
      'src/features/learning/promotion/data/suggestionsCacheRepo.ts',
      'src/features/learning/promotion/data/dismissalsRepo.ts',
      'src/features/learning/promotion/clustering/computeClusters.ts',
      'src/features/learning/promotion/services/promoteToConcept.ts',
      'src/features/learning/promotion/services/linkCapturesToExistingConcept.ts',
      'src/features/learning/promotion/ui/PromotionSuggestionsSection.tsx',
      'src/features/learning/promotion/ui/PromotionReviewScreen.tsx',
    ];

    expect(required.filter((file) => !fs.existsSync(path.join(repoRoot, file)))).toEqual([]);
  });

  it('renders promotion suggestions between recent captures and concepts', () => {
    const hub = read('src/features/learning/ui/LearningHubScreen.tsx');
    expect(hub).toMatch(/<RecentCapturesSection[\s\S]*<PromotionSuggestionsSection[\s\S]*<ConceptListSection/);
  });

  it('does not route single-capture promotion through the Hub suggestion cache', () => {
    const modal = read('src/features/learning/ui/SaveAsLearningModal.tsx');
    expect(modal).not.toMatch(/upsertSuggestion/);
    expect(modal).toMatch(/singleCaptureId/);
    expect(modal).toMatch(/saveAsProposedNew/);
  });

  it('stores max capture created_at for suggestion ordering', () => {
    const migration = read('src/db/migrations/006-promotion-system.ts');
    const repo = read('src/features/learning/promotion/data/suggestionsCacheRepo.ts');

    expect(migration).toMatch(/max_capture_created_at/);
    expect(repo).toMatch(/maxCaptureCreatedAt/);
    expect(repo).toMatch(/clusterFingerprint/);
  });

  it('keeps review warning source-aware and based on included captures', () => {
    const review = read('src/features/learning/promotion/ui/PromotionReviewScreen.tsx');
    expect(review).toMatch(/reviewModel\.source === 'cluster' && includedIds\.size < 2/);
    expect(review).toMatch(/source: reviewModel\.source/);
  });

  it('does not use pressure mechanics or forbidden card props in promotion UI', () => {
    const promotionUiDir = path.join(repoRoot, 'src', 'features', 'learning', 'promotion', 'ui');
    const text = fs.readdirSync(promotionUiDir)
      .filter((file) => file.endsWith('.tsx'))
      .map((file) => fs.readFileSync(path.join(promotionUiDir, file), 'utf8'))
      .join('\n');

    expect(text).not.toMatch(/\b(quiz|streak|due|act now|ready)\b/i);
    expect(text).not.toMatch(/\b(variant|density|mode|isCompact|isFull)\??\s*:/);
    expect(text).not.toMatch(/CaptureCardFull/);
  });
});
