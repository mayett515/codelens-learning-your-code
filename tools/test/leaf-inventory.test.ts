import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { test, type TestContext } from 'node:test';
import { stringify } from 'yaml';
import { inspectLeaves, renderMap } from '../leaf-inventory.ts';
import { inspectRepository } from '../check-repository.ts';
import { LeafSchema } from '../leaf-schema.ts';
import { checkSkillMirrors } from '../sync-skills.ts';
import { sourceFacts, repositoryFile } from '../source-facts.ts';
import { inspectLeafFreshness } from '../leaf-freshness.ts';
import { inlineLinkTargets } from '../markdown-links.ts';

function fixture(t: TestContext) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kordex-leaf-test-'));
  t.after(() => {
    const resolved = path.resolve(root);
    assert.equal(path.dirname(resolved), path.resolve(os.tmpdir()));
    assert.ok(path.basename(resolved).startsWith('kordex-leaf-test-'));
    fs.rmSync(resolved, { recursive: true, force: true });
  });
  const write = (file: string, text: string) => {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), text);
  };
  write('docs/capabilities/domains/meaning.md', '# Meaning\n');
  write('codelens-rn/src/policy.ts', 'export function decide() { return true; }\n');
  write('codelens-rn/src/policy.test.ts', '// Fixture evidence is only checked for existence.\n');
  const leaf = { schemaVersion: 1, id: 'policy', domain: 'meaning', summary: 'Decide a policy', inspectedOn: '2000-01-02',
    state: 'implemented', owners: [{ path: 'codelens-rn/src/policy.ts', symbol: 'decide', role: 'decision' }],
    evidence: [{ path: 'codelens-rn/src/policy.test.ts', kind: 'unit', covers: 'Policy result' }],
    gaps: [], reason: '', revisit: '' };
  const save = (value: unknown = leaf, file = 'codelens-rn/src/policy.leaf.md') => write(file, `---\n${stringify(value)}---\n`);
  save();
  let commitDate = '2000-01-01T12:00:00Z';
  const git = (...args: string[]) => execFileSync('git', [
    '-c', `safe.directory=${root.replaceAll('\\', '/')}`, '-c', 'user.name=Fixture',
    '-c', 'user.email=fixture@example.invalid', '-c', 'commit.gpgsign=false',
    '-c', `core.hooksPath=${path.join(root, 'no-hooks')}`, '-C', root, ...args,
  ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env,
    GIT_AUTHOR_DATE: commitDate, GIT_COMMITTER_DATE: commitDate,
  } }).trim();
  const initGit = () => { git('init', '-q'); git('add', '.'); git('commit', '-qm', 'Fixture baseline'); };
  return { root, write, leaf, save, git, initGit, setCommitDate: (date: string) => { commitDate = date; } };
}

test('valid leaf binds a real exported owner without claiming evidence execution', (t) => {
  const f = fixture(t);
  const result = inspectLeaves(f.root);
  assert.deepEqual(result.findings, []);
  assert.equal(result.entries.length, 1);
  assert.match(renderMap(result.entries), /Tests are not executed/);
});

test('rejects impossible states, unknown fields, path traversal and whitespace-only gaps', (t) => {
  const f = fixture(t);
  for (const bad of [
    { ...f.leaf, gaps: ['missing capability'] },
    { ...f.leaf, state: 'partial', gaps: [] },
    { ...f.leaf, state: 'partial', gaps: [' '], reason: 'gap', revisit: 'fix' },
    { ...f.leaf, fabricatedCoverage: 'all' },
    { ...f.leaf, inspectedOn: '2025-02-29' },
    { ...f.leaf, inspectedOn: undefined },
    { ...f.leaf, owners: [{ ...f.leaf.owners[0], path: '../outside.ts' }] },
    { ...f.leaf, owners: [{ ...f.leaf.owners[0], path: 'C:/outside.ts' }] },
    { ...f.leaf, evidence: [{ ...f.leaf.evidence[0], kind: 'design' }] },
  ]) assert.equal(LeafSchema.safeParse(bad).success, false);
});

