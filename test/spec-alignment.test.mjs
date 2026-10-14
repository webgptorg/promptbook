import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { mkdtemp, mkdir, readFile, realpath, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';
import QRCode from 'qrcode';
import { initializeProject } from '../dist/coder/authoring.js';
import { ensureFirstTask } from '../dist/coder/first-task.js';
import { discoverAgents } from '../dist/coder/agents.js';
import { agentVisualIdentity, identifyRuntime, agentActivity } from '../dist/coder/agent-identity.js';
import { attentionRequests, dashboardUrl, runtimeSummary, terminalQrRows } from '../dist/coder/status-view.js';
import { discoverTasks } from '../dist/coder/sources.js';
import { resolveWorkspace } from '../dist/coder/workspace.js';
import { git } from '../dist/coder/git.js';
import { runQueue } from '../dist/coder/engine.js';
import { inspectProjectCheck } from '../dist/coder/check-setup.js';
import { inspectProjectReadiness } from '../dist/coder/initialization.js';
import { createTerminal } from '../dist/coder/terminal.js';

/** Prepare an external sample with fixture-only Git authorship and no provider calls. */
async function fixture(t) {
    const root = await realpath(await mkdtemp(join(tmpdir(), 'ptbk spec ')));
    t.after(() => rm(root, { recursive: true, force: true }));
    await git(root, ['init', '-q']);
    await git(root, ['config', 'user.name', 'Specification Fixture']);
    await git(root, ['config', 'user.email', 'fixture@example.test']);
    await git(root, ['config', 'commit.gpgsign', 'false']);
    const workspace = await resolveWorkspace({ path: root }, true);
    await initializeProject(workspace, { sample: true });
    return workspace;
}

test('sample validation and the first task use checked execution and survive completion and archiving', async t => {
    const workspace = await fixture(t);
    assert.equal((await inspectProjectCheck(workspace)).diagnostic, undefined);
    const first = await ensureFirstTask(workspace, { harness: 'openai-codex' });
    const source = (await discoverTasks(workspace)).find(task => task.id === first.taskId);
    assert.equal(source.status, 'todo');
    assert.equal(source.agent, 'Developer');
    assert.equal(source.harness, 'openai-codex');
    assert.match(source.payload, /readiness.md/);
    const developer = join(workspace.projectPath, 'agents', 'developer.book');
    await writeFile(developer, 'Developer\nFROM Void\nGOAL Inspect project readiness.\nCLOSED\n');
    await git(workspace.projectPath, ['add', '.']);
    await git(workspace.projectPath, ['commit', '-qm', 'Initialized sample']);
    let calls = 0;
    const result = await runQueue(workspace, { onlyTaskId: first.taskId, check: 'npm run check', requireAcceptance: true, runHarness: async request => {
        calls++;
        await writeFile(join(request.projectPath, 'readiness.md'), '# Readiness\nProject instructions, core Books and validation are available.\n');
        return { outcome: 'success', exitCode: 0, output: 'Readiness recorded.', acceptance: { satisfied: true, evidence: 'Project-local readiness summary and sample validation.' } };
    } });
    assert.equal(result.completed, 1, JSON.stringify(result));
    assert.equal(calls, 1);
    assert.equal(result.commits.length, 1);
    assert.match(await git(workspace.projectPath, ['show', 'HEAD:' + source.source.relativePath]), /TASK DONE/);
    assert.match(await git(workspace.projectPath, ['show', 'HEAD:readiness.md']), /Readiness/);
    assert.deepEqual((await ensureFirstTask(workspace)).paths, []);
    await mkdir(join(workspace.tasksPath, 'archive'));
    await rename(source.source.path, join(workspace.tasksPath, 'archive', 'starter.book'));
    await rm(workspace.statePath, { recursive: true, force: true });
    assert.deepEqual(await initializeProject(workspace), []);
    assert.deepEqual((await ensureFirstTask(workspace)).paths, []);
    assert.equal((await discoverTasks(workspace)).length, 0);
    await writeFile(join(workspace.projectPath, 'AGENTS.md'), '');
    const failed = await import('../dist/coder/checks.js').then(({ runCheck }) => runCheck(workspace, 'npm run check'));
    assert.equal(failed.outcome, 'failed', 'The sample validates actual artifacts rather than unconditionally passing');
});

test('an Expert intent task fulfills the first-task contract and partial setup resumes without duplicates', async t => {
    const workspace = await fixture(t);
    const first = await ensureFirstTask(workspace, { intent: 'Create a project for the supplied agenda.', harness: 'openai-codex' });
    const [task] = await discoverTasks(workspace);
    assert.equal(task.agent, 'Expert');
    assert.equal(task.origin, 'engine:agenda-bootstrap');
    assert.equal(first.taskId, task.id);
    await rm(join(workspace.tasksPath, 'templates', 'initialization.json'));
    const resumed = await ensureFirstTask(workspace);
    assert.equal(resumed.taskId, first.taskId);
    assert.equal((await discoverTasks(workspace)).length, 1);
    assert.equal((await discoverAgents(workspace.projectPath)).some(agent => agent.name === 'Expert'), false);
});

test('saved setup exposes missing declared project dependencies before work can start', async t => {
    const workspace = await fixture(t);
    const manifest = join(workspace.projectPath, 'package.json');
    const metadata = JSON.parse(await readFile(manifest, 'utf8'));
    metadata.devDependencies = { 'fixture-validator': '1.0.0' };
    await writeFile(manifest, JSON.stringify(metadata));
    assert.match((await inspectProjectReadiness(workspace)).execution.join('\n'), /missing declared project dependencies.*fixture-validator/);
    await mkdir(join(workspace.projectPath, 'node_modules', 'fixture-validator'), { recursive: true });
    await writeFile(join(workspace.projectPath, 'node_modules', 'fixture-validator', 'package.json'), '{"name":"fixture-validator","version":"1.0.0"}');
    assert.doesNotMatch((await inspectProjectReadiness(workspace)).execution.join('\n'), /missing declared project dependencies/);
});

test('agent faces survive normalization, Book movement and instruction edits across snapshots', async t => {
    const workspace = await fixture(t);
    const agents = await discoverAgents(workspace.projectPath);
    const developer = agents.find(agent => agent.name === 'Developer');
    const before = identifyRuntime({ project: workspace.projectPath, currentTask: 'work', running: true, status: 'running', currentSelection: { agent: developer.path } }, agents);
    await mkdir(join(workspace.projectPath, 'agents', 'moved'));
    const moved = join(workspace.projectPath, 'agents', 'moved', 'custom.book');
    await rename(developer.path, moved);
    await writeFile(moved, 'Developer\nFROM Void\nRULE Edited rules and whitespace.\n');
    const after = identifyRuntime({ project: workspace.projectPath, currentTask: 'work', running: true, status: 'running', currentSelection: { agent: moved } }, await discoverAgents(workspace.projectPath));
    assert.deepEqual(after.currentSelection.visualIdentity, before.currentSelection.visualIdentity);
    assert.equal(after.activity, 'Working');
    assert.deepEqual(agentVisualIdentity('Déveloper'), agentVisualIdentity('Déveloper'));
    assert.equal(agentVisualIdentity('@dé-veloper').id, agentVisualIdentity('Developer').id);
    for (const other of ['Manager', 'Teacher', 'Expert', 'Adam']) assert.notDeepEqual(agentVisualIdentity(other).pattern, agentVisualIdentity('Developer').pattern);
    assert.equal(agentActivity({ ...after, requests: [{ taskId: 'work' }] }), 'Waiting for User');
    assert.equal(agentActivity({ ...after, waiting: true }), 'Waiting for provider / pacing');
    assert.equal(agentActivity({ ...after, status: 'completed' }), 'Idle');
    assert.equal(agentActivity({ ...after, currentSelection: { visualIdentity: agentVisualIdentity('Null') } }), 'Idle');
});

test('shared snapshots put blocking requests ahead of status and preserve plain names and actual URLs', () => {
    const state = identifyRuntime({ project: '/project', engineVersion: 'fixture', status: 'running', running: true, currentTask: 'work', currentSelection: { agent: 'Manager', harness: 'fixture' }, url: 'http://127.0.0.1:4123/#private',
        tasks: [{ id: 'work', title: 'Assign existing work', agent: 'Manager', status: 'in-progress' }], requests: [{ id: 'other', prompt: 'Other request', reason: 'Later' }, { id: 'current', taskId: 'work', prompt: 'Blocking decision', reason: 'Missing intent' }] });
    assert.deepEqual(attentionRequests(state).map(request => request.id), ['current', 'other']);
    const pretty = runtimeSummary(state, { pretty: true, color: false, width: 100 }, 'Project status');
    assert(pretty.indexOf('Blocking decision') < pretty.indexOf('Promptbook fixture'));
    assert.match(pretty, /Waiting for User/);
    assert.match(pretty, /4123/);
    assert.match(pretty, /ptbk answer/);
    const raw = runtimeSummary(state, { pretty: false, color: false, width: 100 }, 'Project status');
    assert.match(raw, /Agent: Manager/);
    assert(!raw.includes(agentVisualIdentity('Manager').symbol));
    assert.equal(dashboardUrl({ ...state, status: 'stopped' }), undefined);
    assert.equal(dashboardUrl({ ...state, connection: 'disconnected' }), undefined);
});

test('live terminals retain complete QR modules on roomy screens and attention on narrow screens', () => {
    const input = new EventEmitter();
    Object.assign(input, { isTTY: true, isRaw: false, setRawMode(value) { this.isRaw = value; }, resume() {}, pause() {} });
    let text = '';
    const output = new EventEmitter();
    Object.assign(output, { isTTY: true, columns: 120, rows: 70, write(chunk) { text += chunk; } });
    const terminal = createTerminal(true, () => assert.fail('Presentation must not execute or cancel work'), '/project', { input, output });
    const url = 'http://127.0.0.1:4321/#private';
    try {
        terminal.setSnapshot({ project: '/project', status: 'ready', url, tasks: [], requests: [] });
        const rows = terminalQrRows(url);
        assert.equal(rows[0].length, QRCode.create(url).modules.size + 8);
        for (const row of rows) assert(text.includes(row), 'Every QR row and its quiet zone is retained');
        text = ''; output.columns = 24; output.rows = 7;
        terminal.setSnapshot({ project: '/project', status: 'running', url, requests: [{ id: 'request', prompt: 'Review this work', reason: 'User intent' }] });
        assert.match(text, /USER ATTENTION/);
        assert.match(text, /Respond: Q/);
        assert(!text.includes('█'), 'An unfittable QR is never clipped');
        assert(text.split('\r\n').length <= output.rows);
    } finally { terminal.close(); }
});
