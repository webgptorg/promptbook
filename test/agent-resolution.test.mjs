import assert from 'node:assert/strict';
import test from 'node:test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, realpath, mkdir, rm, writeFile, unlink, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveWorkspace, resolveAgentSelection } from '../dist/coder/workspace.js';
import { discoverAgents, resolveAgentReference, prepareAgent } from '../dist/coder/agents.js';
import { agentVisualIdentity } from '../dist/coder/agent-identity.js';

/** Exercise real Git ignore rules and path resolution in a disposable project. */
async function fixture(t) {
    const root = await realpath(await mkdtemp(join(tmpdir(), 'ptbk resolution ')));
    t.after(() => rm(root, { recursive: true, force: true }));
    await promisify(execFile)('git', ['-C', root, 'init', '--quiet']);
    await writeFile(join(root, '.gitignore'), 'node_modules/\nagents/.hidden/\n.ptbk/\n');
    return resolveWorkspace({ path: root });
}

test('normalized references follow ordered tiers through FROM, IMPORT, TEAM and CLI selection', async t => {
    const workspace = await fixture(t); const root = workspace.projectPath;
    const sources = ['agents/.hidden/role.book', 'roles/role.book', 'node_modules/package/role.book'];
    for (const [index, source] of sources.entries()) { await mkdir(join(root, source, '..'), { recursive: true }); await writeFile(join(root, source), `Fronténd Developer\nFROM Void\nRULE Tier ${index + 2}\nCLOSED\n`); }
    await mkdir(join(root, 'tasks')); await writeFile(join(root, 'tasks/not-agent.book'), 'TASK Frontend Developer\nImplement something.\n');
    await writeFile(join(root, 'agents/caller.book'), 'Caller\nFROM {Frontend_Developer}\nIMPORT @FrontendDeveloper\nTEAM Ask {-Fronténd Developer} for help.\nCLOSED\n');
    await writeFile(join(root, 'agents/snippet.book'), '```book\nFrontend Developer\nFROM Void\n```\n');
    assert.equal((await discoverAgents(root)).some(agent => agent.path.endsWith('snippet.book')), false);
    for (const [index, source] of sources.entries()) {
        for (const reference of ['{Frontend Developer}', '{FrontendDeveloper}', '{frontend     Developer}', '{Frontend_Developer}', '{-Fronténd Developer}', '@FrontendDeveloper']) {
            assert.equal(await resolveAgentReference(reference, join(root, 'ptbk.json'), root), join(root, source));
            assert.equal((await resolveAgentSelection(workspace, reference)).path, join(root, source));
            assert.equal(agentVisualIdentity(reference).id, 'frontenddeveloper');
        }
        const prepared = await prepareAgent(join(root, 'agents/caller.book'), root);
        assert.match(prepared.instructions, new RegExp(`Tier ${index + 2}`)); assert.equal(prepared.team[0].path, join(root, source));
        assert.equal((await discoverAgents(root, { name: 'Frontend Developer', includeIgnored: true }))[0].tier, ['agents', 'project', 'ignored'][index]);
        await unlink(join(root, source));
    }
    await assert.rejects(resolveAgentSelection(workspace, '{Frontend Developer}'), /missing/);
});

test('winning-tier collisions and malformed sources fail; private state, task titles and outside symlinks cannot match', async t => {
    const workspace = await fixture(t); const root = workspace.projectPath;
    await mkdir(join(root, 'agents'), { recursive: true });
    for (const source of ['first', 'second']) await writeFile(join(root, 'agents', `${source}.book`), 'Frontend Developer\nFROM Void\n');
    await assert.rejects(resolveAgentSelection(workspace, '@FrontendDeveloper'), /Ambiguous.*first.book.*second.book/);
    await unlink(join(root, 'agents/second.book'));
    await writeFile(join(root, 'agents/first.book'), 'Frontend Developer\nFROM\n');
    await mkdir(join(root, 'roles')); await writeFile(join(root, 'roles/role.book'), 'Frontend Developer\nFROM Void\n');
    await assert.rejects(resolveAgentSelection(workspace, '@FrontendDeveloper'), /FROM requires/);
    for (const special of ['{Expert}', '@Expert', '{Null}', '{User}']) assert.match(await resolveAgentReference(special, join(root, 'ptbk.json'), root), /^ptbk:/);
    await assert.rejects(resolveAgentReference('@Frontend Developer', join(root, 'ptbk.json'), root), /Malformed/);
    await mkdir(join(root, '.ptbk')); await writeFile(join(root, '.ptbk/private.book'), 'Private\nFROM Void\n');
    await assert.rejects(resolveAgentSelection(workspace, 'Private'), /missing/);
    await assert.rejects(resolveAgentSelection(workspace, '.ptbk/private.book'), /private runtime/);
    const outside = await realpath(await mkdtemp(join(tmpdir(), 'ptbk outside '))); t.after(() => rm(outside, { recursive: true, force: true }));
    await writeFile(join(outside, 'escape.book'), 'Escape\nFROM Void\n');
    await symlink(outside, join(root, 'agents/outside'), process.platform === 'win32' ? 'junction' : 'dir');
    await assert.rejects(resolveAgentSelection(workspace, 'Escape'), /missing/);
});

test('read-only lookup without Git still searches explicit dependency references instead of caching a premature miss', async t => {
    const workspace = await fixture(t); const root = workspace.projectPath;
    await rm(join(root, '.git'), { recursive: true, force: true });
    await mkdir(join(root, 'node_modules', 'fixture'), { recursive: true });
    const source = join(root, 'node_modules', 'fixture', 'role.book');
    await writeFile(source, 'Package Role\nFROM Void\nCLOSED\n');
    assert.equal((await resolveAgentSelection(workspace, '{Package Role}')).path, source);
    assert.equal((await discoverAgents(root, { name: 'Package Role', includeIgnored: true }))[0].tier, 'ignored');
});
