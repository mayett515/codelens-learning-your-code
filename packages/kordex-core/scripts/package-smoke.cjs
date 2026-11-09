const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const core = require('@kordex/core');
assert.equal('codingProfile' in core, false);
assert.equal('photographyProfile' in core, false);
assert.equal('getActiveDomainProfile' in core, false);
assert.equal(Object.keys(require.cache).some(file => /[/\\]profiles[/\\]/.test(file)), false);
const headless = { id: 'headless', version: 1, label: 'Rules', description: '',
  ontology: { nodes: [], itemTypeNodeIds: [], relationshipTypeNodeIds: [] } };
const headlessDefinition = core.validateProfileDefinition({ id: headless.id,
  version: 1, label: headless.label, description: '', profile: headless,
  sourceKind: 'user', createdAt: 0, updatedAt: 0 });
assert.deepEqual(core.composeDomainProfile(headlessDefinition.profile, []), headless);
const fromCore = createRequire(require.resolve('@kordex/core'));
assert.equal(fromCore.resolve('zod'), require.resolve('zod'));
assert.equal(fromCore('zod'), require('zod'));
const { codingProfile } = require('@kordex/core/profiles/coding');
const { photographyProfile } = require('@kordex/core/profiles/photography');
const { validateProfileDefinition } = require('@kordex/core/codecs/profileDefinition');
for (const profile of [codingProfile, photographyProfile]) {
  const definition = validateProfileDefinition({
    id: profile.id, version: profile.version, profile,
    label: profile.label, description: profile.description,
    sourceKind: 'built_in', createdAt: 0, updatedAt: 0,
  });
  assert.equal(definition.profile.id, profile.id);
}
const { OntologyNodeSchema } = require('@kordex/core/codecs/profileBranch');
// Compose a schema across the package boundary; domain validation uses parse,
// never instanceof or constructor identity as its acceptance protocol.
assert.equal(require('zod').z.array(OntologyNodeSchema).parse(photographyProfile.ontology.nodes).length,
  photographyProfile.ontology.nodes.length);
console.log('Packed entrypoints, opt-in profiles, validation and single Zod resolution passed.');