test('rejects duplicate YAML keys', (t) => {
  const f = fixture(t);
  f.write('codelens-rn/src/policy.leaf.md', `---\n${stringify(f.leaf)}state: partial\n---\n`);
  assert.ok(inspectLeaves(f.root).findings.some((item) => item.code === 'LEAF_SHAPE_INVALID'));
});

test('detects missing exports, not just a word appearing in comments', (t) => {
  const f = fixture(t);
  f.write('codelens-rn/src/policy.ts', '// export function decide() {}\nexport function other() {}\n');
  assert.ok(inspectLeaves(f.root).findings.some((item) => item.code === 'OWNER_EXPORT_MISSING'));
});

test('collects independent missing parent, owner and evidence findings', (t) => {
  const f = fixture(t);
  f.save({ ...f.leaf, domain: 'unknown', owners: [{ ...f.leaf.owners[0], path: 'missing.ts' }],
    evidence: [{ ...f.leaf.evidence[0], path: 'missing.test.ts' }] });
  const codes = inspectLeaves(f.root).findings.map((item) => item.code);
  for (const code of ['DOMAIN_MISSING', 'OWNER_FILE_MISSING', 'EVIDENCE_FILE_MISSING', 'LEAF_NOT_COLOCATED']) assert.ok(codes.includes(code));
});

test('a directory cannot satisfy a behavioral evidence file reference', (t) => {
  const f = fixture(t);
  f.save({ ...f.leaf, evidence: [{ ...f.leaf.evidence[0], path: 'docs' }] });
  assert.ok(inspectLeaves(f.root).findings.some((item) => item.code === 'EVIDENCE_FILE_MISSING'));
});

test('duplicate capability and owner bindings fail independently', (t) => {
  const f = fixture(t);
  f.save(f.leaf, 'codelens-rn/src/duplicate.leaf.md');
  const codes = inspectLeaves(f.root).findings.map((item) => item.code);
  assert.ok(codes.includes('LEAF_ID_DUPLICATE'));
  assert.ok(codes.includes('OWNER_DUPLICATE'));
});

test('relative barrel re-export cannot hide a decision dependency on persistence', (t) => {
  const f = fixture(t);
  f.write('codelens-rn/src/policy.ts', 'import { query } from "./barrel"; export function decide() { return query(); }');
  f.write('codelens-rn/src/barrel.ts', 'export { query } from "./db/repo";');
  f.write('codelens-rn/src/db/repo.ts', 'export function query() { return 1; }');
  assert.ok(inspectLeaves(f.root).findings.some((item) => item.code === 'DECISION_IMPORT_VIOLATION' && item.message.includes('db/repo')));
});

test('type-only dependencies do not become runtime dependency violations', (t) => {
  const f = fixture(t);
  f.write('codelens-rn/src/policy.ts', 'import type { Row } from "./db/types"; import { type Other } from "provider"; export type { Third } from "./db/types"; export function decide(x: Row) { return x; }');
  assert.deepEqual(inspectLeaves(f.root).findings, []);
});

test('cycles terminate; external and dynamic imports fail for opted-in decisions', (t) => {
  const f = fixture(t);
  f.write('codelens-rn/src/policy.ts', 'import "./helper"; import "react"; export function decide() { return import("./plugin"); }');
  f.write('codelens-rn/src/helper.ts', 'import "./policy";');
  const findings = inspectLeaves(f.root).findings;
  assert.ok(findings.some((item) => item.message.includes('react')));
  assert.ok(findings.some((item) => item.message.includes('dynamic')));
});

