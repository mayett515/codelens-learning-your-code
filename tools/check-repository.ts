import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { LeafSchema } from './leaf-schema.ts';
import { inspectLeaves, mapPath, renderMap, walkFiles, type Finding } from './leaf-inventory.ts';
import { checkSkillMirrors } from './sync-skills.ts';
import { repositoryFile } from './source-facts.ts';
import { inspectLeafFreshness } from './leaf-freshness.ts';
import { inlineLinkTargets } from './markdown-links.ts';

export function inspectRepository(root: string, writeMap = false): Finding[] {
  const inventory = inspectLeaves(root);
  const freshness = inspectLeafFreshness(root, inventory.entries);
  const findings = [...inventory.findings, ...freshness, ...checkSkillMirrors(root)];
  const schemaDoc = repositoryFile(root, 'docs/capabilities/SCHEMA.md');
  if (schemaDoc) {
    const example = /```yaml\r?\n([\s\S]*?)```/.exec(fs.readFileSync(schemaDoc, 'utf8'));
    try {
      if (!example) throw new Error('Missing schema example.');
      LeafSchema.parse(parse(example[1]));
    } catch (error) {
      findings.push({ code: 'SCHEMA_EXAMPLE_DRIFT', file: 'docs/capabilities/SCHEMA.md', message: String(error) });
    }
  }
  const generated = renderMap(inventory.entries);
  const destination = path.join(root, mapPath);
  if (writeMap && inventory.findings.length === 0 && !freshness.some((item) => item.severity !== 'warning')) {
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, generated);
  } else if (!fs.existsSync(destination) || fs.readFileSync(destination, 'utf8').replaceAll('\r\n', '\n') !== generated) {
    findings.push({ code: 'MAP_STALE', file: mapPath, message: 'Regenerate after correcting invalid leaves.' });
  }
  const docs = ['AGENTS.md', 'CLAUDE.md', 'codelens-rn/AGENTS.md', 'codelens-rn/CLAUDE.md',
    ...walkFiles(root, 'docs'), ...walkFiles(root, 'agent-kit'), ...walkFiles(root, '.claude/rules'),
    ...walkFiles(root, 'tools').filter((file) => file.endsWith('.md'))];
  for (const file of docs.filter((name) => name.endsWith('.md'))) {
    if (!repositoryFile(root, file)) { findings.push({ code: 'DOC_MISSING', file, message: 'Expected document is missing.' }); continue; }
    const body = fs.readFileSync(path.join(root, file), 'utf8');
    for (const link of inlineLinkTargets(body)) {
      const target = link.split('#')[0];
      if (!target || /^[a-z][a-z\d+.-]*:/i.test(target)) continue;
      try {
        const local = path.relative(root, path.resolve(root, path.dirname(file), decodeURIComponent(target)));
        if (!fs.existsSync(path.join(root, local))) findings.push({ code: 'DOC_LINK_MISSING', file, message: target });
      } catch {
        findings.push({ code: 'DOC_LINK_INVALID', file, message: target });
      }
    }
  }
  for (const [claude, agent] of [['CLAUDE.md', 'AGENTS.md'], ['codelens-rn/CLAUDE.md', 'codelens-rn/AGENTS.md'], ['tools/CLAUDE.md', 'tools/AGENTS.md']]) {
    if (!repositoryFile(root, agent) || !repositoryFile(root, claude) ||
      !fs.readFileSync(path.join(root, claude), 'utf8').replaceAll('\r\n', '\n').startsWith('@AGENTS.md\n')) {
      findings.push({ code: 'HOST_ENTRYPOINT_DRIFT', file: claude, message: `Must import shared ${agent}.` });
    }
  }
  return findings;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const findings = inspectRepository(root, process.argv.includes('--write'));
  for (const finding of findings) console.error(`${finding.severity === 'warning' ? 'WARNING ' : ''}${finding.code} ${finding.file}: ${finding.message}`);
  const errors = findings.filter((item) => item.severity !== 'warning');
  if (process.argv.includes('--unowned')) {
    const unowned = inspectLeaves(root).sourceFilesWithoutOwner;
    console.log(`Source files without an owner binding (${unowned.length}; diagnostic, not capability coverage):\n${unowned.join('\n')}`);
  }
  if (!errors.length) console.log('Repository metadata, runtime owner exports, Git inspection dates, declared decision imports, shared skill mirrors and inline documentation links checked. See any warnings for unverified working copies. Application behavior and host hook execution are not certified.');
  process.exitCode = errors.length ? 1 : 0;
}
