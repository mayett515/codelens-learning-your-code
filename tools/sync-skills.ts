import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseDocument } from 'yaml';
import { z } from 'zod';
import { walkFiles, type Finding } from './leaf-inventory.ts';

export function checkSkillMirrors(root: string, write = false): Finding[] {
  const findings: Finding[] = [];
  const sourceRoot = 'agent-kit/skills';
  const sources = walkFiles(root, sourceRoot);
  if (!sources.length) return [{ code: 'SKILLS_EMPTY', file: sourceRoot, message: 'No canonical skills found.' }];
  for (const source of sources) {
    const relative = source.slice(sourceRoot.length + 1);
    const sourceContent = fs.readFileSync(path.join(root, source));
    if (source.endsWith('/SKILL.md')) {
      const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(sourceContent.toString('utf8'));
      try {
        if (!match) throw new Error('Missing skill front matter.');
        const document = parseDocument(match[1], { uniqueKeys: true });
        if (document.errors.length) throw new Error(document.errors.map((item) => item.message).join('; '));
        const metadata = z.strictObject({ name: z.string().regex(/^[a-z0-9-]{1,63}$/), description: z.string().trim().min(1) }).parse(document.toJS({ maxAliasCount: 0 }));
        if (metadata.name !== relative.split('/')[0]) throw new Error('Skill name must match its directory.');
      } catch (error) {
        findings.push({ code: 'SKILL_SHAPE_INVALID', file: source, message: String(error) });
        continue;
      }
    }
    for (const host of ['.agents/skills', '.claude/skills']) {
      const target = `${host}/${relative}`;
      if (write) {
        fs.mkdirSync(path.dirname(path.join(root, target)), { recursive: true });
        fs.writeFileSync(path.join(root, target), sourceContent);
      } else if (!fs.existsSync(path.join(root, target)) ||
        !sourceContent.equals(fs.readFileSync(path.join(root, target)))) {
        findings.push({ code: 'SKILL_MIRROR_DRIFT', file: target, message: `Sync from ${source}; never edit the host copy.` });
      }
    }
  }
  // Only managed skill directories are checked. Unrelated user-installed skills stay untouched.
  const names = new Set(sources.map((file) => file.slice(sourceRoot.length + 1).split('/')[0]));
  for (const host of ['.agents/skills', '.claude/skills']) {
    for (const name of names) {
      for (const target of walkFiles(root, `${host}/${name}`)) {
        const relative = target.slice(host.length + 1);
        if (!sources.includes(`${sourceRoot}/${relative}`)) findings.push({ code: 'SKILL_MIRROR_EXTRA', file: target, message: 'Extra file in a managed mirror; review before removing.' });
      }
    }
  }
  return findings;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const findings = checkSkillMirrors(root, process.argv.includes('--write'));
  for (const finding of findings) console.error(`${finding.code} ${finding.file}: ${finding.message}`);
  process.exitCode = findings.length ? 1 : 0;
}