test('planned leaves cannot claim current runtime owners or unit proof', (t) => {
  const f = fixture(t);
  const planned = { ...f.leaf, state: 'planned', owners: [], evidence: [], gaps: ['Not built'], reason: 'Future direction', revisit: 'Choose a scenario' };
  assert.equal(LeafSchema.safeParse(planned).success, true);
  assert.equal(LeafSchema.safeParse({ ...planned, owners: f.leaf.owners }).success, false);
  assert.equal(LeafSchema.safeParse({ ...planned, evidence: f.leaf.evidence }).success, false);
});

test('stale generated map is detected and generation repairs it', (t) => {
  const f = fixture(t);
  f.initGit();
  assert.ok(inspectRepository(f.root).some((item) => item.code === 'MAP_STALE'));
  inspectRepository(f.root, true);
  assert.ok(!inspectRepository(f.root).some((item) => item.code === 'MAP_STALE'));
  f.save({ ...f.leaf, summary: 'A renamed responsibility' });
  assert.ok(inspectRepository(f.root).some((item) => item.code === 'MAP_STALE'));
  inspectRepository(f.root, true);
  // Unrelated helpers do not force regeneration of capability claims.
  f.write('codelens-rn/src/new.ts', 'export function newOwner() {}');
  assert.ok(!inspectRepository(f.root).some((item) => item.code === 'MAP_STALE'));
  assert.ok(inspectLeaves(f.root).sourceFilesWithoutOwner.includes('codelens-rn/src/new.ts'));
  fs.unlinkSync(path.join(f.root, 'codelens-rn/src/new.ts'));
  assert.ok(!inspectRepository(f.root).some((item) => item.code === 'MAP_STALE'));
  f.save({ ...f.leaf, inspectedOn: '2000-01-03' });
  assert.ok(inspectRepository(f.root).some((item) => item.code === 'MAP_STALE'));
});

test('skill mirror drift fails, sync repairs it, unrelated host skills survive', (t) => {
  const f = fixture(t);
  f.write('agent-kit/skills/review/SKILL.md', '---\nname: review\ndescription: Review a concrete change.\n---\nReview.\n');
  f.write('.claude/skills/unrelated/SKILL.md', 'User content');
  assert.ok(checkSkillMirrors(f.root).some((item) => item.code === 'SKILL_MIRROR_DRIFT'));
  assert.deepEqual(checkSkillMirrors(f.root, true), []);
  assert.deepEqual(checkSkillMirrors(f.root), []);
  f.write('.agents/skills/review/SKILL.md', 'Drift');
  assert.ok(checkSkillMirrors(f.root).some((item) => item.code === 'SKILL_MIRROR_DRIFT'));
  assert.equal(fs.readFileSync(path.join(f.root, '.claude/skills/unrelated/SKILL.md'), 'utf8'), 'User content');
});

test('AST distinguishes explicit exports from unexported declarations', (t) => {
  const f = fixture(t);
  f.write('codelens-rn/src/policy.ts', 'function privateOwner() {} export const visible = () => true; export { privateOwner as facade };');
  const facts = sourceFacts(path.join(f.root, 'codelens-rn/src/policy.ts'));
  assert.ok(facts.valueExports.has('visible'));
  assert.ok(facts.valueExports.has('facade'));
  assert.ok(!facts.valueExports.has('privateOwner'));
});

test('invalid skill metadata is rejected before writing a mirror', (t) => {
  const f = fixture(t);
  f.write('agent-kit/skills/review/SKILL.md', '---\nname: wrong-name\ndescription: Review.\n---\n');
  assert.ok(checkSkillMirrors(f.root, true).some((item) => item.code === 'SKILL_SHAPE_INVALID'));
  assert.equal(fs.existsSync(path.join(f.root, '.agents/skills/review/SKILL.md')), false);
});

