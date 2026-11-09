const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const appRoot = path.resolve(__dirname, '..');
const appRequire = createRequire(path.join(appRoot, 'package.json'));
const entry = appRequire.resolve('@kordex/core');
const installed = path.resolve(path.dirname(entry), '..');
assert.equal(fs.lstatSync(installed).isSymbolicLink(), false, 'Use install-links=true');
const coreRequire = createRequire(entry);
assert.equal(coreRequire.resolve('zod'), appRequire.resolve('zod'));
assert.equal(coreRequire('zod'), appRequire('zod'));
assert.equal(appRequire('zod/package.json').version, '4.3.6');
const built = path.resolve(appRoot, '../packages/kordex-core/dist');
function compare(directory, relative = '') {
  for (const file of fs.readdirSync(directory, { withFileTypes: true })) {
    const name = path.join(relative, file.name);
    if (file.isDirectory()) compare(path.join(directory, file.name), name);
    else assert.deepEqual(fs.readFileSync(path.join(directory, file.name)),
      fs.readFileSync(path.join(installed, 'dist', name)),
      `Stale installed core: ${name}. Rebuild core, then npm ci in codelens-rn.`);
  }
}
compare(built);
const schema = coreRequire('./codecs/profileBranch.js').OntologyNodeSchema;
const profile = appRequire('@kordex/core/profiles/photography').photographyProfile;
assert.equal(appRequire('zod').z.array(schema).parse(profile.ontology.nodes).length, profile.ontology.nodes.length);
console.log('App uses the current packed core and exactly the same Zod 4.3.6 instance. Metro/native execution remains unverified.');
