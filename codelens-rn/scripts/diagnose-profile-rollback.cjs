// Diagnostic, not an application adapter. Uses installed op-sqlite Drizzle
// transaction code and actual repositories over file-backed Node SQLite.
// Expected exit 1 while the observed rollback defect remains unfixed.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
const Module = require('node:module');
const { DatabaseSync } = require('node:sqlite');
const ts = require('typescript');
const { drizzle } = require('drizzle-orm/op-sqlite');

const appRoot = path.resolve(__dirname, '..');
require.extensions['.ts'] = (module, filename) => {
  const result = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    fileName: filename,
  });
  module._compile(result.outputText, filename);
};

const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'kordex-rollback-'));
const filename = path.join(folder, 'proof.sqlite');
let sqlite = new DatabaseSync(filename);
const statements = [];
const client = {
  async executeAsync(query, params = []) {
    statements.push(query);
    return sqlite.prepare(query).run(...params);
  },
  async executeRawAsync(query, params = []) {
    statements.push(query);
    const statement = sqlite.prepare(query);
    statement.setReturnArrays(true);
    return statement.all(...params);
  },
  execute(query, params = []) {
    statements.push(query);
    return { rows: { _array: sqlite.prepare(query).all(...params) } };
  },
};
const db = drizzle(client);
// Replace only the native client module. Transactions, SQL generation,
// repositories, codecs, version validation and apply service remain real.
const clientPath = path.join(appRoot, 'src/db/client.ts');
const clientModule = new Module(clientPath);
clientModule.exports = { db };
clientModule.loaded = true;
require.cache[clientPath] = clientModule;
const load = (relative) => require(path.join(appRoot, relative));

async function main() {
  for (const [file, symbol] of [
    ['014-profile-definitions', 'migration014'],
    ['016-profile-change-proposals', 'migration016'],
    ['019-profile-proposal-events', 'migration019'],
    ['022-profile-change-proposal-target-version', 'migration022'],
    ['023-profile-proposal-event-superseded-action', 'migration023'],
    ['024-profile-change-proposal-target-branch-updated-at', 'migration024'],
  ]) {
    for (const sql of load(`src/db/migrations/${file}.ts`)[symbol].up) sqlite.exec(sql);
  }
  const { codingProfile } = load('src/features/ontology/profiles/codingProfile.ts');
  const { insertProfileDefinition } = load('src/features/ontology/data/profileDefinitionRepo.ts');
  const { insertProfileChangeProposal } = load('src/features/ontology/data/profileChangeProposalRepo.ts');
  const { applyPendingBaseProfileChangeProposal } = load('src/features/ontology/data/baseProfileProposalApplyService.ts');
  const node = { ...codingProfile.ontology.nodes[0], id: 'rollback-proof', label: 'Rollback proof' };
  async function seed() {
    sqlite.exec('DELETE FROM profile_proposal_events; DELETE FROM profile_change_proposals; DELETE FROM profile_definitions;');
    await insertProfileDefinition({
      id: codingProfile.id, label: codingProfile.label, description: codingProfile.description,
      version: codingProfile.version, sourceKind: 'built_in', profile: codingProfile, createdAt: 1, updatedAt: 2,
    });
    await insertProfileChangeProposal({
      id: 'rollback-proposal', proposalKind: 'ontology_node_patch', sourceKind: 'user',
      baseProfileId: codingProfile.id, target: { kind: 'base_profile', profileId: codingProfile.id },
      targetProfileVersion: codingProfile.version, evidenceIds: [], patch: { addOntologyNodes: [node] },
      title: 'Rollback proof', summary: 'Diagnostic', reason: 'Diagnostic', riskScore: 0,
      status: 'pending', createdAt: 1, updatedAt: 2,
    });
  }
  function state() {
    return {
      version: sqlite.prepare('SELECT version FROM profile_definitions').get().version,
      status: sqlite.prepare('SELECT status FROM profile_change_proposals').get().status,
      events: sqlite.prepare('SELECT count(*) AS n FROM profile_proposal_events').get().n,
    };
  }
  await seed();
  await applyPendingBaseProfileChangeProposal({ proposalId: 'rollback-proposal', now: 10 });
  assert.deepEqual(state(), { version: codingProfile.version + 1, status: 'accepted', events: 1 });
  console.log('Successful apply control passed.');

  await seed();
  statements.length = 0;
  await assert.rejects(applyPendingBaseProfileChangeProposal({
    proposalId: 'rollback-proposal', now: 10,
    deps: { insertEvent: async () => { throw new Error('injected audit failure'); } },
  }), /injected audit failure/);
  sqlite.close();
  sqlite = new DatabaseSync(filename);
  const actual = state();
  console.log(JSON.stringify({ afterFailureAndReopen: actual, sqlOrder: statements.map(sql => sql.split(' ')[0]) }));
  assert.deepEqual(actual, { version: codingProfile.version, status: 'pending', events: 0 },
    'A failed audit insert must roll back the base and proposal updates.');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => {
  sqlite.close();
  fs.unlinkSync(filename);
  fs.rmdirSync(folder);
});
