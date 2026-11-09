import { z } from 'zod';

const localPath = z.string().min(1).refine(
  (value) => !value.includes('\\') && !value.includes(':') && !value.startsWith('/') &&
    value.split('/').every((part) => part !== '..' && part !== '.' && part !== ''),
  'Use a repository-relative forward-slash path without traversal.',
);
const owner = z.strictObject({
  path: localPath,
  symbol: z.string().regex(/^[A-Za-z_$][\w$]*$/),
  role: z.enum(['decision', 'orchestration', 'translation', 'infrastructure', 'presentation']),
});
const evidence = z.strictObject({
  path: localPath,
  kind: z.enum(['unit', 'integration', 'scenario', 'design']),
  covers: z.string().trim().min(1),
});
const common = {
  schemaVersion: z.literal(1),
  id: z.string().regex(/^[a-z][a-z0-9-]*$/),
  domain: z.string().regex(/^[a-z][a-z0-9-]*$/),
  summary: z.string().trim().min(1),
  inspectedOn: z.iso.date(),
  owners: z.array(owner),
  evidence: z.array(evidence),
  gaps: z.array(z.string().trim().min(1)),
  reason: z.string(),
  revisit: z.string(),
};

// State-specific shape is decided here, never independently in the generator.
export const LeafSchema = z.discriminatedUnion('state', [
  z.strictObject({ ...common, state: z.literal('implemented'), owners: z.array(owner).min(1),
    evidence: z.array(evidence).min(1), gaps: z.array(z.string()).length(0),
    reason: z.literal(''), revisit: z.literal('') }),
  z.strictObject({ ...common, state: z.literal('partial'), owners: z.array(owner).min(1),
    gaps: z.array(z.string().trim().min(1)).min(1), reason: z.string().trim().min(1),
    revisit: z.string().trim().min(1) }),
  z.strictObject({ ...common, state: z.literal('planned'), owners: z.array(owner).length(0),
    gaps: z.array(z.string().trim().min(1)).min(1), reason: z.string().trim().min(1),
    revisit: z.string().trim().min(1) }),
  z.strictObject({ ...common, state: z.literal('deferred'), owners: z.array(owner).length(0),
    gaps: z.array(z.string().trim().min(1)).min(1), reason: z.string().trim().min(1),
    revisit: z.string().trim().min(1) }),
]).superRefine((leaf, context) => {
  if (leaf.state === 'implemented' && !leaf.evidence.some((item) => item.kind !== 'design')) {
    context.addIssue({ code: 'custom', path: ['evidence'], message: 'Implemented requires a behavioral evidence reference.' });
  }
  if ((leaf.state === 'planned' || leaf.state === 'deferred') && leaf.evidence.some((item) => item.kind !== 'design')) {
    context.addIssue({ code: 'custom', path: ['evidence'], message: 'Unimplemented leaves may cite design material, not implementation proof.' });
  }
});

export type Leaf = z.output<typeof LeafSchema>;
