import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Run through npm so the same npm executable is used on Windows and Linux.
const npmCli = process.env.npm_execpath;
assert.ok(npmCli, 'Run npm run verify:isolation');
const source = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'kordex-core-isolation-'));
const isolated = path.join(scratch, 'core');
fs.cpSync(source, isolated, {
  recursive: true,
  filter: (file) => !['node_modules', 'dist', '.git'].includes(path.basename(file)) && !file.endsWith('.tgz'),
});
const environment = { ...process.env };
delete environment.NODE_PATH;
function run(cwd, args, capture = false) {
  const result = spawnSync(process.execPath, [npmCli, ...args], {
    cwd, env: environment, encoding: 'utf8', stdio: capture ? 'pipe' : 'inherit',
  });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, `${args.join(' ')} failed\n${result.stderr ?? ''}`);
  return result.stdout;
}
console.log(`Isolated source, installed dependencies and test report: ${isolated}`);
run(isolated, ['ci', '--no-audit', '--no-fund']);
run(isolated, ['run', 'build']);
run(isolated, ['run', 'typecheck']);
run(isolated, ['test', '--', '--reporter=json', '--outputFile=isolation-tests.json']);
const report = JSON.parse(fs.readFileSync(path.join(isolated, 'isolation-tests.json'), 'utf8'));
assert.equal(report.numFailedTests, 0);
assert.ok(report.numPassedTests > 0);
const packed = JSON.parse(run(isolated, ['pack', '--json', '--pack-destination', scratch], true))[0];
assert.ok(packed.files.every(({ path: file }) => !file.includes('node_modules/')));
const consumer = path.join(scratch, 'consumer');
fs.mkdirSync(consumer);
fs.writeFileSync(path.join(consumer, 'package.json'), '{"name":"isolated-core-consumer","private":true}');
run(consumer, ['install', '--no-audit', '--no-fund', path.join(scratch, packed.filename)]);
// Copy only this portable smoke test into the consumer, not the source or tests.
fs.copyFileSync(path.join(isolated, 'scripts', 'package-smoke.cjs'), path.join(consumer, 'package-smoke.cjs'));
const smoke = spawnSync(process.execPath, ['package-smoke.cjs'], { cwd: consumer, env: environment, stdio: 'inherit' });
if (smoke.error) throw smoke.error;
assert.equal(smoke.status, 0, 'Packed consumer smoke failed');
console.log(`Isolation passed: ${report.numPassedTests} tests; packed consumer has only core and its runtime dependency. Evidence retained at ${scratch}`);
