import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test, type TestContext } from 'node:test';
import { inspectCoreBoundary } from '../core-boundary.ts';

function fixture(t: TestContext) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kordex-core-boundary-'));
  t.after(() => {
    assert.equal(path.dirname(path.resolve(root)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(root).startsWith('kordex-core-boundary-'));
    fs.rmSync(root, { recursive: true, force: true });
  });
  const write = (name: string, source: string) => {
    const file = path.join(root, 'packages/kordex-core', name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, source);
  };
  write('package.json', JSON.stringify({ peerDependencies: { zod: '4.3.6' },
    devDependencies: { zod: '4.3.6', vitest: '4.1.4', typescript: '5.9.2' } }));
  write('src/types.ts', 'export interface Meaning { id: string }');
  write('src/index.ts', "export type { Meaning } from './types';\nimport { z } from 'zod';\nexport const schema = z.string();");
  return { root, write };
}

test('core permits its local types, pinned Zod and test-only dependencies', (t) => {
  const f = fixture(t);
  f.write('src/__tests__/meaning.test.ts', "import { test } from 'vitest'; import fs from 'node:fs';");
  assert.deepEqual(inspectCoreBoundary(f.root), []);
});

test('core rejects app imports including erased type imports and re-exports', (t) => {
  const f = fixture(t);
  for (const source of [
    "import type { Row } from '../../../codelens-rn/src/db/schema';",
    "export type { Row } from '../../../codelens-rn/src/db/schema';",
    "type Row = import('../../../codelens-rn/src/db/schema').Row;",
    "export { write } from '../../../codelens-rn/src/db/client';",
    "import { db } from '@/src/db/client';",
  ]) {
    f.write('src/escape.ts', source);
    assert.ok(inspectCoreBoundary(f.root).some(({ code }) => code === 'CORE_IMPORT_BOUNDARY'), source);
  }
});

test('core rejects hidden, undeclared and test-only production dependencies', (t) => {
  const f = fixture(t);
  for (const source of [
    "import { test } from 'vitest';",
    "import fs from 'node:fs';",
    "const dep = require(name);",
    "const dep = import(name);",
    "import z = require('zod');",
  ]) {
    f.write('src/escape.ts', source);
    assert.ok(inspectCoreBoundary(f.root).some(({ code }) => code === 'CORE_IMPORT_BOUNDARY'), source);
  }
});

test('core tests and configuration cannot reach app or another package', (t) => {
  const f = fixture(t);
  f.write('src/__tests__/escape.test.ts', "import '../../../../../codelens-rn/src/db/client';");
  f.write('vitest.config.mts', "import config from '../../codelens-rn/vitest.config';");
  f.write('tsconfig.json', JSON.stringify({ extends: '../../codelens-rn/tsconfig.json' }));
  assert.equal(inspectCoreBoundary(f.root).length, 3);
});
