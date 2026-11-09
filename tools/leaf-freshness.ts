import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import type { Finding, LeafEntry } from './leaf-inventory.ts';
import { repositoryFile } from './source-facts.ts';

// A dated source inspection, not a content attestation or behavioral proof.
export function inspectLeafFreshness(root: string, entries: LeafEntry[], now = new Date()): Finding[] {
  const findings: Finding[] = [];
  const today = now.toISOString().slice(0, 10);
  for (const { file, leaf } of entries) {
    if (leaf.inspectedOn > today) findings.push({ code: 'INSPECTION_IN_FUTURE', file, message: leaf.inspectedOn });
  }
  if (!entries.some(({ leaf }) => leaf.owners.length)) return findings;
  const git = (...args: string[]) => execFileSync('git', [
    '--no-optional-locks', '-c', `safe.directory=${root.replaceAll('\\', '/')}`,
    '--literal-pathspecs', '-C', root, ...args,
  ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 10_000 }).trim();
  try {
    if (fs.realpathSync.native(git('rev-parse', '--show-toplevel')) !== fs.realpathSync.native(root)) {
      throw new Error('Expected the repository root, not a parent repository.');
    }
    if (git('rev-parse', '--is-shallow-repository') !== 'false') {
      throw new Error('Full Git history is required. Fetch full history before checking leaf freshness.');
    }
    const owners = new Map<string, { day: string; dirty: boolean }>();
    for (const { file, leaf } of entries) {
      for (const owner of leaf.owners) {
        if (!repositoryFile(root, owner.path)) continue; // Structural checker owns missing/case-invalid files.
        let record = owners.get(owner.path);
        if (!record) {
          // Default path simplification follows a parent with identical content;
          // a merge that changes this path relative to every parent remains visible.
          const timestamp = git('log', '-1', '--format=%cI', '--', owner.path);
          record = {
            day: timestamp ? new Date(timestamp).toISOString().slice(0, 10) : '',
            dirty: git('status', '--porcelain', '--untracked-files=all', '--', owner.path).length > 0,
          };
          owners.set(owner.path, record);
        }
        if (record.day > leaf.inspectedOn) {
          findings.push({ code: 'LEAF_INSPECTION_STALE', file,
            message: `${owner.path} changed on ${record.day}, after inspection ${leaf.inspectedOn}. Reinspect before updating the date.` });
        }
        if (!record.day || record.dirty) {
          findings.push({ code: 'OWNER_WORKTREE_UNVERIFIED', file, severity: 'warning',
            message: `${owner.path}: new/staged/unstaged content is not certified by Git dates. Inspect this working copy explicitly.` });
        }
      }
    }
  } catch (error) {
    findings.push({ code: 'GIT_FRESHNESS_UNAVAILABLE', file: 'docs/capabilities', message: String(error) });
  }
  return findings;
}