test('schema example, broken doc links and host entrypoints have independent guards', (t) => {
  const f = fixture(t);
  f.write('docs/capabilities/SCHEMA.md', `# Schema\n\n\`\`\`yaml\n${stringify(f.leaf)}\`\`\`\n`);
  assert.ok(!inspectRepository(f.root).some((item) => item.code === 'SCHEMA_EXAMPLE_DRIFT'));
  f.write('docs/capabilities/SCHEMA.md', '```yaml\nstate: invented\n```\n');
  f.write('AGENTS.md', '[Missing](docs/missing.md)\n');
  f.write('CLAUDE.md', 'Separate instructions, no shared import.\n');
  const codes = inspectRepository(f.root).map((item) => item.code);
  for (const code of ['SCHEMA_EXAMPLE_DRIFT', 'DOC_LINK_MISSING', 'HOST_ENTRYPOINT_DRIFT']) assert.ok(codes.includes(code));
});

test('types, type aliases, ambient declarations and re-exports cannot own a capability', (t) => {
  const f = fixture(t);
  for (const declaration of [
    'export type decide = string;', 'export interface decide {}',
    'interface Thing {} export { Thing as decide };',
    'export type { Thing as decide } from "./other";',
    'export { type Thing as decide } from "./other";',
    'export declare function decide(): void;',
    'export declare const decide: () => void;',
    'export { decide } from "./other";',
    'export default function decide() {}',
  ]) {
    f.write('codelens-rn/src/policy.ts', declaration);
    assert.ok(inspectLeaves(f.root).findings.some((item) => item.code === 'OWNER_EXPORT_MISSING'), declaration);
  }
  f.write('codelens-rn/src/policy.ts', 'function actual() { return true; } export { actual as decide };');
  assert.deepEqual(inspectLeaves(f.root).findings, []);
});

test('path casing is exact for evidence, parents and secondary owners on every host', (t) => {
  const f = fixture(t);
  assert.equal(repositoryFile(f.root, 'codelens-rn/src/POLICY.test.ts'), undefined);
  assert.equal(repositoryFile(f.root, 'codelens-rn/SRC/policy.ts'), undefined);
  f.write('codelens-rn/src/secondary.ts', 'export function second() {}');
  f.save({ ...f.leaf, evidence: [{ ...f.leaf.evidence[0], path: 'codelens-rn/src/POLICY.test.ts' }],
    owners: [...f.leaf.owners, { path: 'codelens-rn/src/SECONDARY.ts', symbol: 'second', role: 'orchestration' }] });
  const codes = inspectLeaves(f.root).findings.map((item) => item.code);
  assert.ok(codes.includes('OWNER_FILE_MISSING'));
  assert.ok(codes.includes('EVIDENCE_FILE_MISSING'));
});

test('Git freshness rejects older inspection days and accepts a same-day inspection', (t) => {
  const f = fixture(t);
  f.initGit();
  f.save({ ...f.leaf, inspectedOn: '1999-12-31' });
  assert.ok(inspectLeafFreshness(f.root, inspectLeaves(f.root).entries).some((item) => item.code === 'LEAF_INSPECTION_STALE'));
  // Generation cannot turn a stale inspection into a current claim.
  inspectRepository(f.root, true);
  assert.equal(fs.existsSync(path.join(f.root, 'docs/capabilities/generated-map.md')), false);
  f.save({ ...f.leaf, inspectedOn: '2000-01-01' });
  assert.deepEqual(inspectLeafFreshness(f.root, inspectLeaves(f.root).entries), []);
  f.save({ ...f.leaf, inspectedOn: '2000-01-03' });
  assert.ok(inspectLeafFreshness(f.root, inspectLeaves(f.root).entries, new Date('2000-01-02T23:59:00Z'))
    .some((item) => item.code === 'INSPECTION_IN_FUTURE'));
});

