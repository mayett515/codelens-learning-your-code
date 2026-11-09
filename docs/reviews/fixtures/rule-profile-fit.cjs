// Interview probe only: exercises the existing built core without changing its
// types, writing storage or representing this fixture as an approved rule model.
// From repository root: npm --prefix packages/kordex-core run build
//                      node docs/reviews/fixtures/rule-profile-fit.cjs
const assert = require('node:assert/strict');
const core = require('../../../packages/kordex-core/dist/index.js');
const { photographyProfile } = require('../../../packages/kordex-core/dist/profiles/photographyProfile.js');
const { OntologyNodeSchema } = require('../../../packages/kordex-core/dist/codecs/profileBranch.js');
const findings = [];
function check(name, work) { work(); findings.push(name); }
function node(id, meaning) {
  return { id, label: id, kind: 'category', parentId: null, meaning,
    useWhen: ['Within the selected engineering scope'], doNotUseWhen: [],
    examples: [], relatedNodeIds: [], contrastNodeIds: [], status: 'active',
    createdBy: 'user', createdAt: 1, updatedAt: 1 };
}
// Reuse presentation fields only as test scaffolding: current DomainProfile
// requires them. This is not a shipped engineering profile or domain inheritance.
const generic = node('optional-vs-nullable', 'Absence and explicit null have different contracts.');
const base = { ...structuredClone(photographyProfile), id: 'engineering-rules',
  label: 'Engineering rules — compatibility probe', description: 'Interview fixture',
  ontology: { nodes: [generic], itemTypeNodeIds: [], relationshipTypeNodeIds: [] } };
const branch = { id: 'repo:kordex', parentProfileId: base.id, branchKind: 'project',
  name: 'Kordex repository', overlay: { id: 'kordex-overlay', kind: 'project' },
  createdAt: 1, updatedAt: 10 };
const rule = node('apply-revalidates-revision', 'Apply compares the proposal snapshot with the current target.');
function proposal(id, patch, revision) {
  return core.validateProfileChangeProposal({ id, proposalKind: 'ontology_node_patch',
    sourceKind: 'user', baseProfileId: base.id, sourceBranchId: null,
    target: { kind: 'profile_branch', branchId: branch.id },
    targetBranchUpdatedAt: revision, evidenceIds: ['experience:stale-apply'], patch,
    title: id, summary: 'Interview fixture', reason: 'Inspected stale-apply experience',
    riskScore: 20, status: 'pending', createdAt: 1, updatedAt: 2 });
}
const original = JSON.stringify({ base, branch });
const first = proposal('p1', { addOntologyNodes: [rule] }, 10);
const result = core.applyBranchLocalProfileChangeProposal({ proposal: first, baseProfile: base, branch, now: 11 });
function view(current) {
  return core.composeRuntimeDomainProfileFromBranches({ baseProfile: base, branches: [current] });
}
check('Existing proposal/add/compose mechanics carry a branch-local compatibility node', () => {
  assert.equal(result.proposal.status, 'accepted');
  assert.equal(view(result.branch).ontology.nodes.find(n => n.id === rule.id).meaning, rule.meaning);
  assert.equal(JSON.stringify({ base, branch }), original);
  assert.equal(base.ontology.nodes.some(n => n.id === rule.id), false);
});
check('A sibling SEO branch does not acquire the Kordex rule', () => {
  const sibling = { ...branch, id: 'repo:seo', overlay: { id: 'seo-overlay', kind: 'project' } };
  assert.equal(view(sibling).ontology.nodes.some(n => n.id === rule.id), false);
});
check('A deliberate base-node override changes only the selected branch view', () => {
  const local = { ...generic, meaning: 'Preserve omitted versus explicit null at Kordex boundaries.' };
  const changed = core.applyBranchLocalProfileChangeProposal({
    proposal: proposal('p2', { overrideOntologyNodes: [local] }, 11),
    baseProfile: base, branch: result.branch, now: 12,
  });
  assert.equal(view(changed.branch).ontology.nodes.find(n => n.id === generic.id).meaning, local.meaning);
  assert.equal(base.ontology.nodes[0].meaning, generic.meaning);
});
check('The existing freshness decision rejects snapshot 10 against current branch 11', () => {
  const competing = proposal('competing-at-10', { addOntologyNodes: [
    node('reject-missing-snapshot', 'An unknown revision cannot authorize apply.'),
  ] }, 10);
  // Establish that this distinct patch is still applicable; isolate the stale
  // revision refusal from a duplicate-node conflict in the original add patch.
  core.compileBranchLocalProposalApplyOperation({
    proposal: competing, baseProfile: base, branch: result.branch, now: 12,
  });
  const stale = core.evaluateProfileProposalFreshness({ proposal: competing,
    target: { kind: 'profile_branch', branchId: branch.id, exists: true,
      currentUpdatedAt: 11, patchValidation: 'valid' } });
  assert.equal(stale.canApply, false);
  assert.equal(stale.reason, 'target_branch_updated_at_changed');
});
check('rule kind and proposed node metadata are not supported by the current strict schema', () => {
  assert.equal(OntologyNodeSchema.safeParse({ ...rule, kind: 'rule' }).success, false);
  for (const field of ['origin', 'supersedes', 'reconsiderOn']) {
    assert.equal(OntologyNodeSchema.safeParse({ ...rule, [field]: 'probe' }).success, false);
  }
});
check('Evidence strings are accepted syntactically without resolving their source', () => {
  assert.equal(core.validateProfileChangeProposal({ ...first, evidenceIds: ['missing-source'] }).evidenceIds[0], 'missing-source');
});
check('Later accepted changes do not automatically supersede earlier accepted proposals', () => {
  const revised = { ...rule, meaning: 'Apply rejects a missing or different recorded revision.', updatedAt: 12 };
  const second = core.applyBranchLocalProfileChangeProposal({
    proposal: proposal('p3', { overrideOntologyNodes: [revised] }, 11),
    baseProfile: base, branch: result.branch, now: 12,
  });
  assert.equal(view(second.branch).ontology.nodes.find(n => n.id === rule.id).meaning, revised.meaning);
  assert.equal(result.proposal.status, 'accepted');
  assert.equal(second.proposal.status, 'accepted');
  assert.equal(result.proposal.supersededByProposalId ?? null, null);
});
console.log(JSON.stringify({ checks: findings, count: findings.length,
  limit: 'Pure in-memory compatibility probe. No rule-kind implementation, source resolution, audit, persistence, restart or rollback proof.' }, null, 2));
