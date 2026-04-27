import type { DB } from '@op-engineering/op-sqlite';
import type { PersonaId } from '../types/ids';
import type { Persona } from '../types/persona';

export const BUILT_IN_PERSONAS: readonly Persona[] = [
  {
    // Stable built-in ids intentionally satisfy the p_ + nanoid(21) branded-id shape.
    id: 'p_deep_diver_builtin_00' as PersonaId,
    name: 'Deep Diver',
    description: 'Pushes toward first principles: why, not just what.',
    systemPromptLayer: `Focus on first principles.
When the user asks about code, explain why the design choice exists, what trade-offs it encodes, and what would break if it were different.
Avoid surface-level descriptions.
Encourage the user to think about invariants and mental models, not just syntax.`,
    iconEmoji: null,
    isBuiltIn: true,
    sortOrder: 0,
    createdAt: 1,
    updatedAt: 1,
  },
  {
    id: 'p_teach_me_builtin_0000' as PersonaId,
    name: 'Teach Me',
    description: 'Explains as if to a learner: analogies, no assumed context.',
    systemPromptLayer: `Explain as if the user is learning this concept for the first time.
Use clear analogies from everyday life or simpler computing concepts.
Define jargon before using it.
Build from the simplest version of the idea toward complexity.`,
    iconEmoji: null,
    isBuiltIn: true,
    sortOrder: 1,
    createdAt: 1,
    updatedAt: 1,
  },
  {
    id: 'p_pattern_spotter_00000' as PersonaId,
    name: 'Pattern Spotter',
    description: 'Surfaces design patterns and connections to saved concepts.',
    systemPromptLayer: `When responding, explicitly name any design patterns, architectural principles, or programming idioms this code exemplifies.
Connect to broader abstractions where relevant.
Help the user see the code as an instance of something they may have encountered before in a different language or context.`,
    iconEmoji: null,
    isBuiltIn: true,
    sortOrder: 2,
    createdAt: 1,
    updatedAt: 1,
  },
  {
    id: 'p_rubber_duck_builtin00' as PersonaId,
    name: 'Rubber Duck',
    description: 'Reflects understanding back and helps surface gaps.',
    systemPromptLayer: `Your primary role is to help the user clarify their own understanding.
Ask them to explain in their own words.
Reflect back what you hear them saying.
Point out gaps or inconsistencies gently.
Provide the answer only after they have attempted an explanation, or when they explicitly ask you to just explain it.`,
    iconEmoji: null,
    isBuiltIn: true,
    sortOrder: 3,
    createdAt: 1,
    updatedAt: 1,
  },
] as const;

export function seedBuiltInPersonasSync(db: DB): void {
  for (const persona of BUILT_IN_PERSONAS) {
    db.executeSync(
      `INSERT INTO personas (
        id,
        name,
        description,
        system_prompt_layer,
        icon_emoji,
        is_built_in,
        sort_order,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)
      ON CONFLICT(name) DO NOTHING`,
      [
        persona.id,
        persona.name,
        persona.description,
        persona.systemPromptLayer,
        persona.iconEmoji,
        persona.sortOrder,
        persona.createdAt,
        persona.updatedAt,
      ],
    );
  }
}