test('Git freshness checks every owner and explicitly warns about uncommitted content', (t) => {
  const f = fixture(t);
  f.initGit();
  f.write('codelens-rn/src/policy.ts', 'export function decide() { return false; }');
  const check = () => inspectLeafFreshness(f.root, inspectLeaves(f.root).entries);
  assert.ok(check().some((item) => item.code === 'OWNER_WORKTREE_UNVERIFIED' && item.severity === 'warning'));
  f.git('add', 'codelens-rn/src/policy.ts');
  assert.ok(check().some((item) => item.code === 'OWNER_WORKTREE_UNVERIFIED'));
  f.write('codelens-rn/src/secondary.ts', 'export function second() {}');
  f.save({ ...f.leaf, inspectedOn: '1999-12-31', owners: [...f.leaf.owners,
    { path: 'codelens-rn/src/secondary.ts', symbol: 'second', role: 'orchestration' }] });
  assert.ok(check().some((item) => item.message.includes('secondary.ts') && item.code === 'OWNER_WORKTREE_UNVERIFIED'));
  f.git('add', 'codelens-rn/src/secondary.ts');
  f.git('commit', '-qm', 'Secondary owner');
  assert.ok(check().some((item) => item.message.includes('secondary.ts') && item.code === 'LEAF_INSPECTION_STALE'));
});

test('a later owner commit expires inspection using UTC rather than its local date', (t) => {
  const f = fixture(t);
  f.initGit();
  f.save({ ...f.leaf, inspectedOn: '2000-01-02' });
  f.write('codelens-rn/src/policy.ts', 'export function decide() { return false; }');
  f.setCommitDate('2000-01-03T00:30:00+02:00'); // Still January 2 in UTC.
  f.git('add', 'codelens-rn/src/policy.ts');
  f.git('commit', '-qm', 'Same UTC day');
  assert.deepEqual(inspectLeafFreshness(f.root, inspectLeaves(f.root).entries), []);
  f.write('codelens-rn/src/policy.ts', 'export function decide() { return 2; }');
  f.setCommitDate('2000-01-03T12:00:00Z');
  f.git('add', 'codelens-rn/src/policy.ts');
  f.git('commit', '-qm', 'Later UTC day');
  assert.ok(inspectLeafFreshness(f.root, inspectLeaves(f.root).entries).some((item) => item.code === 'LEAF_INSPECTION_STALE'));
  f.save({ ...f.leaf, inspectedOn: '2000-01-03' });
  assert.deepEqual(inspectLeafFreshness(f.root, inspectLeaves(f.root).entries), []);
});

test('missing or shallow Git history fails explicitly; unbound plans need no Git', (t) => {
  const f = fixture(t);
  assert.ok(inspectLeafFreshness(f.root, inspectLeaves(f.root).entries).some((item) => item.code === 'GIT_FRESHNESS_UNAVAILABLE'));
  f.initGit();
  f.write('.git/shallow', `${f.git('rev-parse', 'HEAD')}\n`);
  assert.ok(inspectLeafFreshness(f.root, inspectLeaves(f.root).entries).some((item) => item.code === 'GIT_FRESHNESS_UNAVAILABLE'));
  const planned = LeafSchema.parse({ ...f.leaf, state: 'planned', owners: [], evidence: [],
    gaps: ['Not built'], reason: 'Future direction', revisit: 'Select scenario' });
  assert.deepEqual(inspectLeafFreshness(f.root, [{ file: 'plan.leaf.md', leaf: planned }]), []);
});

test('inline Markdown titles are not paths and code examples are not links', (t) => {
  assert.deepEqual(inlineLinkTargets('[a](x.md "Title") [b](<with space.md> \'Title\') `ignore [x](missing.md)`\n```md\n[x](missing.md)\n```\n[c](y.md)'), ['x.md', 'with space.md', 'y.md']);
  const f = fixture(t);
  f.write('AGENTS.md', '[Policy](codelens-rn/src/policy.ts "Title")\n`[example](missing.md)`\n[Broken](missing.md "Title")\n');
  assert.deepEqual(inspectRepository(f.root).filter((item) => item.code === 'DOC_LINK_MISSING').map((item) => item.message), ['missing.md']);
});

