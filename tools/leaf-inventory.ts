import fs from 'node:fs';
import path from 'node:path';
import { parseDocument } from 'yaml';
import { LeafSchema, type Leaf } from './leaf-schema.ts';
import { decisionDependencyProblems, repositoryFile, sourceFacts } from './source-facts.ts';

export type Finding = { code: string; file: string; message: string; severity?: 'warning' };
export type LeafEntry = { file: string; leaf: Leaf };
export const leafRoots = ['codelens-rn/src', 'docs/capabilities/planned'] as const;
export const mapPath = 'docs/capabilities/generated-map.md';

export function walkFiles(root: string, relative: string): string[] {
  const dir = path.join(root, relative);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isSymbolicLink() || ['node_modules', '.git', 'dist', '.expo'].includes(entry.name)) return [];
    const name = `${relative}/${entry.name}`;
    return entry.isDirectory() ? walkFiles(root, name) : [name];
  }).sort();
}

export function inspectLeaves(root: string): { entries: LeafEntry[]; findings: Finding[]; sourceFilesWithoutOwner: string[] } {
  const findings: Finding[] = [];
  const entries: LeafEntry[] = [];
  const files = leafRoots.flatMap((name) => walkFiles(root, name));
  const ids = new Set<string>();
  const owned = new Set<string>();
  const ownerSymbols = new Set<string>();
  for (const file of files.filter((name) => name.endsWith('.leaf.md'))) {
    const add = (code: string, message: string) => findings.push({ code, file, message });
    const text = fs.readFileSync(path.join(root, file), 'utf8').replaceAll('\r\n', '\n');
    const match = /^---\n([\s\S]*?)\n---(?:\n|$)/.exec(text);
    if (!match) { add('LEAF_SHAPE_INVALID', 'Missing YAML front matter.'); continue; }
    let raw: unknown;
    try {
      const document = parseDocument(match[1], { uniqueKeys: true });
      if (document.errors.length) throw new Error(document.errors.map((item) => item.message).join('; '));
      raw = document.toJS({ maxAliasCount: 0 });
    } catch (error) { add('LEAF_SHAPE_INVALID', String(error)); continue; }
    const parsed = LeafSchema.safeParse(raw);
    if (!parsed.success) { add('LEAF_SHAPE_INVALID', parsed.error.message); continue; }
    const leaf = parsed.data;
    if (ids.has(leaf.id)) add('LEAF_ID_DUPLICATE', leaf.id);
    ids.add(leaf.id);
    const domain = `docs/capabilities/domains/${leaf.domain}.md`;
    if (!repositoryFile(root, domain)) add('DOMAIN_MISSING', domain);
    const first = leaf.owners[0];
    if (first && file !== first.path.replace(/\.[^.]+$/, '.leaf.md')) {
      add('LEAF_NOT_COLOCATED', `Expected ${first.path.replace(/\.[^.]+$/, '.leaf.md')}`);
    }
    if (!first && !file.startsWith('docs/capabilities/planned/')) {
      add('PLANNED_LOCATION_INVALID', 'Unbound future capabilities belong under docs/capabilities/planned/.');
    }
    for (const owner of leaf.owners) {
      const key = `${owner.path}:${owner.symbol}`;
      if (ownerSymbols.has(key)) add('OWNER_DUPLICATE', key);
      ownerSymbols.add(key);
      const resolved = repositoryFile(root, owner.path);
      if (!resolved) { add('OWNER_FILE_MISSING', owner.path); continue; }
      if (!/\.(?:ts|tsx|mts|cts|js|mjs|cjs)$/.test(owner.path)) {
        add('OWNER_NOT_SOURCE', owner.path); continue;
      }
      owned.add(owner.path);
      if (!sourceFacts(resolved).valueExports.has(owner.symbol)) add('OWNER_EXPORT_MISSING', `${key}: cite a local runtime value declaration, not a type or export-from declaration.`);
      if (owner.role === 'decision') {
        for (const message of decisionDependencyProblems(root, resolved)) add('DECISION_IMPORT_VIOLATION', message);
      }
    }
    for (const evidence of leaf.evidence) {
      if (!repositoryFile(root, evidence.path)) add('EVIDENCE_FILE_MISSING', evidence.path);
    }
    entries.push({ file, leaf });
  }
  if (!entries.length) findings.push({ code: 'LEAF_INVENTORY_EMPTY', file: mapPath, message: 'No valid capability leaves found.' });
  const sourceFilesWithoutOwner = files.filter((file) => /\.(?:ts|tsx|mts|cts)$/.test(file) &&
    !/(^|\/)(?:__tests__|test)\//.test(file) && !/\.(?:test|spec)\./.test(file) && !owned.has(file));
  return { entries: entries.sort((a, b) => a.leaf.id.localeCompare(b.leaf.id, 'en')), findings, sourceFilesWithoutOwner };
}

const cell = (value: string) => value.replaceAll('|', '\\|').replaceAll('\n', ' ');
export function renderMap(entries: LeafEntry[]): string {
  const rows = entries.map(({ file, leaf }) => {
    const owners = leaf.owners.map((item) => `\`${item.path}:${item.symbol}\` (${item.role})`).join('<br>') || 'None declared';
    const evidence = leaf.evidence.map((item) => `[${item.kind}](../../${item.path})`).join(', ') || 'None';
    return `| [${leaf.id}](../../${file}) | ${cell(leaf.summary)} | ${leaf.domain} | ${leaf.state} | ${leaf.inspectedOn} | ${owners} | ${evidence} | ${cell(leaf.gaps.join('; ') || 'None declared')} |`;
  });
  return `# Capability map (generated)\n\nRegenerate with \`npm --prefix tools run generate\`. Do not edit by hand.\n\nStates, inspection dates and gaps are author claims. Owners resolve to local runtime value exports;\nevidence references resolve to files. Tests are not executed by this inventory.\nDecision owners receive a transitive static runtime-import check, not a purity proof.\nGit freshness is checked to UTC-day precision; see SCHEMA.md for limits.\nNo dispatch registry, universal Kordex runtime or dependency-completeness claim is implied.\n\n| Capability | Responsibility | Domain | Declared state | Inspected on (UTC) | Declared owners (source checked) | Referenced evidence (existence only) | Declared gaps |\n| --- | --- | --- | --- | --- | --- | --- | --- |\n${rows.join('\n')}\n\n## Coverage limits\n\nDiscovery roots: ${leafRoots.map((item) => `\`${item}\``).join(', ')}.\nThe inventory currently finds ${entries.length} leaves.\nSource files without owner bindings can be listed with \`npm --prefix tools run check:leaves -- --unowned\`.\nThat diagnostic includes helpers and contracts; it does not measure missing capabilities.\nThe checker cannot discover an undocumented business capability or establish that\nthese are the right boundaries. New source roots require an explicit inventory update.\n`;
}
