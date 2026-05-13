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
    expect(modal).toMatch(/saveConceptualizedCapture/);
    expect(modal).not.toMatch(/commitLearningSession|extractConcepts|findMergeCandidates/);
    expect(modal).not.toMatch(/Save All/);
  });

  describe('TypeNodeChip / ConceptTypeChip compatibility shim', () => {
    const primitivesDir = path.join(repoRoot, 'src', 'features', 'learning', 'ui', 'primitives');

    it('TypeNodeChip.tsx exists and exports TypeNodeChip', () => {
      const src = read('src/features/learning/ui/primitives/TypeNodeChip.tsx');
      expect(src).toMatch(/export function TypeNodeChip/);
    });

    it('TypeNodeChipProps uses typeNodeId not type', () => {
      const src = read('src/features/learning/ui/primitives/TypeNodeChip.tsx');
      expect(src).toMatch(/export interface TypeNodeChipProps/);
      // Match typeNodeId inside the props interface body (before the closing brace)
      expect(src).toMatch(/export interface TypeNodeChipProps\s*\{[\s\S]*?typeNodeId/);
      // The property name inside the interface body must not be bare `type:`
      const ifaceBody = src.match(/export interface TypeNodeChipProps\s*\{([^}]*)\}/);
      expect(ifaceBody).toBeTruthy();
      expect(ifaceBody![1]).not.toMatch(/\btype\s*:/);
    });

    it('TypeNodeChip renders with getOntologyNodeLabel using typeNodeId', () => {
      const src = read('src/features/learning/ui/primitives/TypeNodeChip.tsx');
      expect(src).toMatch(/getOntologyNodeLabel\(typeNodeId\)/);
    });

    it('ConceptTypeChip.tsx exists as a deprecated compatibility wrapper', () => {
      const src = read('src/features/learning/ui/primitives/ConceptTypeChip.tsx');
      expect(src).toMatch(/@deprecated/);
      expect(src).toMatch(/export function ConceptTypeChip/);
    });

    it('ConceptTypeChipProps still accepts old prop type', () => {
      const src = read('src/features/learning/ui/primitives/ConceptTypeChip.tsx');
      expect(src).toMatch(/export interface ConceptTypeChipProps/);
      // The old prop must be `type`, not `typeNodeId`
      expect(src).toMatch(/type:\s*ConceptType/);
    });

    it('ConceptTypeChip maps type into TypeNodeChip as typeNodeId', () => {
      const src = read('src/features/learning/ui/primitives/ConceptTypeChip.tsx');
      // Must render TypeNodeChip with typeNodeId={type}
      expect(src).toMatch(/typeNodeId=\{type\}/);
    });

    it('ConceptTypeChip.tsx is a real wrapper (not a bare re-export shim)', () => {
      const src = read('src/features/learning/ui/primitives/ConceptTypeChip.tsx');
      // Must import TypeNodeChip and define its own component function
      expect(src).toMatch(/import.*TypeNodeChip.*from/);
      expect(src).toMatch(/export function ConceptTypeChip/);
      // Must not be a single-line re-export like: export { TypeNodeChip as ConceptTypeChip };
      expect(src).toMatch(/typeNodeId=\{type\}/);
    });

    it('card components import TypeNodeChip not ConceptTypeChip', () => {
      const cards = ['ConceptCardCompact', 'ConceptCardFull', 'CaptureCardFull', 'CandidateCaptureCard'];
      for (const card of cards) {
        const cardSrc = read(`src/features/learning/ui/cards/${card}.tsx`);
        // Import must reference the TypeNodeChip module, not the deprecated ConceptTypeChip module
        expect(cardSrc).toContain("'../primitives/TypeNodeChip'");
        expect(cardSrc).not.toContain("'../primitives/ConceptTypeChip'");
      }
    });
  });
});