test('merging an unchanged owner from another branch preserves its inspection date', (t) => {
  const f = fixture(t);
  f.initGit();
  f.git('branch', '-M', 'base');
  f.git('switch', '-qc', 'feature');
  f.write('unrelated.txt', 'Feature work\n');
  f.setCommitDate('2000-01-02T12:00:00Z');
  f.git('add', '.');
  f.git('commit', '-qm', 'Unrelated feature');
  f.git('switch', '-q', 'base');
  f.write('codelens-rn/src/policy.ts', 'export function decide() { return false; }');
  f.save({ ...f.leaf, inspectedOn: '2000-01-03' });
  f.setCommitDate('2000-01-03T12:00:00Z');
  f.git('add', '.');
  f.git('commit', '-qm', 'Owner and inspection together');
  f.git('switch', '-q', 'feature');
  f.setCommitDate('2000-01-10T12:00:00Z');
  f.git('merge', '--no-ff', '--no-edit', 'base');
  assert.deepEqual(inspectLeafFreshness(f.root, inspectLeaves(f.root).entries), []);
});

test('merge conflict resolution changing the owner still requires inspection', (t) => {
  const f = fixture(t);
  f.initGit();
  f.git('branch', '-M', 'base');
  f.git('switch', '-qc', 'feature');
  f.write('codelens-rn/src/policy.ts', 'export function decide() { return 1; }');
  f.save({ ...f.leaf, inspectedOn: '2000-01-04' });
  f.setCommitDate('2000-01-04T12:00:00Z');
  f.git('add', '.');
  f.git('commit', '-qm', 'Feature decision');
  f.git('switch', '-q', 'base');
  f.write('codelens-rn/src/policy.ts', 'export function decide() { return 2; }');
  f.setCommitDate('2000-01-03T12:00:00Z');
  f.git('add', '.');
  f.git('commit', '-qm', 'Base decision');
  f.git('switch', '-q', 'feature');
  f.setCommitDate('2000-01-10T12:00:00Z');
  assert.throws(() => f.git('merge', '--no-ff', '--no-edit', 'base'));
  assert.equal(f.git('diff', '--name-only', '--diff-filter=U'), 'codelens-rn/src/policy.ts');
  f.write('codelens-rn/src/policy.ts', 'export function decide() { return 3; }');
  f.git('add', '.');
  f.git('commit', '-qm', 'Resolve with a new decision');
  const findings = inspectLeafFreshness(f.root, inspectLeaves(f.root).entries);
  assert.ok(findings.some((item) => item.code === 'LEAF_INSPECTION_STALE' && item.message.includes('2000-01-10')));
  f.save({ ...f.leaf, inspectedOn: '2000-01-10' });
  assert.deepEqual(inspectLeafFreshness(f.root, inspectLeaves(f.root).entries), []);
});

test('an unmatched backtick cannot swallow links across a paragraph boundary', (t) => {
  const text = 'Stray ` marker\n\n[real](missing.md)\n\nLater `code` here.\n';
  assert.deepEqual(inlineLinkTargets(text), ['missing.md']);
  assert.deepEqual(inlineLinkTargets('`valid multiline\n[example](ignored.md)`'), []);
  const f = fixture(t);
  f.write('AGENTS.md', text);
  assert.ok(inspectRepository(f.root).some((item) => item.code === 'DOC_LINK_MISSING' && item.message === 'missing.md'));
});

test('a variable initialized from an import passes declaration checks but not decision import checks', (t) => {
  const f = fixture(t);
  f.write('codelens-rn/src/data/external.ts', 'export function other() {}');
  f.write('codelens-rn/src/policy.ts', 'import { other } from "./data/external"; export const decide = other;');
  assert.ok(sourceFacts(path.join(f.root, 'codelens-rn/src/policy.ts')).valueExports.has('decide'));
  assert.ok(inspectLeaves(f.root).findings.some((item) => item.code === 'DECISION_IMPORT_VIOLATION'));
});
